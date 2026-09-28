import type {
  CommunicationMethod,
  PracticeKind,
  PracticeRecord,
  Understanding,
} from "./model";

export interface WordAlignment {
  kind: "match" | "omission" | "substitution" | "insertion";
  expected?: string;
  heard?: string;
}
export interface TranscriptScore {
  version: "text-match-v1";
  matchPct: number | null;
  targetWords: number;
  transcriptWords: number;
  matched: number;
  omissions: string[];
  substitutions: { expected: string; heard: string }[];
  insertions: string[];
  editDistance: number | null;
  alignment: WordAlignment[];
}
/** Preserve Unicode combining marks (including Tamil vowel signs); punctuation is not a speech error. */
export function speechWords(value: string): string[] {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replaceAll("’", "'")
      .match(/[\p{L}\p{M}\p{N}]+(?:'[\p{L}\p{M}\p{N}]+)*/gu) ?? []
  );
}

/** Token edit similarity only. It cannot measure intelligibility, articulation, diagnosis or recovery. */
export function scoreTranscript(
  target: string,
  transcript: string,
): TranscriptScore {
  if (target.length > 500 || transcript.length > 1000)
    throw new Error(
      "Use a target of at most 500 characters and a transcript of at most 1,000 characters.",
    );
  const expected = speechWords(target),
    heard = speechWords(transcript);
  const result: TranscriptScore = {
    version: "text-match-v1",
    matchPct: null,
    targetWords: expected.length,
    transcriptWords: heard.length,
    matched: 0,
    omissions: [],
    substitutions: [],
    insertions: [],
    editDistance: null,
    alignment: [],
  };
  // Silence, missing recognition and no reference are unknown, not clinical failures or zero scores.
  if (!expected.length || !heard.length) return result;
  const matrix = Array.from(
    { length: expected.length + 1 },
    () => new Uint16Array(heard.length + 1),
  );
  for (let i = 0; i <= expected.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= heard.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= expected.length; i++) {
    for (let j = 1; j <= heard.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + Number(expected[i - 1] !== heard[j - 1]),
      );
    }
  }
  let i = expected.length,
    j = heard.length;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      expected[i - 1] === heard[j - 1] &&
      matrix[i][j] === matrix[i - 1][j - 1]
    ) {
      result.alignment.push({
        kind: "match",
        expected: expected[--i],
        heard: heard[--j],
      });
      result.matched++;
    } else if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + 1) {
      result.alignment.push({
        kind: "substitution",
        expected: expected[--i],
        heard: heard[--j],
      });
    } else if (i > 0 && matrix[i][j] === matrix[i - 1][j] + 1) {
      result.alignment.push({ kind: "omission", expected: expected[--i] });
    } else {
      result.alignment.push({ kind: "insertion", heard: heard[--j] });
    }
  }
  result.alignment.reverse();
  for (const token of result.alignment) {
    if (token.kind === "omission") result.omissions.push(token.expected!);
    if (token.kind === "substitution")
      result.substitutions.push({
        expected: token.expected!,
        heard: token.heard!,
      });
    if (token.kind === "insertion") result.insertions.push(token.heard!);
  }
  result.editDistance = matrix[expected.length][heard.length];
  result.matchPct =
    Math.round(Math.max(0, 1 - result.editDistance / expected.length) * 1000) /
    10;
  return result;
}

export interface Distribution {
  n: number;
  median: number | null;
  q1: number | null;
  q3: number | null;
}
/** Linear-interpolated sample quantiles; missing/non-finite measures never turn into zero. */
export function distribution(
  values: (number | null | undefined)[],
): Distribution {
  const sorted = values
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    )
    .sort((a, b) => a - b);
  const quantile = (p: number): number | null => {
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * p,
      lower = Math.floor(position),
      fraction = position - lower;
    return (
      sorted[lower] +
      (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) *
        fraction
    );
  };
  return {
    n: sorted.length,
    median: quantile(0.5),
    q1: quantile(0.25),
    q3: quantile(0.75),
  };
}
export function wilsonInterval(
  successes: number,
  total: number,
): [number, number] | null {
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(successes) ||
    total <= 0 ||
    successes < 0 ||
    successes > total
  )
    return null;
  const z = 1.959963984540054,
    p = successes / total,
    denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const half =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}
