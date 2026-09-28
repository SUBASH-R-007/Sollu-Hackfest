type RecognitionConstructor = {
  new (): object;
  available?: (options: {
    langs: string[];
    processLocally: boolean;
  }) => Promise<string>;
};

/** A capability check only: never starts capture, installs a pack or requests
 * availability from an online recognition service. */
export async function checkLocalRecognition(
  language: "en" | "ta",
): Promise<string> {
  const locale = language === "ta" ? "ta-IN" : "en-IN";
  const label = language === "ta" ? "Tamil (ta-IN)" : "English (en-IN)";
  const host = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Constructor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Constructor)
    return "This browser does not expose speech recognition. Try this same address in an up-to-date Chrome or Edge browser, or use typing and Topics.";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!("processLocally" in new Constructor()))
      return "This browser does not expose on-device recognition. Local mode cannot start here. Choose browser online recognition in Privacy settings, or use typing and Topics.";
    if (!Constructor.available)
      return `This browser cannot check installed local language packs. Local support for ${label} is unverified. A sentence API key does not install speech recognition.`;
    const status = await Promise.race([
      Constructor.available({ langs: [locale], processLocally: true }),
      new Promise<string>((resolve) => {
        timer = setTimeout(() => resolve("timeout"), 5000);
      }),
    ]);
    switch (status) {
      case "available":
        return `${label}: the browser reports a local language pack is installed. Microphone permission and an actual spoken attempt are still required.`;
      case "downloadable":
        return `${label}: a local language pack is offered but is not installed. No download was started. Use your browser’s language-pack controls if available, or explicitly choose browser online recognition.`;
      case "downloading":
        return `${label}: the browser reports a language-pack download is already in progress. Wait for it to finish, then check again. Sollu did not start this download.`;
      case "unavailable":
        return `${label}: local recognition is unavailable in this browser. A sentence API key cannot enable it. Choose browser online recognition in Privacy settings, or use typing and Topics.`;
      case "timeout":
        return "The local language check did not finish. Support is unverified. Try the check again or use typing and Topics.";
      default:
        return `The browser did not return a recognized availability status for ${label}. Local support is unverified.`;
    }
  } catch {
    return `This browser could not check local support for ${label}. It may restrict language-pack checks. Try this same address in an up-to-date Chrome or Edge browser, or use typing and Topics.`;
  } finally {
    clearTimeout(timer);
  }
}
