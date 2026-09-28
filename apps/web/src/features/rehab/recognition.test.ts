import { afterEach, describe, expect, it, vi } from "vitest";
import { startPracticeTranscript } from "./recognition";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function harness(
  startError?: DOMException,
  synchronousEvent?: "end" | "error",
) {
  vi.useFakeTimers();
  class Recognition {
    static latest: Recognition;
    processLocally = false;
    lang = "";
    continuous = false;
    interimResults = false;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onresult: ((event: { results: never[] }) => void) | null = null;
    abort = vi.fn();
    stop = vi.fn();
    start = vi.fn(() => {
      if (startError) throw startError;
      if (synchronousEvent === "end") this.onend?.();
      if (synchronousEvent === "error")
        this.onerror?.({ error: "not-allowed" });
    });
    constructor() {
      Recognition.latest = this;
    }
  }
  vi.stubGlobal("window", { SpeechRecognition: Recognition });
  return Recognition;
}

describe("practice recognition startup and failures", () => {
  it("waits for actual browser startup and ignores a delayed start after cancellation", () => {
    const Constructor = harness();
    const started = vi.fn();
    const end = vi.fn();
    const cancel = startPracticeTranscript("ta", vi.fn(), end, started);
    expect(Constructor.latest.start).toHaveBeenCalledOnce();
    expect(started).not.toHaveBeenCalled();
    const lateStart = Constructor.latest.onstart;
    Constructor.latest.onstart?.();
    expect(started).toHaveBeenCalledOnce();
    cancel();
    lateStart?.();
    expect(started).toHaveBeenCalledOnce();
    expect(end).not.toHaveBeenCalled();
    expect(Constructor.latest.onstart).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports no speech without claiming missing language packs and ends only once", () => {
    const Constructor = harness();
    const end = vi.fn();
    startPracticeTranscript("ta", vi.fn(), end);
    const lateEnd = Constructor.latest.onend;
    const lateError = Constructor.latest.onerror;
    Constructor.latest.onerror?.({ error: "no-speech" });
    expect(end).toHaveBeenCalledOnce();
    expect(end.mock.calls[0]?.[0]).toContain("No speech was detected");
    expect(end.mock.calls[0]?.[0]).not.toContain("language pack");
    expect(Constructor.latest.abort).toHaveBeenCalledOnce();
    lateEnd?.();
    lateError?.({ error: "network" });
    expect(end).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up startup failures and supplies actionable permission guidance", () => {
    const Constructor = harness(new DOMException("denied", "NotAllowedError"));
    const started = vi.fn();
    expect(() =>
      startPracticeTranscript("en", vi.fn(), vi.fn(), started),
    ).toThrow("Allow microphone access for this site");
    expect(started).not.toHaveBeenCalled();
    expect(Constructor.latest.abort).toHaveBeenCalledOnce();
    expect(Constructor.latest.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not display an error when browser startup is intentionally aborted", () => {
    const Constructor = harness(new DOMException("cancelled", "AbortError"));
    const end = vi.fn();
    const cancel = startPracticeTranscript("en", vi.fn(), end);
    cancel();
    expect(end).toHaveBeenCalledExactlyOnceWith();
    expect(Constructor.latest.abort).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports language failures using the language selected for that attempt", () => {
    const Constructor = harness();
    const end = vi.fn();
    startPracticeTranscript("ta", vi.fn(), end);
    expect(Constructor.latest.lang).toBe("ta-IN");
    Constructor.latest.onerror?.({ error: "language-not-supported" });
    expect(end.mock.calls[0]?.[0]).toContain("Local recognition for Tamil");
    expect(end.mock.calls[0]?.[0]).toContain("No online fallback was used");
  });

  it("ends a hung browser startup after ten seconds and ignores a late start", async () => {
    const Constructor = harness();
    const started = vi.fn();
    const end = vi.fn();
    startPracticeTranscript("ta", vi.fn(), end, started);
    const lateStart = Constructor.latest.onstart;
    await vi.advanceTimersByTimeAsync(9_999);
    expect(end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(end).toHaveBeenCalledOnce();
    expect(end.mock.calls[0]?.[0]).toContain(
      "browser did not start speech recognition",
    );
    expect(Constructor.latest.abort).toHaveBeenCalledOnce();
    lateStart?.();
    expect(started).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["end", "error"] as const)(
    "finishes cleanly when the browser emits %s synchronously inside start",
    (event) => {
      const Constructor = harness(undefined, event);
      const end = vi.fn();
      const started = vi.fn();
      const cancel = startPracticeTranscript("en", vi.fn(), end, started);
      expect(end).toHaveBeenCalledOnce();
      expect(started).not.toHaveBeenCalled();
      expect(Constructor.latest.onstart).toBeNull();
      cancel();
      expect(end).toHaveBeenCalledOnce();
      expect(Constructor.latest.abort).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("gives a successful start its full two minutes beyond the startup deadline", async () => {
    const Constructor = harness();
    const started = vi.fn();
    const end = vi.fn();
    startPracticeTranscript("en", vi.fn(), end, started);
    await vi.advanceTimersByTimeAsync(9_000);
    Constructor.latest.onstart?.();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(end).not.toHaveBeenCalled();
    expect(started).toHaveBeenCalledOnce();
    // A duplicate start cannot extend the recording beyond its original limit.
    Constructor.latest.onstart?.();
    await vi.advanceTimersByTimeAsync(118_999);
    expect(end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(end).toHaveBeenCalledExactlyOnceWith();
    expect(started).toHaveBeenCalledOnce();
    expect(Constructor.latest.abort).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
