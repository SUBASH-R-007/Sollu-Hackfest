import { z } from "zod";
import type { Attempt, WordSubstitution } from "@sollu/shared";
import type {
  PracticeRecord,
  RehabProfile,
  RehabPlan,
  ReviewRecord,
} from "./model";
import { scoreTranscript, speechWords } from "./analysis";
import { REPORT_INTERPRETATION } from "./reportScope";
export { REPORT_INTERPRETATION } from "./reportScope";
const ReportInterpretationSchema = z
  .object({
    title: z.literal(REPORT_INTERPRETATION.title),
    purpose: z.literal(REPORT_INTERPRETATION.purpose),
    validation: z.literal(REPORT_INTERPRETATION.validation),
    scoring: z.literal(REPORT_INTERPRETATION.scoring),
    timing: z.literal(REPORT_INTERPRETATION.timing),
    understanding: z.literal(REPORT_INTERPRETATION.understanding),
    reviewerAuthority: z.literal(REPORT_INTERPRETATION.reviewerAuthority),
    comparability: z.literal(REPORT_INTERPRETATION.comparability),
  })
  // Older v1 snapshots did not carry scope metadata. Never infer validation.
  .default(REPORT_INTERPRETATION);

const boundedText = z.string().max(3000);
const timestamp = z.number().finite().min(0).max(8640000000000000);
const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");
const measurement = z.number().finite().min(0).max(86400).nullable();
const Understanding = z.enum(["yes", "partly", "no", "unknown"]);
const method = z.enum([
  "natural_speech",
  "aac",
  "electrolarynx",
  "tep",
  "esophageal",
  "mixed",
]);
const ReportSessionSchema = z.object({
  id: z.string().min(1).max(120),
  at: timestamp,
  kind: z.enum(["word", "sentence", "script", "aac"]),
  language: z.enum(["en", "ta"]),
  method,
  target: z.string().max(500).optional(),
  transcript: z.string().max(1000).optional(),
  notes: boundedText.optional(),
  rawTranscript: z.string().max(1000).optional(),
  transcriptSource: z.enum(["none", "manual", "browser"]),
  textMatch: z.number().min(0).max(100).nullable(),
  transcriptReviewed: z.boolean(),
  responseSeconds: measurement,
  recordingSeconds: measurement,
  fatigueBefore: z.number().min(0).max(10).nullable(),
  fatigueAfter: z.number().min(0).max(10).nullable(),
  effort: z.number().min(0).max(10).nullable(),
  selfUnderstanding: Understanding,
  partnerUnderstanding: Understanding,
  aacCompleted: z.boolean().nullable(),
  missedWords: z.array(z.string().max(120)).max(200),
  media: z.array(z.string().max(120)).max(5),
  reviews: z
    .array(
      z.object({
        at: timestamp,
        understanding: Understanding,
        reviewer: z.string().max(120).optional(),
        notes: boundedText.optional(),
      }),
    )
    .max(50),
});
const CommunicationRowSchema = z.object({
  at: timestamp,
  spoken: z.boolean(),
  outcome: z.enum([
    "intended",
    "understood",
    "needs_repair",
    "declined",
    "unconfirmed",
  ]),
  taps: z.number().finite().min(0).max(100000),
  seconds: measurement,
  excluded: z.boolean(),
});
export const ReportSchema = z.object({
  format: z.literal("sollu-rehabilitation-report"),
  version: z.literal(1),
  scoringVersion: z.literal("text-match-v1"),
  interpretation: ReportInterpretationSchema,
  createdAt: timestamp,
  participant: z.string().trim().min(1).max(80),
  from: calendarDay,
  to: calendarDay,
  rangeStart: timestamp,
  rangeEnd: timestamp,
  contentIncluded: z.boolean(),
  profile: z.object({
    condition: z.enum([
      "aphasia",
      "dysarthria",
      "als",
      "laryngectomy",
      "parkinsons",
      "other",
    ]),
    language: z.enum(["en", "ta"]),
    method,
    goals: z.array(boundedText).max(20),
    instructions: boundedText.optional(),
    weeklyTarget: z.number().int().min(1).max(100),
    practiceMinutes: z.number().min(1).max(60),
    fatigueLimit: z.number().min(0).max(10),
    exerciseIds: z.array(z.string().max(120)).max(100),
  }),
  sessions: z.array(ReportSessionSchema).max(3000),
  communication: z.array(CommunicationRowSchema).max(10000),
  corrections: z
    .array(
      z.object({
        heard: z.string().max(120),
        means: z.string().max(120),
        language: z.string().max(8),
      }),
    )
    .max(500),
  evidenceManifest: z
    .array(
      z.object({
        practiceId: z.string().max(120),
        mediaId: z.string().max(120),
      }),
    )
    .max(3000),
});
export type TherapyReport = z.infer<typeof ReportSchema>;
export type ReportSession = TherapyReport["sessions"][number];
export const MAX_REPORT_BYTES = 2 * 1024 * 1024;

