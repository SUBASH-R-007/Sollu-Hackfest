import { describe, expect, it } from "vitest";
import { recognitionErrorMessage } from "./recognitionDiagnostics";

describe("recognition failure guidance", () => {
  it.each(["aborted", "AbortError"])("does not alarm for %s", (code) => {
    expect(recognitionErrorMessage(code, "local", "ta-IN")).toBe("");
  });

  it.each(["not-allowed", "NotAllowedError", "SecurityError"])(
    "explains microphone permission for %s without guessing at language packs",
    (code) => {
      const message = recognitionErrorMessage(code, "local", "ta");
      expect(message).toContain("Allow microphone access");
      expect(message).not.toContain("language pack");
    },
  );

  it.each(["audio-capture", "NotFoundError", "NotReadableError"])(
    "explains microphone availability for %s",
    (code) => {
      expect(recognitionErrorMessage(code, "browser", "en-IN")).toContain(
        "connected, enabled and available",
      );
    },
  );

  it("does not blame a missing language pack or speech ability for no speech", () => {
    const message = recognitionErrorMessage("no-speech", "local", "ta-IN");
    expect(message).toContain("No speech was detected in this attempt");
    expect(message).not.toMatch(/language pack|accuracy|assessment/i);
  });

  it.each(["language-not-supported", "NotSupportedError"])(
    "distinguishes local and browser language failures for %s",
    (code) => {
      expect(recognitionErrorMessage(code, "local", "ta-IN")).toContain(
        "Local recognition for Tamil is not available",
      );
      expect(recognitionErrorMessage(code, "local", "en")).toContain(
        "language pack may not be installed",
      );
      expect(recognitionErrorMessage(code, "browser", "en-IN")).toContain(
        "does not support English",
      );
      expect(recognitionErrorMessage(code, "browser", "en-IN")).not.toContain(
        "language pack",
      );
    },
  );

  it("distinguishes blocked service from connection failure", () => {
    expect(
      recognitionErrorMessage("service-not-allowed", "browser", "en"),
    ).toContain("blocked its speech recognition service");
    expect(recognitionErrorMessage("network", "browser", "en")).toContain(
      "Check your internet connection",
    );
    expect(recognitionErrorMessage("NetworkError", "local", "en")).toContain(
      "No online fallback was used",
    );
  });

  it("gives guarded browser guidance when no recognizer is exposed", () => {
    expect(
      recognitionErrorMessage("recognition-unavailable", "local", "ta"),
    ).toContain("full browser with speech recognition support");
  });

  it("does not echo unknown error content or speculate about a missing pack", () => {
    const message = recognitionErrorMessage("secret detail", "local", "ta");
    expect(message).toContain("could not start or continue");
    expect(message).not.toMatch(/secret detail|language pack/);
    expect(
      recognitionErrorMessage("InvalidStateError", "browser", "en"),
    ).toContain("Stop it before trying again");
  });
});
