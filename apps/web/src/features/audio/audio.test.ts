import { describe, expect, it, vi } from "vitest";
import { AudioController } from "./index";
import {
  OutputError,
  type AudioOutput,
  type OutputOptions,
} from "./browserOutput";
import { isTrustedActivation, TapGate } from "./tapGate";

function harness() {
  let time = 0;
  let path = "/";
  const starts: string[] = [];
  const output: AudioOutput = {
    now: () => time,
    pathname: () => path,
    voices: () => [],
    device: vi.fn(async (text, _lang, options) => {
      options.onStart("device");
      starts.push(text);
    }),
    recording: vi.fn(async (_blob, options) => {
      options.onStart("recording");
      starts.push("recording");
    }),
    tone: vi.fn(async (options) => {
      options.onStart("tone");
      starts.push("tone");
    }),
    unlock: vi.fn(async () => true),
    stop: vi.fn(),
  };
  // Only the test instance accepts synthetic activations. The exported singleton uses the native trust check.
  const gate = new TapGate(
    () => time,
    () => true,
  );
  const audio = new AudioController(output, gate);
  const tap = (text: string) =>
    audio.createTap(new Event("pointerup"), text, {
      role: "patient",
      surface: "patient",
    });
  return {
    audio,
    output,
    starts,
    tap,
    setTime: (next: number) => {
      time = next;
    },
    setPath: (next: string) => {
      path = next;
    },
  };
}