export function parseReport(text: string): TherapyReport {
  if (new TextEncoder().encode(text).byteLength > MAX_REPORT_BYTES)
    throw new Error("Report exceeds the 2 MB limit.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid Sollu rehabilitation JSON report.");
  }
  const parsed = ReportSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("Report format or measurement values are invalid.");
  const result = parsed.data;
  if (result.from > result.to) throw new Error("Report dates are reversed.");
  if (
    new Date(result.to).getTime() - new Date(result.from).getTime() >
    366 * 86400000
  )
    throw new Error("Use a report covering no more than 366 days.");
  const startUtc = new Date(`${result.from}T00:00:00Z`).getTime(),
    endUtc = new Date(`${result.to}T00:00:00Z`).getTime() + 86400000;
  if (
    result.rangeStart >= result.rangeEnd ||
    Math.abs(result.rangeStart - startUtc) > 14 * 3600000 ||
    Math.abs(result.rangeEnd - endUtc) > 14 * 3600000
  )
    throw new Error("Report time boundaries do not match its dates.");
  if (
    [
      ...result.sessions.map((s) => s.at),
      ...result.communication.map((a) => a.at),
    ].some((at) => at < result.rangeStart || at >= result.rangeEnd)
  )
    throw new Error("Report contains observations outside its date range.");
  if (
    !result.contentIncluded &&
    (result.profile.goals.length ||
      result.profile.instructions !== undefined ||
      result.corrections.length ||
      result.sessions.some(
        (s) =>
          s.target !== undefined ||
          s.transcript !== undefined ||
          s.rawTranscript !== undefined ||
          s.notes !== undefined ||
          s.missedWords.length ||
          s.reviews.some(
            (r) => r.reviewer !== undefined || r.notes !== undefined,
          ),
      ))
  )
    throw new Error("Report claims to omit personal text but contains it.");
  if (
    result.sessions.some(
      (s) =>
        s.textMatch !== null &&
        (!s.transcriptReviewed ||
          s.transcriptSource === "none" ||
          s.kind === "aac" ||
          s.method === "aac"),
    )
  )
    throw new Error(
      "Report assigns a text score to an unreviewed transcript or AAC task.",
    );
  if (new Set(result.sessions.map((s) => s.id)).size !== result.sessions.length)
    throw new Error("Report has duplicate practice records.");
  if (
    result.contentIncluded &&
    result.sessions.some((s) => {
      if (s.target === undefined || s.transcript === undefined) return true;
      const score =
        s.transcriptReviewed &&
        s.transcriptSource !== "none" &&
        s.kind !== "aac" &&
        s.method !== "aac"
          ? scoreTranscript(s.target, s.transcript).matchPct
          : null;
      return score !== s.textMatch;
    })
  )
    throw new Error(
      "Reported text scores do not match the included transcripts.",
    );
  return result;
}

