import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserAudioOutput, type OutputOptions } from "./browserOutput";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const options = (signal = new AbortController().signal): OutputOptions => ({
  signal,
  deadline: 1_500,
  volume: 1,
  onStart: vi.fn(),
});

describe("native output start boundaries", () => {
  it("never creates a playback node if a recording decodes after the tap deadline", async () => {
    let now = 0;
    let finishDecode!: (value: AudioBuffer) => void;
    const createSource = vi.fn();
    const decode = vi.fn(
      () =>
        new Promise<AudioBuffer>((resolve) => {
          finishDecode = resolve;
        }),
    );
    vi.stubGlobal("window", {
      AudioContext: class {
        state = "running";
        decodeAudioData = decode;
        createBufferSource = createSource;
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => now;
    const pending = output.recording(
      new Blob(["recorded sentence"]),
      options(),
    );
    const result = pending.catch((error: unknown) => error);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    now = 1_500;
    finishDecode({} as AudioBuffer);
    expect(await result).toMatchObject({ code: "expired" });
    expect(createSource).not.toHaveBeenCalled();
  });

  it("does not resume playback after Stop aborts an in-flight decode", async () => {
    let finishDecode!: (value: AudioBuffer) => void;
    const createSource = vi.fn();
    const decode = vi.fn(
      () =>
        new Promise<AudioBuffer>((resolve) => {
          finishDecode = resolve;
        }),
    );
    vi.stubGlobal("window", {
      AudioContext: class {
        state = "running";
        decodeAudioData = decode;
        createBufferSource = createSource;
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => 0;
    const abort = new AbortController();
    const result = output
      .recording(new Blob(["recorded sentence"]), options(abort.signal))
      .catch((error: unknown) => error);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    abort.abort();
    finishDecode({} as AudioBuffer);
    expect(await result).toMatchObject({ code: "cancelled" });
    expect(createSource).not.toHaveBeenCalled();
  });

  it("will not read Tamil through an unrelated English voice", async () => {
    const speak = vi.fn();
    vi.stubGlobal("window", {
      speechSynthesis: {
        getVoices: () => [
          { lang: "en-US", name: "English", localService: true },
        ],
        speak,
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => 0;
    await expect(output.device("ஆமா", "ta", options())).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("cancels native speech that remains queued at the deadline", async () => {
    vi.useFakeTimers();
    let now = 0;
    let utterance: { onstart?: () => void } | undefined;
    const cancel = vi.fn();
    const speak = vi.fn((next: typeof utterance) => {
      utterance = next;
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal("window", {
      speechSynthesis: {
        getVoices: () => [
          { lang: "en-IN", name: "English", localService: true },
        ],
        speak,
        cancel,
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => now;
    const config = options();
    const result = output
      .device("Yes", "en", config)
      .catch((error: unknown) => error);
    expect(speak).toHaveBeenCalledTimes(1);
    now = 1_500;
    await vi.advanceTimersByTimeAsync(1_500);
    expect(await result).toMatchObject({ code: "expired" });
    expect(cancel).toHaveBeenCalledTimes(1);
    const queued = utterance as { onstart?: () => void } | undefined;
    queued?.onstart?.();
    expect(config.onStart).not.toHaveBeenCalled();
  });

  it("does not let a stale native start event cancel a newer utterance", async () => {
    type NativeUtterance = { onstart?: () => void; onend?: () => void };
    const utterances: NativeUtterance[] = [];
    const cancel = vi.fn();
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal("window", {
      speechSynthesis: {
        getVoices: () => [
          { lang: "en-IN", name: "English", localService: true },
        ],
        speak: (utterance: NativeUtterance) => utterances.push(utterance),
        cancel,
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => 0;
    const aborted = new AbortController();
    const first = output
      .device("Old", "en", options(aborted.signal))
      .catch((error: unknown) => error);
    aborted.abort();
    output.stop();
    const nextOptions = options();
    const next = output.device("New", "en", nextOptions);
    const previousCancelCount = cancel.mock.calls.length;
    utterances[0]!.onstart?.();
    expect(cancel).toHaveBeenCalledTimes(previousCancelCount);
    utterances[1]!.onstart?.();
    utterances[1]!.onend?.();
    await next;
    expect(await first).toMatchObject({ code: "cancelled" });
    expect(nextOptions.onStart).toHaveBeenCalledOnce();
  });

  it("does not report successful speech when the browser ends without starting audio", async () => {
    type NativeUtterance = { onend?: () => void };
    const utterances: NativeUtterance[] = [];
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal("window", {
      speechSynthesis: {
        getVoices: () => [
          { lang: "en-IN", name: "English", localService: true },
        ],
        speak: (utterance: NativeUtterance) => utterances.push(utterance),
        cancel: vi.fn(),
      },
    });
    const output = new BrowserAudioOutput();
    output.now = () => 0;
    const result = output
      .device("Yes", "en", options())
      .catch((error: unknown) => error);
    utterances[0]!.onend?.();
    expect(await result).toMatchObject({ code: "failed" });
  });
});