export interface UnderstandingSummary {
  yes: number;
  partly: number;
  no: number;
  unknown: number;
  known: number;
  rate: number | null;
  ci95: [number, number] | null;
}
/** Strict yes / all assessed; partly is reported separately and remains in the denominator. */
export function summarizeUnderstanding(
  values: Understanding[],
): UnderstandingSummary {
  const counts = { yes: 0, partly: 0, no: 0, unknown: 0 };
  for (const value of values) counts[value]++;
  const known = counts.yes + counts.partly + counts.no;
  return {
    ...counts,
    known,
    rate: known ? counts.yes / known : null,
    ci95: wilsonInterval(counts.yes, known),
  };
}
export interface MissedWord {
  word: string;
  count: number;
  attempts: number;
}
export interface WeeklyPractice {
  weekStart: number;
  weekEnd: number;
  label: string;
  attempts: number;
  activeDays: number;
  textMatch: Distribution;
  responseSeconds: Distribution;
  understanding: UnderstandingSummary;
}
export interface PracticeGroup {
  key: string;
  kind: PracticeKind;
  language: "en" | "ta";
  communicationMethod: CommunicationMethod;
  count: number;
  textMatch: Distribution;
  responseSeconds: Distribution;
}
export interface PracticeSummary {
  total: number;
  activeDays: number;
  recordings: number;
  reviewedTranscripts: number;
  textMatch: Distribution;
  responseSeconds: Distribution;
  recordingSeconds: Distribution;
  fatigueBefore: Distribution;
  fatigueAfter: Distribution;
  effort: Distribution;
  selfUnderstanding: UnderstandingSummary;
  partnerUnderstanding: UnderstandingSummary;
  aac: { completed: number; assessed: number; rate: number | null };
  missedWords: MissedWord[];
  weekly: WeeklyPractice[];
  groups: PracticeGroup[];
}
function deduplicate(records: PracticeRecord[]): PracticeRecord[] {
  const byId = new Map<string, PracticeRecord>();
  for (const record of records) {
    const old = byId.get(record.id);
    if (!old || record.createdAt > old.createdAt) byId.set(record.id, record);
  }
  return [...byId.values()];
}
function localDay(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function activeDays(records: PracticeRecord[]) {
  return new Set(records.map((record) => localDay(record.createdAt))).size;
}
function reviewedScore(record: PracticeRecord): number | null {
  return record.transcriptReviewed &&
    record.transcriptSource !== "none" &&
    record.kind !== "aac"
    ? scoreTranscript(record.target, record.transcript).matchPct
    : null;
}
function confirmedMisses(records: PracticeRecord[]): MissedWord[] {
  const words = new Map<string, number>();
  for (const record of records) {
    const targetWords = new Set(speechWords(record.target));
    const distinct = new Set(
      record.confirmedMissedWords
        .map((word) => speechWords(word))
        .filter((tokens) => tokens.length === 1 && targetWords.has(tokens[0]))
        .map((tokens) => tokens[0]),
    );
    for (const word of distinct) words.set(word, (words.get(word) ?? 0) + 1);
  }
  return [...words]
    .map(([word, count]) => ({ word, count, attempts: count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

export function summarizePractice(
  records: PracticeRecord[],
  options: { now?: Date; weeks?: number } = {},
): PracticeSummary {
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime()))
    throw new Error("Choose a valid report date.");
  const unique = deduplicate(records).filter(
    (record) =>
      Number.isFinite(record.createdAt) &&
      record.createdAt >= 0 &&
      record.createdAt <= now.getTime(),
  );
  const weekCount = Math.max(
    1,
    Math.min(52, Math.trunc(options.weeks ?? 8) || 8),
  );
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekly: WeeklyPractice[] = [];
  for (let offset = weekCount - 1; offset >= 0; offset--) {
    const start = new Date(monday);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const week = unique.filter(
      (record) =>
        record.createdAt >= start.getTime() && record.createdAt < end.getTime(),
    );
    weekly.push({
      weekStart: start.getTime(),
      weekEnd: end.getTime(),
      label: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
      attempts: week.length,
      activeDays: activeDays(week),
      textMatch: distribution(week.map(reviewedScore)),
      responseSeconds: distribution(
        week.map((record) => record.responseSeconds),
      ),
      understanding: summarizeUnderstanding(
        week.map((record) => record.partnerUnderstanding),
      ),
    });
  }
  const groupMap = new Map<string, PracticeRecord[]>();
  for (const record of unique) {
    const key = `${record.kind}:${record.language}:${record.communicationMethod}`;
    groupMap.set(key, [...(groupMap.get(key) ?? []), record]);
  }
  const groups: PracticeGroup[] = [...groupMap].map(([key, group]) => ({
    key,
    kind: group[0].kind,
    language: group[0].language,
    communicationMethod: group[0].communicationMethod,
    count: group.length,
    textMatch: distribution(group.map(reviewedScore)),
    responseSeconds: distribution(
      group.map((record) => record.responseSeconds),
    ),
  }));
  const aacRecords = unique.filter(
    (record) => record.kind === "aac" && record.aacCompleted !== null,
  );
  const aacCompleted = aacRecords.filter(
    (record) => record.aacCompleted === true,
  ).length;
  return {
    total: unique.length,
    activeDays: activeDays(unique),
    recordings: unique.reduce(
      (sum, record) => sum + new Set(record.mediaIds).size,
      0,
    ),
    reviewedTranscripts: unique.filter(
      (record) =>
        record.transcriptReviewed && record.transcript.trim().length > 0,
    ).length,
    textMatch: distribution(unique.map(reviewedScore)),
    responseSeconds: distribution(
      unique.map((record) => record.responseSeconds),
    ),
    recordingSeconds: distribution(
      unique.map((record) => record.recordingSeconds),
    ),
    fatigueBefore: distribution(unique.map((record) => record.fatigueBefore)),
    fatigueAfter: distribution(unique.map((record) => record.fatigueAfter)),
    effort: distribution(unique.map((record) => record.effort)),
    selfUnderstanding: summarizeUnderstanding(
      unique.map((record) => record.selfUnderstanding),
    ),
    partnerUnderstanding: summarizeUnderstanding(
      unique.map((record) => record.partnerUnderstanding),
    ),
    aac: {
      completed: aacCompleted,
      assessed: aacRecords.length,
      rate: aacRecords.length ? aacCompleted / aacRecords.length : null,
    },
    missedWords: confirmedMisses(unique),
    weekly,
    groups,
  };
}

/** Local suggestions require a person's confirmation; this does not retrain speech recognition or any model. */
export function suggestPracticeTargets(
  records: PracticeRecord[],
  limit = 6,
): { target: string; reason: string; count: number }[] {
  return confirmedMisses(deduplicate(records))
    .slice(0, Math.max(0, Math.min(20, Math.trunc(limit) || 0)))
    .map(({ word, count }) => ({
      target: word,
      reason: `Marked for practice in ${count} ${count === 1 ? "attempt" : "attempts"}.`,
      count,
    }));
}