describe("the single audio gate", () => {
  it("rejects synthetic browser events in production", () => {
    expect(isTrustedActivation(new Event("pointerup"))).toBe(false);
    expect(isTrustedActivation(new Event("click"))).toBe(false);
    expect(
      new TapGate().create(new Event("pointerup"), "Yes", {
        role: "patient",
        surface: "patient",
      }),
    ).toBeNull();
  });

  it("accepts native accessibility click shape with detail zero, while rejecting mouse clicks and synthetic activation", () => {
    // A controlled native-event fixture tests shape handling. Real browser trust is immutable;
    // the preceding test proves actual synthetic Event instances remain rejected.
    class NativeEventFixture {
      constructor(
        public type: string,
        public detail: number,
        public isTrusted = true,
      ) {}
    }
    vi.stubGlobal("Event", NativeEventFixture);
    try {
      expect(
        isTrustedActivation(
          new NativeEventFixture("click", 0) as unknown as Event,
        ),
      ).toBe(true);
      expect(
        isTrustedActivation(
          new NativeEventFixture("click", 1) as unknown as Event,
        ),
      ).toBe(false);
      expect(
        isTrustedActivation(
          new NativeEventFixture("click", 0, false) as unknown as Event,
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("requires the exact selected sentence and consumes a ticket only once", async () => {
    const h = harness();
    const ticket = h.tap("Yes");
    expect(
      (await h.audio.speak({ text: "No", lang: "en", ticket })).status,
    ).toBe("unavailable");
    expect(h.starts).toEqual([]);
    expect(
      (await h.audio.speak({ text: "Yes", lang: "en", ticket })).status,
    ).toBe("completed");
    expect(
      (await h.audio.speak({ text: "Yes", lang: "en", ticket })).status,
    ).toBe("unavailable");
    expect(h.starts).toEqual(["Yes"]);
  });

  it("rejects an older selection and tickets at the 1500ms deadline", async () => {
    const h = harness();
    const older = h.tap("Old");
    const newest = h.tap("New");
    expect(
      (await h.audio.speak({ text: "Old", lang: "en", ticket: older })).status,
    ).toBe("expired");
    h.setTime(1_500);
    expect(
      (await h.audio.speak({ text: "New", lang: "en", ticket: newest })).status,
    ).toBe("expired");
    expect(h.starts).toEqual([]);
  });

  it("Stop invalidates an unused ticket", async () => {
    const h = harness();
    const ticket = h.tap("Wait");
    h.audio.stop();
    expect(
      (await h.audio.speak({ text: "Wait", lang: "en", ticket })).status,
    ).toBe("expired");
    expect(h.starts).toEqual([]);
  });

  it("aborts a pending recording when a newer selection arrives; its completion cannot play", async () => {
    const h = harness();
    let complete!: () => void;
    h.output.recording = vi.fn(
      (_blob: Blob, options: OutputOptions) =>
        new Promise<void>((resolve, reject) => {
          complete = () => {
            if (options.signal.aborted) reject(new OutputError("cancelled"));
            else {
              options.onStart("recording");
              h.starts.push("recording");
              resolve();
            }
          };
        }),
    );
    const oldPlayback = h.audio.speak({
      text: "Old",
      lang: "en",
      ticket: h.tap("Old"),
      recording: new Blob(["sample"]),
    });
    const newer = h.tap("New");
    complete();
    expect((await oldPlayback).status).toBe("cancelled");
    await h.audio.speak({ text: "New", lang: "en", ticket: newer });
    expect(h.starts).toEqual(["New"]);
  });

  it("never routes a recorded voice through the neutral Listen channel", async () => {
    const h = harness();
    await h.audio.speak({
      text: "Yes",
      lang: "en",
      ticket: h.tap("Yes"),
      channel: "preview",
      recording: new Blob(["own voice"]),
    });
    expect(h.output.recording).not.toHaveBeenCalled();
    expect(h.starts).toEqual(["Yes"]);
  });

  it("does not substitute device speech for a broken Studio recording under review", async () => {
    const h = harness();
    h.output.recording = vi.fn(async () => {
      throw new OutputError("failed");
    });
    const ticket = h.audio.createTap(new Event("pointerup"), "Yes", {
      role: "caregiver",
      surface: "studio",
    });
    expect(
      (
        await h.audio.speak({
          text: "Yes",
          lang: "en",
          ticket,
          channel: "studio",
          recording: new Blob(["broken"]),
        })
      ).status,
    ).toBe("failed");
    expect(h.output.device).not.toHaveBeenCalled();
    expect(h.starts).toEqual([]);
  });

  it("shows unavailable when the language has no voice, but Help can sound a neutral tone", async () => {
    const h = harness();
    h.output.device = vi.fn(async () => {
      throw new OutputError("unavailable");
    });
    expect(
      (await h.audio.speak({ text: "Yes", lang: "ta", ticket: h.tap("Yes") }))
        .status,
    ).toBe("unavailable");
    expect(h.starts).toEqual([]);
    expect(
      (
        await h.audio.playHelp({
          text: "Help",
          lang: "ta",
          ticket: h.tap("Help"),
        })
      ).source,
    ).toBe("tone");
    expect(h.starts).toEqual(["tone"]);
  });

  it("does not let caregiver tickets speak as the patient or patient tickets play studio audio", async () => {
    const h = harness();
    const caregiver = h.audio.createTap(new Event("pointerup"), "Hello", {
      role: "caregiver",
      surface: "studio",
    });
    expect(
      (await h.audio.speak({ text: "Hello", lang: "en", ticket: caregiver }))
        .status,
    ).toBe("unavailable");
    expect(
      (
        await h.audio.speak({
          text: "Hello",
          lang: "en",
          ticket: h.tap("Hello"),
          channel: "studio",
        })
      ).status,
    ).toBe("unavailable");
    expect(h.starts).toEqual([]);
  });

  it("requires a caregiver opt-in and the /care route for remote alarm tones", async () => {
    const h = harness();
    expect((await h.audio.alarm()).status).toBe("unavailable");
    h.setPath("/care");
    const ticket = h.audio.createTap(new Event("pointerup"), "Enable alerts", {
      role: "caregiver",
      surface: "care",
    });
    expect(await h.audio.enableAlerts(ticket)).toBe(true);
    expect((await h.audio.alarm()).source).toBe("tone");
    h.setPath("/");
    expect((await h.audio.alarm()).status).toBe("unavailable");
    expect(h.starts).toEqual(["tone"]);
  });

  it("restricts the baseline channel to its route", async () => {
    const h = harness();
    const ticket = h.audio.createTap(new Event("pointerup"), "Yes", {
      role: "patient",
      surface: "baseline",
    });
    expect(
      (
        await h.audio.speak({
          text: "Yes",
          lang: "en",
          ticket,
          channel: "baseline",
        })
      ).status,
    ).toBe("unavailable");
    h.setPath("/baseline");
    expect(
      (
        await h.audio.speak({
          text: "Yes",
          lang: "en",
          ticket,
          channel: "baseline",
        })
      ).status,
    ).toBe("completed");
  });
});
