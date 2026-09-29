import { markedTranscript, targetWordTokens } from "../rehab/analysis";
import {
  LOCAL_PATIENT_ID,
  daypartAt,
  practiceRecordSchema,
  type CommunicationMethod,
  type PracticeRecord,
} from "../rehab/model";
import type { CompanionPhrase } from "./content";
import type { Outcome } from "./scheduler";

/** How a speaking step ended. Every way of communicating counts. */
export type SpokenResult =
  /** One tap: every word was said as written (a person's own check). */
  | { type: "said" }
  /** Word chips the person tapped as not clear (indices into the shown words). */
  | { type: "words"; notSaid: number[] }
  /** Not this time. Nothing is guessed about which words were missed. */
  | { type: "notYet" }
  /** Practised with a communication aid, pointing or writing. */
  | { type: "aid" }
  /** An unreviewed live browser transcript (never a pronunciation score). */
  | { type: "browser"; transcript: string }
  /** "Say it your way": spoke, typed or pointed. */
  | { type: "yourWay"; method: "speak" | "type" | "point" };

export interface SpokenAttempt {
  id: string;
  createdAt: number;
  phrase: CompanionPhrase;
  unitTitle: string;
  communicationMethod: CommunicationMethod;
  place: string;
  result: SpokenResult;
}

export interface SpokenOutcome {
  record: PracticeRecord;
  /** Review outcome; undefined leaves the phrase's schedule unchanged. */
  outcome?: Outcome;
  /** Shown words the person marked, used only as practice hints. */
  words: string[];
}

/**
 * A normal rehabilitation PracticeRecord for a companion speaking step, using
 * the same transcript rules as the practice screen. Missing measures stay null
 * (never zero) and nothing here scores pronunciation or intelligibility.
 */
export function spokenAttemptRecord(attempt: SpokenAttempt): SpokenOutcome {
  const { phrase, result } = attempt;
  const shown = targetWordTokens(phrase.text);
  const wordKind = shown.length > 1 ? "sentence" : "word";
  let kind: PracticeRecord["kind"] = wordKind;
  let transcript = "";
  let rawTranscript: string | undefined;
  let source: PracticeRecord["transcriptSource"] = "none";
  let reviewed = false;
  let missed: string[] = [];
  let aacCompleted: boolean | null = null;
  let outcome: Outcome | undefined;
  let words: string[] = [];

  // A single-word "Not yet" is the practice screen's one-chip mark.
  const marks =
    result.type === "words"
      ? result.notSaid
      : result.type === "notYet" && shown.length === 1
        ? [0]
        : undefined;
  if (result.type === "said" || (marks && marks.length === 0)) {
    transcript = phrase.text;
    source = "manual";
    reviewed = true;
    outcome = "correct";
  } else if (marks) {
    const valid = new Set(
      marks.filter(
        (index) =>
          Number.isInteger(index) && index >= 0 && index < shown.length,
      ),
    );
    const marked = markedTranscript(phrase.text, valid);
    transcript = marked.transcript;
    source = transcript.trim() ? "manual" : "none";
    // An empty result (nothing said) stays unscored, but the marks still count.
    reviewed = Boolean(transcript.trim());
    missed = marked.missed;
    outcome = "missed";
    words = [...valid].sort((a, b) => a - b).map((index) => shown[index]);
  } else if (result.type === "notYet") {
    outcome = "missed";
  } else if (result.type === "aid") {
    kind = "aac";
    aacCompleted = true;
    outcome = "correct";
  } else if (result.type === "browser") {
    const text = result.transcript.trim().slice(0, 1000);
    transcript = text;
    rawTranscript = text || undefined;
    source = text ? "browser" : "none";
  } else if (result.type === "yourWay") {
    if (result.method !== "speak") {
      kind = "aac";
      aacCompleted = true;
    }
    outcome = "correct";
  }

  const record = practiceRecordSchema.parse({
    id: attempt.id,
    patientId: LOCAL_PATIENT_ID,
    createdAt: attempt.createdAt,
    kind,
    language: phrase.lang,
    communicationMethod: attempt.communicationMethod,
    target: phrase.text,
    transcript,
    rawTranscript,
    transcriptSource: source,
    transcriptReviewed: reviewed,
    confirmedMissedWords: missed,
    // The companion does not measure response time; missing is not zero.
    responseSeconds: null,
    recordingSeconds: null,
    fatigueBefore: null,
    fatigueAfter: null,
    effort: null,
    selfUnderstanding: "unknown",
    partnerUnderstanding: "unknown",
    aacCompleted,
    mediaIds: [],
    daypart: daypartAt(new Date(attempt.createdAt)),
    place: attempt.place.slice(0, 80),
    notes: `Speech companion: ${attempt.unitTitle}`,
  });
  return { record, outcome, words };
}