export const localDay = (at: number) => {
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const inDateRange = (at: number, from: string, to: string) =>
  localDay(at) >= from && localDay(at) <= to;
/**
 * Converts a communication attempt's time-to-speech into report seconds.
 * Missing, non-finite, negative or implausible (> 24 h) times stay missing,
 * never zero, so one bad attempt cannot break the report or skew medians.
 */
export const attemptSeconds = (ms: number | undefined): number | null =>
  typeof ms === "number" && Number.isFinite(ms) && ms >= 0 && ms <= 86_400_000
    ? ms / 1000
    : null;

export function buildReport(input: {
  profile: RehabProfile;
  plan: RehabPlan;
  sessions: PracticeRecord[];
  reviews: ReviewRecord[];
  attempts: Attempt[];
  corrections: WordSubstitution[];
  participant: string;
  from: string;
  to: string;
  includeContent: boolean;
}): TherapyReport {
  const { profile, plan, includeContent } = input;
  const sessions: ReportSession[] = input.sessions
    .filter((s) => inDateRange(s.createdAt, input.from, input.to))
    .map((s) => ({
      id: s.id,
      at: s.createdAt,
      kind: s.kind,
      language: s.language,
      method: s.communicationMethod,
      ...(includeContent
        ? {
            target: s.target,
            transcript: s.transcript,
            rawTranscript: s.rawTranscript,
            notes: s.notes,
          }
        : {}),
      transcriptSource: s.transcriptSource,
      textMatch:
        s.kind !== "aac" &&
        s.communicationMethod !== "aac" &&
        s.transcriptSource !== "none" &&
        s.transcriptReviewed &&
        s.transcript.trim()
          ? scoreTranscript(s.target, s.transcript).matchPct
          : null,
      transcriptReviewed: s.transcriptReviewed,
      responseSeconds: s.responseSeconds,
      recordingSeconds: s.recordingSeconds,
      fatigueBefore: s.fatigueBefore,
      fatigueAfter: s.fatigueAfter,
      effort: s.effort,
      selfUnderstanding: s.selfUnderstanding,
      partnerUnderstanding: s.partnerUnderstanding,
      aacCompleted: s.aacCompleted,
      missedWords: includeContent
        ? [
            ...new Set(
              s.confirmedMissedWords
                .map((word) => speechWords(word))
                .filter(
                  (words) =>
                    words.length === 1 &&
                    speechWords(s.target).includes(words[0]),
                )
                .map((words) => words[0]),
            ),
          ]
        : [],
      media: s.mediaIds,
      reviews: input.reviews
        .filter((r) => r.practiceId === s.id)
        .map((r) => ({
          at: r.reviewedAt,
          understanding: r.understanding,
          ...(includeContent ? { reviewer: r.reviewer, notes: r.notes } : {}),
        })),
    }));
  const report: TherapyReport = {
    format: "sollu-rehabilitation-report",
    version: 1,
    scoringVersion: "text-match-v1",
    interpretation: REPORT_INTERPRETATION,
    createdAt: Date.now(),
    participant: input.participant.trim() || "participant-001",
    from: input.from,
    to: input.to,
    contentIncluded: includeContent,
    rangeStart: new Date(`${input.from}T00:00:00`).getTime(),
    rangeEnd: (() => {
      const date = new Date(`${input.to}T00:00:00`);
      date.setDate(date.getDate() + 1);
      return date.getTime();
    })(),
    profile: {
      condition: profile.condition,
      language: profile.language,
      method: profile.communicationMethod,
      goals: includeContent ? profile.goals : [],
      ...(includeContent
        ? { instructions: profile.clinicianInstructions }
        : {}),
      weeklyTarget: profile.weeklyTarget,
      practiceMinutes: profile.practiceMinutes,
      fatigueLimit: profile.fatigueLimit,
      exerciseIds: plan.exerciseIds,
    },
    sessions,
    communication: input.attempts
      .filter((a) => inDateRange(a.startedAt, input.from, input.to))
      .map((a) => ({
        at: a.startedAt,
        spoken: a.outcome === "spoken",
        outcome: a.communicationOutcome ?? "unconfirmed",
        taps: a.taps,
        seconds: attemptSeconds(a.timeToSpeechMs),
        excluded: a.demoClock || a.demoCached,
      })),
    corrections: includeContent
      ? input.corrections
          .filter((c) => c.confirmed)
          .map((c) => ({
            heard: c.heard,
            means: c.means,
            language: c.lang ?? "unspecified",
          }))
      : [],
    evidenceManifest: sessions.flatMap((s) =>
      s.media.map((mediaId) => ({ practiceId: s.id, mediaId })),
    ),
  };
  return ReportSchema.parse(report);
}

export function describe(values: (number | null)[]) {
  const sorted = values
    .filter((v): v is number => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  const percentile = (p: number) => {
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * p;
    const low = Math.floor(position),
      high = Math.ceil(position);
    return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
  };
  return {
    n: sorted.length,
    median: percentile(0.5),
    q1: percentile(0.25),
    q3: percentile(0.75),
  };
}

export function proportion(successes: number, observed: number) {
  if (!observed) return { rate: null, ci95: null };
  const p = successes / observed,
    z = 1.96,
    denominator = 1 + (z * z) / observed;
  const centre = (p + (z * z) / (2 * observed)) / denominator;
  const spread =
    (z *
      Math.sqrt(
        (p * (1 - p)) / observed + (z * z) / (4 * observed * observed),
      )) /
    denominator;
  return {
    rate: p,
    ci95: [Math.max(0, centre - spread), Math.min(1, centre + spread)] as [
      number,
      number,
    ],
  };
}

export function communicationSummary(rows: TherapyReport["communication"]) {
  const eligible = rows.filter((r) => !r.excluded);
  const assessed = eligible.filter(
    (r) => r.outcome === "understood" || r.outcome === "needs_repair",
  );
  const understood = assessed.filter((r) => r.outcome === "understood").length;
  const spoken = eligible.filter((r) => r.spoken);
  return {
    total: rows.length,
    eligible: eligible.length,
    excluded: rows.length - eligible.length,
    assessed: assessed.length,
    understood,
    unassessed: eligible.length - assessed.length,
    ...proportion(understood, assessed.length),
    spoken: spoken.length,
    taps: describe(spoken.map((r) => r.taps)),
    seconds: describe(spoken.map((r) => r.seconds)),
  };
}

export function weeklyReport(report: TherapyReport) {
  const groups = new Map<string, ReportSession[]>();
  const start = new Date(`${report.from}T12:00:00`),
    end = new Date(`${report.to}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  for (
    let i = 0;
    start <= end && i < 54;
    i++, start.setDate(start.getDate() + 7)
  )
    groups.set(localDay(start.getTime()), []);
  for (const session of report.sessions) {
    const date = new Date(session.at);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const week = localDay(date.getTime());
    // Sessions from another device time zone can fall outside the expected
    // local weeks; give them their own bucket so totals equal session count.
    const rows = groups.get(week);
    if (rows) rows.push(session);
    else groups.set(week, [session]);
  }
  return [...groups]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([week, rows]) => ({
      week,
      rows,
      count: rows.length,
      activeDays: new Set(rows.map((s) => localDay(s.at))).size,
      textMatch: describe(rows.map((s) => s.textMatch)),
      response: describe(rows.map((s) => s.responseSeconds)),
      fatigue: describe(
        rows
          .filter((s) => s.fatigueBefore !== null && s.fatigueAfter !== null)
          .map((s) => s.fatigueAfter! - s.fatigueBefore!),
      ),
    }));
}

export function reportCsv(report: TherapyReport): string {
  const cell = (value: unknown) =>
    `"${String(value ?? "")
      .replace(/^[\s]*[=+@-]/u, " '$&")
      .replaceAll('"', '""')}"`;
  const header = [
    "record_type",
    "participant",
    "practice_id",
    "date",
    "kind",
    "language",
    "method",
    "scoring_version",
    "transcript_source",
    "transcript_reviewed",
    "text_match_pct_not_clinical",
    "response_seconds",
    "recording_seconds",
    "fatigue_before",
    "fatigue_after",
    "effort",
    "self_understanding",
    "partner_understanding",
    "aac_completed",
    "local_review_count",
    "media_count",
    "target",
    "transcript",
    "raw_recognition",
    "confirmed_missed_words",
    "notes",
    "report_title",
    "intended_use",
    "validation_limitations",
    "score_limitations",
    "timing_definitions",
    "understanding_denominator",
    "reviewer_authority",
    "comparison_limitations",
  ];
  const scope = Object.values(REPORT_INTERPRETATION);
  const rows = report.sessions.map((s) => [
    "practice",
    report.participant,
    s.id,
    new Date(s.at).toISOString(),
    s.kind,
    s.language,
    s.method,
    report.scoringVersion,
    s.transcriptSource,
    s.transcriptReviewed,
    s.textMatch,
    s.responseSeconds,
    s.recordingSeconds,
    s.fatigueBefore,
    s.fatigueAfter,
    s.effort,
    s.selfUnderstanding,
    s.partnerUnderstanding,
    s.aacCompleted,
    s.reviews.length,
    s.media.length,
    s.target,
    s.transcript,
    s.rawTranscript,
    s.missedWords.join(" | "),
    s.notes,
    ...scope.map(() => ""),
  ]);
  // Keep the limitations in an empty export too, without inventing practice.
  const metadata = [
    "report_metadata",
    ...Array.from({ length: header.length - scope.length - 1 }, () => ""),
    ...scope,
  ];
  return (
    "\uFEFF" +
    [header, metadata, ...rows]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
