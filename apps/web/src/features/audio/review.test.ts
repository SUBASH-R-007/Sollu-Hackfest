import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioController } from "./index";
import { TapGate } from "./tapGate";
import type { AudioOutput } from "./browserOutput";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function harness() {
  vi.useFakeTimers();
  let time = 0,
    urls = 0;
  const create = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation(() => `blob:test-${++urls}`);
  const revoke = vi
    .spyOn(URL, "revokeObjectURL")
    .mockImplementation(() => undefined);
  const output: AudioOutput = {
    now: () => time,
    pathname: () => "/practice",
    voices: () => [],
    device: vi.fn(),
    recording: vi.fn(),
    tone: vi.fn(),
    unlock: vi.fn(),
    stop: vi.fn(),
  };
  const controller = new AudioController(
    output,
    new TapGate(
      () => time,
      () => true,
    ),
  );
  const element = {
    src: "",
    srcObject: null,
    muted: false,
    autoplay: false,
    volume: 1,
    onplaying: null as (() => void) | null,
    onended: null as (() => void) | null,
    onerror: null as (() => void) | null,
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn((name: string) => {
      if (name === "src") element.src = "";
    }),
  };
  const tap = (label = "Review recording") =>
    controller.createTap(new Event("pointerup"), label, {
      role: "patient",
      surface: "patient",
    });
  const blob = new Blob(["local recording"], { type: "video/webm" });
  const review = (ticket = tap(), text = "Review recording") =>
    controller.reviewMedia({
      element: element as unknown as HTMLMediaElement,
      blob,
      text,
      ticket,
    });
  return {
    controller,
    element,
    blob,
    create,
    revoke,
    tap,
    review,
    setTime: (value: number) => {
      time = value;
    },
  };
}

describe("explicit local evidence playback", () => {
  it("requires an exact fresh review tap and never creates a URL on a failed gate", async () => {
    const h = harness();
    expect(await h.review(null)).toEqual({ status: "unavailable" });
    expect(await h.review(h.tap(), "Different recording")).toEqual({
      status: "unavailable",
    });
    const old = h.tap();
    h.setTime(1500);
    expect(await h.review(old)).toEqual({ status: "expired" });
    expect(h.create).not.toHaveBeenCalled();
    expect(h.element.play).not.toHaveBeenCalled();
  });
  it("starts muted until freshness is checked and releases the local URL after completion", async () => {
    const h = harness(),
      result = h.review();
    expect(h.element.src).toBe("blob:test-1");
    expect(h.element.muted).toBe(true);
    h.element.onplaying?.();
    expect(h.element.muted).toBe(false);
    h.element.onended?.();
    expect(await result).toEqual({ status: "completed" });
    expect(h.element.src).toBe("");
    expect(h.element.muted).toBe(true);
    expect(h.revoke).toHaveBeenCalledWith("blob:test-1");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels a queued play at the tap deadline without unmuting", async () => {
    const h = harness(),
      result = h.review();
    const latePlaying = h.element.onplaying;
    h.setTime(1500);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await result).toEqual({ status: "expired" });
    latePlaying?.();
    expect(h.element.muted).toBe(true);
    expect(h.element.src).toBe("");
  });
  it("global Stop aborts playback and a superseding tap cannot be erased by old cleanup", async () => {
    const h = harness(),
      first = h.review();
    h.element.onplaying?.();
    h.controller.stop();
    expect(await first).toEqual({ status: "cancelled" });
    const second = h.review();
    const third = h.review();
    expect(await second).toEqual({ status: "cancelled" });
    expect(h.element.src).toBe("blob:test-3");
    expect(h.element.onplaying).not.toBeNull();
    h.element.onplaying?.();
    h.element.onended?.();
    expect(await third).toEqual({ status: "completed" });
    expect(h.revoke).toHaveBeenCalledTimes(3);
  });
  it("reports playback failures without leaving a recording source or timer", async () => {
    const h = harness();
    h.element.play.mockImplementation(() => {
      throw new Error("play unavailable");
    });
    expect(await h.review()).toEqual({ status: "failed" });
    expect(h.element.src).toBe("");
    expect(h.revoke).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    h.create.mockImplementation(() => {
      throw new Error("URL unavailable");
    });
    expect(await h.review()).toEqual({ status: "failed" });
  });
  it("does not report completion before actual playback began", async () => {
    const h = harness(),
      result = h.review();
    h.element.onended?.();
    expect(await result).toEqual({ status: "failed" });
  });
});
