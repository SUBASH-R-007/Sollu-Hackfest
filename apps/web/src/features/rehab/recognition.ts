import {
  getSpeechRecognitionMode,
  prepareBrowserRecognition,
} from "../privacy/browserPolicy";
import { recognitionErrorMessage } from "../privacy/recognitionDiagnostics";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
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
  onStarted?: () => void,
): () => void {
  const mode = getSpeechRecognitionMode();
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Constructor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Constructor)
    throw new Error(
      recognitionErrorMessage("recognition-unavailable", mode, language),
    );
  const recognition = prepareBrowserRecognition(Constructor);
  recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;
  let stopped = false;
  let started = false;
  let recordingTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(startupTimer);
    clearTimeout(recordingTimer);
    recognition.onresult =
      recognition.onend =
      recognition.onerror =
      recognition.onstart =
        null;
    try {
      recognition.abort();
    } catch {
      // Some engines throw if they have already ended or start() failed.
    }
  };
  const startupTimer = setTimeout(() => {
    stop();
    onEnd(recognitionErrorMessage("start-timeout", mode, language));
  }, 10_000);
  recognition.onstart = () => {
    if (stopped || started) return;
    started = true;
    clearTimeout(startupTimer);
    recordingTimer = setTimeout(() => {
      stop();
      onEnd();
    }, 120_000);
    onStarted?.();
  };
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
  recognition.onerror = (event) => {
    if (stopped) return;
    stop();
    const message = recognitionErrorMessage(event.error, mode, language);
    onEnd(message ? `${message} This is not a speech assessment.` : undefined);
  };
  recognition.onend = () => {
    if (stopped) return;
    stop();
    onEnd();
  };
  try {
    recognition.start();
  } catch (error) {
    stop();
    const message = recognitionErrorMessage(
      error instanceof Error ? error.name : "unknown",
      mode,
      language,
    );
    if (message) throw new Error(message);
    onEnd();
  }
  return stop;
}
