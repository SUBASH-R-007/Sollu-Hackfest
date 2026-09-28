export interface EvidenceCapture {
  stream: MediaStream;
  stop(): Promise<{ blob: Blob; durationSeconds: number }>;
  cancel(): void;
}

/** Local capture only. No network transcription or media upload. */
export async function captureEvidence(
  kind: "audio" | "video",
  signal: AbortSignal,
  onLimit: () => void,
): Promise<EvidenceCapture> {
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  )
    throw new Error(
      "Recording needs a supported browser on HTTPS or localhost. You can still practice without recording.",
    );
  const pendingStream = navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video:
      kind === "video"
        ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        : false,
  });
  // Browsers cannot dismiss an in-flight permission prompt. Reject immediately on Cancel,
  // then stop every track if permission is granted after the attempt has been abandoned.
  const stream = await new Promise<MediaStream>((resolve, reject) => {
    const abortPermission = () =>
      reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", abortPermission, { once: true });
    void pendingStream.then(
      (obtained) => {
        signal.removeEventListener("abort", abortPermission);
        if (signal.aborted) {
          obtained.getTracks().forEach((track) => track.stop());
          reject(new DOMException("Cancelled", "AbortError"));
        } else resolve(obtained);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abortPermission);
        reject(error);
      },
    );
  });
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  if (signal.aborted) {
    stopTracks();
    throw new DOMException("Cancelled", "AbortError");
  }
  const formats =
    kind === "video"
      ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"];
  let recorder: MediaRecorder;
  try {
    const mimeType = formats.find((format) =>
      MediaRecorder.isTypeSupported(format),
    );
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    stopTracks();
    throw error;
  }
  let size = 0,
    cancelled = false,
    requestedStop = false,
    notified = false,
    error: Error | undefined;
  const chunks: Blob[] = [];
  const began = performance.now();
  let resolve!: (value: { blob: Blob; durationSeconds: number }) => void;
  let reject!: (reason: Error) => void;
  const result = new Promise<{ blob: Blob; durationSeconds: number }>(
    (yes, no) => {
      resolve = yes;
      reject = no;
    },
  );
  void result.catch(() => undefined);
  const notifyStopped = () => {
    if (notified || cancelled) return;
    notified = true;
    onLimit();
  };
  const stopRecorder = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  const cancel = () => {
    cancelled = true;
    try {
      stopRecorder();
    } catch {
      // A failed recorder still must release its microphone/camera tracks.
    } finally {
      cleanup();
      chunks.length = 0;
      reject(new DOMException("Cancelled", "AbortError"));
    }
  };
  const timer = setTimeout(() => {
    if (recorder.state !== "inactive") {
      stopRecorder();
      notifyStopped();
    }
  }, 120_000);
  const cleanup = () => {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    stopTracks();
  };
  signal.addEventListener("abort", cancel, { once: true });
  recorder.ondataavailable = (event) => {
    if (!event.data.size || cancelled) return;
    size += event.data.size;
    if (size > 20 * 1024 * 1024) {
      error = new Error(
        "Clip reached the 20 MB limit. Please try a shorter recording.",
      );
      stopRecorder();
      notifyStopped();
    } else chunks.push(event.data);
  };
  recorder.onerror = () => {
    error = new Error("Recording failed. Your device may be in use.");
    cleanup();
    reject(error);
    notifyStopped();
  };
  recorder.onstop = () => {
    cleanup();
    if (cancelled) reject(new DOMException("Cancelled", "AbortError"));
    else if (error) reject(error);
    else if (!chunks.length)
      reject(new Error("No recording was captured. Please try again."));
    else
      resolve({
        blob: new Blob(chunks, { type: recorder.mimeType || chunks[0].type }),
        durationSeconds: Math.min(120, (performance.now() - began) / 1000),
      });
    chunks.length = 0;
    if (!requestedStop) notifyStopped();
  };
  try {
    recorder.start(250);
  } catch (cause) {
    cleanup();
    throw cause;
  }
  return {
    stream,
    cancel,
    stop: () => {
      requestedStop = true;
      stopRecorder();
      return result;
    },
  };
}
