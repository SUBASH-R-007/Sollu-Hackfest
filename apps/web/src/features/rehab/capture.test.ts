import { afterEach, describe, expect, it, vi } from "vitest";
import { captureEvidence } from "./capture";
import { startPracticeTranscript } from "./recognition";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function captureHarness() {
  vi.useFakeTimers();
  const stopTrack = vi.fn();
  const stream = {
    getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }],
  } as unknown as MediaStream;
  const getUserMedia = vi.fn(async () => stream);
  class Recorder {
    static isTypeSupported = () => true;
    static latest: Recorder;
    static startError = false;
    state = "inactive";
    mimeType: string;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    constructor(_stream: MediaStream, options?: { mimeType: string }) {
      Recorder.latest = this;
      this.mimeType = options?.mimeType ?? "audio/webm";
    }
    start() {
      if (Recorder.startError) throw new Error("start failed");
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      Promise.resolve().then(() => {
        this.ondataavailable?.({
          data: new Blob(["audio bytes"], { type: this.mimeType }),
        });
        this.onstop?.();
      });
    }
  }
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", Recorder);
  return { stream, stopTrack, getUserMedia, Recorder };
}

describe("local recording permission and cancellation", () => {
  it("never requests permission for an already cancelled attempt", async () => {
    const h = captureHarness(),
      abort = new AbortController();
    abort.abort();
    await expect(
      captureEvidence("audio", abort.signal, vi.fn()),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });
  it("cancels a pending permission prompt immediately and stops tracks on late permission", async () => {
    const h = captureHarness(),
      abort = new AbortController();
    let allow!: (stream: MediaStream) => void;
    h.getUserMedia.mockReturnValue(
      new Promise((resolve) => {
        allow = resolve;
      }),
    );
    const result = captureEvidence("video", abort.signal, vi.fn()).catch(
      (error: unknown) => error,
    );
    abort.abort();
    expect(await result).toMatchObject({ name: "AbortError" });
    allow(h.stream);
    await Promise.resolve();
    expect(h.stopTrack).toHaveBeenCalledTimes(2);
    expect(h.Recorder.latest).toBeUndefined();
  });
  it("finishes a clip with the recorded type and releases all tracks", async () => {
    const h = captureHarness(),
      limit = vi.fn();
    const capture = await captureEvidence(
      "video",
      new AbortController().signal,
      limit,
    );
    const result = await capture.stop();
    expect(result.blob.type).toBe("video/webm;codecs=vp8,opus");
    expect(await result.blob.text()).toBe("audio bytes");
    expect(h.stopTrack).toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("discards accumulated evidence on cancellation and settles even if no stop event arrives", async () => {
    const h = captureHarness(),
      abort = new AbortController(),
      limit = vi.fn();
    const capture = await captureEvidence("audio", abort.signal, limit);
    h.Recorder.latest.ondataavailable?.({
      data: new Blob(["private recording"], { type: "audio/webm" }),
    });
    h.Recorder.latest.stop = () => {
      h.Recorder.latest.state = "inactive";
    };
    abort.abort();
    await expect(capture.stop()).rejects.toMatchObject({ name: "AbortError" });
    expect(h.stopTrack).toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ends at the time limit and notifies the UI only once", async () => {
    const h = captureHarness(),
      limit = vi.fn();
    const capture = await captureEvidence(
      "audio",
      new AbortController().signal,
      limit,
    );
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.Recorder.latest.state).toBe("inactive");
    expect(limit).toHaveBeenCalledTimes(1);
    expect((await capture.stop()).durationSeconds).toBeLessThanOrEqual(120);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects an oversized clip and releases its stream", async () => {
    const h = captureHarness(),
      limit = vi.fn();
    const capture = await captureEvidence(
      "audio",
      new AbortController().signal,
      limit,
    );
    h.Recorder.latest.ondataavailable?.({
      data: new Blob([new Uint8Array(21 * 1024 * 1024)], {
        type: "audio/webm",
      }),
    });
    await expect(capture.stop()).rejects.toThrow("20 MB");
    expect(limit).toHaveBeenCalledTimes(1);
    expect(h.stopTrack).toHaveBeenCalled();
  });
  it("cleans up start failure and exposes runtime error to the UI", async () => {
    const h = captureHarness(),
      limit = vi.fn();
    h.Recorder.startError = true;
    await expect(
      captureEvidence("audio", new AbortController().signal, limit),
    ).rejects.toThrow("start failed");
    expect(h.stopTrack).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    h.Recorder.startError = false;
    const capture = await captureEvidence(
      "audio",
      new AbortController().signal,
      limit,
    );
    h.Recorder.latest.onerror?.();
    await expect(capture.stop()).rejects.toThrow("Recording failed");
    expect(limit).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("releases tracks if format detection fails and if stopping a recorder throws", async () => {
    const h = captureHarness();
    h.Recorder.isTypeSupported = () => {
      throw new Error("format unavailable");
    };
    await expect(
      captureEvidence("audio", new AbortController().signal, vi.fn()),
    ).rejects.toThrow("format unavailable");
    expect(h.stopTrack).toHaveBeenCalledTimes(2);
    h.Recorder.isTypeSupported = () => true;
    const capture = await captureEvidence(
      "audio",
      new AbortController().signal,
      vi.fn(),
    );
    h.Recorder.latest.stop = () => {
      throw new Error("already failed");
    };
    expect(() => capture.cancel()).not.toThrow();
    expect(h.stopTrack).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("optional browser transcript lifecycle", () => {
  function recognitionHarness() {
    vi.useFakeTimers();
    class Recognition {
      static latest: Recognition;
      lang = "";
      continuous = false;
      interimResults = true;
      onresult:
        | ((event: {
            results: { isFinal: boolean; 0: { transcript: string } }[];
          }) => void)
        | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      abort = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      constructor() {
        Recognition.latest = this;
      }
    }
    vi.stubGlobal("window", { SpeechRecognition: Recognition });
    return Recognition;
  }
  it("returns only bounded final recognition results and cancels future callbacks", () => {
    const Constructor = recognitionHarness(),
      text = vi.fn(),
      end = vi.fn();
    const cancel = startPracticeTranscript("ta", text, end);
    const recognizer = Constructor.latest;
    expect(recognizer.lang).toBe("ta-IN");
    recognizer.onresult?.({
      results: [
        { isFinal: true, 0: { transcript: "எனக்கு" } },
        { isFinal: false, 0: { transcript: "ignored" } },
        { isFinal: true, 0: { transcript: "தண்ணீர்" } },
      ],
    });
    expect(text).toHaveBeenLastCalledWith("எனக்கு தண்ணீர்");
    const staleCallback = recognizer.onresult;
    cancel();
    cancel();
    staleCallback?.({
      results: [{ isFinal: true, 0: { transcript: "late" } }],
    });
    expect(text).toHaveBeenCalledTimes(1);
    expect(recognizer.abort).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(end).not.toHaveBeenCalled();
  });
  it("finishes at two minutes even if the browser abort implementation throws", async () => {
    const Constructor = recognitionHarness(),
      end = vi.fn();
    startPracticeTranscript("en", vi.fn(), end);
    Constructor.latest.abort.mockImplementation(() => {
      throw new Error("already stopped");
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(end).toHaveBeenCalledTimes(1);
    expect(Constructor.latest.onresult).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
