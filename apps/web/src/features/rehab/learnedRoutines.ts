import {
  AttemptSchema,
  RoutineItemSchema,
  vocabularyCatalog,
  type Attempt,
  type RoutineItem,
  type TimeBucket,
  type TopicId,
} from "@sollu/shared";
import { timeBucket } from "../../lib/context";

export const ROUTINE_LOOKBACK_DAYS = 90;
export const ROUTINE_SCAN_LIMIT = 2000;
export const ROUTINE_MIN_DATES = 3;
export const CONTEXT_DAYPART_LABELS: Record<TimeBucket, string> = {
  early_morning: "Early morning",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  late_night: "Late night",
};

// Learning is intentionally limited to established, non-clinical everyday concepts.
// An unfamiliar selected sentence is left for manual routine creation, never guessed.
const routineConcepts: Record<string, TopicId> = {
  "daily.water": "drink",
  "daily.tea": "drink",
  "daily.coffee": "drink",
  "daily.milk": "drink",
  "daily.food": "food",
  "daily.rice": "food",
  "daily.rasam": "food",
  "daily.idli": "food",
  "daily.dosa": "food",
  "daily.rest": "rest",
  "daily.sleep": "rest",
  "daily.music": "tv_phone",
  "daily.tv": "tv_phone",
  "daily.outside": "go_out",
  "daily.pray": "prayer",
};
const clinical =
  /\b(?:medicin(?:e|es|al)|medications?|drugs?|tablets?|pills?|dos(?:e|es|age)|prescriptions?|injections?|therapy|treatment|pain|hurt|hospital|doctor|mg|mcg|ml)\b|மருந்து|மாத்திரை|மருந்தளவு|சிகிச்சை|ஊசி|வலி/iu;
const nonAffirmative =
  /\b(?:not|no|never|dont|don't|cannot|can't|maybe|perhaps|might|unsure|uncertain|yesterday|tomorrow|later)\b|வேண்டாம்|இல்லை|வேணாம்|தெரியல|நாளை|நேற்று/iu;
const normalize = (text: string) =>
  text
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?…]+$/u, "");
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export interface LearnedRoutineSuggestion {
  key: string;
  label: string;
  topic: TopicId;
  time: string;
  days: number[];
  place: NonNullable<RoutineItem["place"]>;
  timeBucket: TimeBucket;
  dates: string[];
  count: number;
  example: string;
}

function duplicatesRoutine(
  routine: RoutineItem,
  other: Pick<RoutineItem, "id" | "label" | "time" | "place" | "days">,
) {
  return (
    routine.id === other.id ||
    (normalize(routine.label) === normalize(other.label) &&
      routine.time === other.time &&
      routine.place === other.place &&
      routine.days.some((day) => other.days.includes(day)))
  );
}

/** Local descriptive patterns, not intent predictions. Never consumes practice records,
 * media, diagnoses, raw-fragment meanings, substitutions or unconfirmed selections. */
