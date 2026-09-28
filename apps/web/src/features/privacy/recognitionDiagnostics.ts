import type { RecognitionMode } from "./recognitionPreference";

/** Describe recognition failures without inferring speech ability or switching services. */
export function recognitionErrorMessage(
  code: string,
  mode: RecognitionMode,
  language: string,
): string {
  const local = mode === "local";
  const locale = language.startsWith("ta")
    ? "Tamil"
    : language.startsWith("en")
      ? "English"
      : "the selected language";
  const fallback = " You can type or choose a topic instead.";

  switch (code) {
    case "aborted":
    case "AbortError":
      return "";
    case "not-allowed":
    case "NotAllowedError":
    case "SecurityError":
      return (
        "Microphone access was not allowed. Allow microphone access for this site in your browser and device settings, then try again." +
        fallback
      );
    case "audio-capture":
    case "NotFoundError":
    case "NotReadableError":
      return (
        "The microphone could not be accessed. Check that it is connected, enabled and available, then try again." +
        fallback
      );
    case "no-speech":
      return (
        "No speech was detected in this attempt. Check your microphone, then try again when you are ready." +
        fallback
      );
    case "language-not-supported":
    case "NotSupportedError":
      return (
        (local
          ? `Local recognition for ${locale} is not available. This browser may not support the language or its on-device language pack may not be installed. No online fallback was used.`
          : `This browser's speech service does not support ${locale} for this attempt. Check speech recognition settings or try another supported browser.`) +
        fallback
      );
    case "service-not-allowed":
      return (
        (local
          ? "This browser blocked its local speech recognition service. Check browser permissions and language support."
          : "This browser blocked its speech recognition service. Check browser permissions. An embedded browser may not provide this service; try opening the same address in a full browser with speech recognition support.") +
        fallback
      );
    case "network":
    case "NetworkError":
      return (
        (local
          ? "Local speech recognition reported a service connection error. No online fallback was used. Check this browser's on-device recognition support."
          : "The browser could not connect to its speech recognition service. Check your internet connection, then try again. If this is an embedded browser, try the same address in a full browser with speech recognition support.") +
        fallback
      );
    case "recognition-unavailable":
      return (
        "Speech recognition is unavailable in this browser. Try the same address in a full browser with speech recognition support." +
        fallback
      );
    case "start-timeout":
      return (
        "The browser did not start speech recognition. Check microphone permission and browser support, then try again." +
        fallback
      );
    case "InvalidStateError":
      return "Speech recognition is already starting or active. Stop it before trying again.";
    default:
      return (
        (local
          ? "Local speech recognition could not start or continue. No online fallback was used. Try again or check this browser's on-device recognition support."
          : "Browser speech recognition could not start or continue. Try again or check your browser's speech recognition support.") +
        fallback
      );
  }
}
