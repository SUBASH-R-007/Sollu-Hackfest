import { afterEach, describe, expect, it, vi } from "vitest";
import { checkLocalRecognition } from "./recognitionAvailability";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function browser(status: string | Promise<string> = "unavailable") {
  const available = vi.fn().mockImplementation(() => Promise.resolve(status));
  const start = vi.fn();
  const install = vi.fn();
  class Recognition {
    processLocally = false;
    start = start;
    static available = available;
    static install = install;
  }
  vi.stubGlobal("window", { SpeechRecognition: Recognition });
  return { available, start, install };
}

describe("local recognition support check", () => {
  it("checks the requested Tamil pack locally without capturing or downloading", async () => {
    const { available, start, install } = browser();
    expect(await checkLocalRecognition("ta")).toContain(
      "local recognition is unavailable",
    );
    expect(available).toHaveBeenCalledExactlyOnceWith({
      langs: ["ta-IN"],
      processLocally: true,
    });
    expect(start).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });
  it("distinguishes an offered pack from one already installed", async () => {
    const { install } = browser("downloadable");
    expect(await checkLocalRecognition("en")).toContain("not installed");
    expect(install).not.toHaveBeenCalled();
    browser("available");
    expect(await checkLocalRecognition("en")).toContain(
      "Microphone permission and an actual spoken attempt are still required",
    );
  });
  it("does not claim support from an exposed legacy recognition API", async () => {
    const available = vi.fn();
    class Legacy {
      static available = available;
    }
    vi.stubGlobal("window", { webkitSpeechRecognition: Legacy });
    expect(await checkLocalRecognition("ta")).toContain(
      "does not expose on-device recognition",
    );
    expect(available).not.toHaveBeenCalled();
  });
  it("handles missing and restricted capability APIs honestly", async () => {
    vi.stubGlobal("window", {});
    expect(await checkLocalRecognition("en")).toContain(
      "does not expose speech recognition",
    );
    class Uncheckable {
      processLocally = false;
    }
    vi.stubGlobal("window", { SpeechRecognition: Uncheckable });
    expect(await checkLocalRecognition("en")).toContain("unverified");
    const { available } = browser();
    available.mockRejectedValue(new DOMException("Blocked", "SecurityError"));
    expect(await checkLocalRecognition("en")).toContain(
      "could not check local support",
    );
  });
  it("finishes even when a browser never resolves its availability request", async () => {
    vi.useFakeTimers();
    browser(new Promise(() => {}));
    const check = checkLocalRecognition("ta");
    await vi.advanceTimersByTimeAsync(5000);
    expect(await check).toContain("did not finish");
  });
});