export function suggestLearnedRoutines(
  attempts: readonly Attempt[],
  existing: readonly RoutineItem[] = [],
  now = Date.now(),
): LearnedRoutineSuggestion[] {
  if (!Number.isFinite(now)) return [];
  const since = now - ROUTINE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const groups = new Map<
    string,
    {
      suggestion: LearnedRoutineSuggestion;
      occurrences: Map<string, { minute: number; day: number }>;
    }
  >();
  const seen = new Set<string>();
  const valid = attempts.flatMap((raw) => {
    const result = AttemptSchema.safeParse(raw);
    return result.success ? [result.data] : [];
  });
  for (const attempt of valid
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, ROUTINE_SCAN_LIMIT)) {
    if (
      seen.has(attempt.id) ||
      attempt.outcome !== "spoken" ||
      attempt.communicationOutcome !== "understood" ||
      attempt.demoClock ||
      attempt.demoCached ||
      !attempt.chosenText?.trim() ||
      !Number.isFinite(attempt.startedAt) ||
      attempt.startedAt < since ||
      !Number.isFinite(attempt.endedAt) ||
      attempt.endedAt! < attempt.startedAt ||
      attempt.endedAt! > now ||
      !["home", "outside", "other"].includes(attempt.place) ||
      clinical.test(attempt.fragmentRaw) ||
      nonAffirmative.test(attempt.fragmentRaw) ||
      attempt.rounds.some(
        (round) =>
          round.source === "mock" ||
          /\b(?:cache|cached|demo)\b/iu.test(round.model ?? "") ||
          round.candidates.some(
            (candidate) =>
              normalize(candidate.text) === normalize(attempt.chosenText!) &&
              (["mock", "cache"].includes(candidate.source ?? "") ||
                candidate.urgency !== "none" ||
                candidate.polarity === "negative" ||
                candidate.polarity === "uncertain"),
          ),
      )
    )
      continue;
    seen.add(attempt.id);
    const entry = vocabularyCatalog.find(
      (item) =>
        routineConcepts[item.id] &&
        item.speechAct === "request" &&
        item.polarity === "positive" &&
        normalize(
          attempt.outputLang === "ta" ? item.taSentence : item.enSentence,
        ) === normalize(attempt.chosenText!),
    );
    if (!entry) continue;
    const date = new Date(attempt.startedAt);
    if (Number.isNaN(date.getTime())) continue;
    // Reject records whose saved daypart no longer matches this device's clock zone.
    if (timeBucket(date.getHours()) !== attempt.timeBucket) continue;
    const minute = date.getHours() * 60 + date.getMinutes();
    const slot = Math.floor(minute / 30);
    const key = `${entry.id}:${attempt.place}:${slot}`;
    const group = groups.get(key) ?? {
      suggestion: {
        key,
        label: entry.en,
        topic: routineConcepts[entry.id]!,
        time: clock(minute),
        days: [],
        place: attempt.place as LearnedRoutineSuggestion["place"],
        timeBucket: attempt.timeBucket,
        dates: [],
        count: 0,
        example: attempt.chosenText,
      },
      occurrences: new Map<string, { minute: number; day: number }>(),
    };
    group.suggestion.count++;
    // Repeated taps on one day cannot make a routine or outweigh other days' times.
    group.occurrences.set(localDate(date), { minute, day: date.getDay() });
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter(({ occurrences }) => occurrences.size >= ROUTINE_MIN_DATES)
    .map(({ suggestion, occurrences }) => {
      const minutes = [...occurrences.values()]
        .map((row) => row.minute)
        .sort((a, b) => a - b);
      return {
        ...suggestion,
        time: clock(minutes[Math.floor(minutes.length / 2)]!),
        dates: [...occurrences.keys()].sort(),
        days: [
          ...new Set([...occurrences.values()].map((row) => row.day)),
        ].sort(),
      };
    })
    .filter(
      (suggestion) =>
        !existing.some((routine) =>
          duplicatesRoutine(routine, {
            ...suggestion,
            id: `learned:${suggestion.key}`,
          }),
        ),
    )
    .sort(
      (a, b) =>
        b.dates.length - a.dates.length ||
        b.count - a.count ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 6);
}

export function confirmLearnedRoutine(
  suggestion: LearnedRoutineSuggestion,
  draft: Pick<RoutineItem, "label" | "time" | "days" | "place">,
  reviewed: boolean,
  existing: readonly RoutineItem[],
): RoutineItem {
  if (!reviewed) throw new Error("Review this routine together before saving.");
  if (existing.length >= 32)
    throw new Error("Remove or edit a saved routine before adding another.");
  if (clinical.test(draft.label) || nonAffirmative.test(draft.label))
    throw new Error(
      "Use a non-clinical everyday activity label for this routine.",
    );
  const result = RoutineItemSchema.safeParse({
    id: `learned:${suggestion.key}`,
    ...draft,
    days: [...new Set(draft.days)].sort((a, b) => a - b),
    topic: suggestion.topic,
    source: "learned",
    confirmed: true,
    isSample: false,
  });
  if (!result.success)
    throw new Error("Enter a label, a valid time and at least one weekday.");
  if (existing.some((routine) => duplicatesRoutine(routine, result.data)))
    throw new Error(
      "This routine is already saved. Edit it in Weekly routines.",
    );
  return result.data;
}
