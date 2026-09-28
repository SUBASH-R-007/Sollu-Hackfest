interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: {
          length: number;
          [index: number]: { isFinal: boolean; 0: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export function startPracticeTranscript(
  language: "en" | "ta",
  onText: (text: string) => void,
  onEnd: (error?: string) => void,
): () => void {
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Constructor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Constructor)
    throw new Error(
      "Browser transcription is unavailable. A partner can type the words they heard.",
    );
  const recognition = new Constructor();
  recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    recognition.onresult = recognition.onend = recognition.onerror = null;
    try {
      recognition.abort();
    } catch {
      // Some engines throw if they have already ended or start() failed.
    }
  };
  const timer = setTimeout(() => {
    stop();
    onEnd();
  }, 120_000);
  recognition.onresult = (event) => {
    if (stopped) return;
    const words = Array.from(
      { length: event.results.length },
      (_, index) => event.results[index],
    )
      .filter((result) => result.isFinal)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim()
      .slice(0, 1000);
    onText(words);
  };
  recognition.onerror = () => {
    stop();
    onEnd(
      "Transcription could not hear this attempt. This is not a speech assessment. You can enter the words manually.",
    );
  };
  recognition.onend = () => {
    stop();
    onEnd();
  };
  try {
    recognition.start();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
