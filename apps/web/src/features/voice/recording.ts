/** Microphone capture is input only; sample playback must use the audio studio channel. */
export interface PhraseRecorder {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function startPhraseRecording(): Promise<PhraseRecorder> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error(
      "Recording needs a supported browser on HTTPS or localhost.",
    );
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  let recorder: MediaRecorder;
  try {
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    stopTracks();
    throw error;
  }

  const chunks: Blob[] = [];
  let size = 0;
  let cancelled = false;
  let failed: Error | undefined;
  let resolveBlob: (blob: Blob) => void;
  let rejectBlob: (error: Error) => void;
  const result = new Promise<Blob>((resolve, reject) => {
    resolveBlob = resolve;
    rejectBlob = reject;
  });
  // Cancellation can happen before a consumer calls stop; suppress an unhandled rejection only.
  void result.catch(() => {});
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0 && !cancelled) {
      size += event.data.size;
      if (size > 20 * 1024 * 1024) {
        failed = new Error(
          "Recording is too large. Please record one short phrase.",
        );
        if (recorder.state !== "inactive") recorder.stop();
      } else chunks.push(event.data);
    }
  };
  recorder.onerror = () => {
    failed = new Error("The microphone recording failed. Please try again.");
    stopTracks();
    rejectBlob(failed);
  };
  recorder.onstop = () => {
    stopTracks();
    if (cancelled)
      rejectBlob(new DOMException("Recording cancelled.", "AbortError"));
    else if (failed) rejectBlob(failed);
    else if (chunks.length === 0)
      rejectBlob(new Error("No recording was captured. Please try again."));
    else
      resolveBlob(
        new Blob(chunks, { type: recorder.mimeType || chunks[0]!.type }),
      );
    chunks.length = 0;
  };
  try {
    recorder.start(250);
  } catch (error) {
    stopTracks();
    throw error;
  }
  return {
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      return result;
    },
    cancel: () => {
      cancelled = true;
      chunks.length = 0;
      if (recorder.state !== "inactive") recorder.stop();
      stopTracks();
    },
  };
}
