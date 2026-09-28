import { distribution, summarizeUnderstanding } from "./analysis";
import {
  LOCAL_PATIENT_ID,
  type CommunicationMethod,
  type PracticeRecord,
} from "./model";
import { localDay, type ReportSession } from "./report";

export type ProgressDays = 7 | 28;
export interface ProgressFilters {
  days: ProgressDays;
  language: "all" | "en" | "ta";
  method: "all" | CommunicationMethod;
}

function mean(values: (number | null)[]) {
  const measured = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return {
    n: measured.length,
    value: measured.length
      ? measured.reduce((sum, value) => sum + value, 0) / measured.length
      : null,
  };
}

/** Count local calendar days, never fixed 24-hour intervals (DST may change day length). */
export function practiceCalendar(
  records: PracticeRecord[],
  days: ProgressDays,
  now: Date,
) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const day = localDay(record.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    const day = localDay(date.getTime());
    return { day, at: date.getTime(), count: counts.get(day) ?? 0 };
  });
}

/** Descriptive practice observations only; no readiness/recovery score is inferred. */
export function practiceProgress(
  records: PracticeRecord[],
  filters: ProgressFilters,
  now = new Date(),
) {
  if (!Number.isFinite(now.getTime()))
    throw new Error("Choose a valid progress date.");
  const unique = new Map<string, PracticeRecord>();
  for (const record of records) {
    if (
      record.patientId !== LOCAL_PATIENT_ID ||
      !Number.isFinite(record.createdAt) ||
      record.createdAt < 0 ||
      record.createdAt > now.getTime()
    )
      continue;
    const previous = unique.get(record.id);
    if (!previous || previous.createdAt < record.createdAt)
      unique.set(record.id, record);
  }
  const all = [...unique.values()].sort(
    (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id),
  );
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (filters.days - 1));
  const scoped = all.filter(
    (record) =>
      record.createdAt >= start.getTime() &&
      (filters.language === "all" || record.language === filters.language) &&
      (filters.method === "all" ||
        record.communicationMethod === filters.method),
  );
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const calendar = practiceCalendar(scoped, filters.days, now);
  const aac = scoped.filter(
    (record) => record.kind === "aac" || record.communicationMethod === "aac",
  );
  return {
    records: scoped,
    calendar,
    from: start.getTime(),
    to: now.getTime(),
    // The personal weekly goal is deliberately independent of chart filters.
    weekCount: all.filter((record) => record.createdAt >= monday.getTime())
      .length,
    weekStart: monday.getTime(),
    activeDays: calendar.filter((day) => day.count > 0).length,
    response: distribution(scoped.map((record) => record.responseSeconds)),
    fatigueBefore: mean(scoped.map((record) => record.fatigueBefore)),
    fatigueAfter: mean(scoped.map((record) => record.fatigueAfter)),
    effort: mean(scoped.map((record) => record.effort)),
    understanding: summarizeUnderstanding(
      scoped.map((record) => record.partnerUnderstanding),
    ),
    selfUnderstanding: summarizeUnderstanding(
      scoped.map((record) => record.selfUnderstanding),
    ),
    evidenceRecords: scoped.filter((record) => record.mediaIds.length > 0)
      .length,
    aac: {
      total: aac.length,
      assessed: aac.filter((record) => record.aacCompleted !== null).length,
      completed: aac.filter((record) => record.aacCompleted === true).length,
    },
  };
}

/** Adapt local rows to the same reviewed-word analysis used in the clinician report. */
export function practiceWordSessions(
  records: PracticeRecord[],
): ReportSession[] {
  return records.map((record) => ({
    id: record.id,
    at: record.createdAt,
    kind: record.kind,
    language: record.language,
    method: record.communicationMethod,
    target: record.target,
    transcript: record.transcript,
    transcriptSource: record.transcriptSource,
    transcriptReviewed: record.transcriptReviewed,
    textMatch: null,
    responseSeconds: record.responseSeconds,
    recordingSeconds: record.recordingSeconds,
    fatigueBefore: record.fatigueBefore,
    fatigueAfter: record.fatigueAfter,
    effort: record.effort,
    selfUnderstanding: record.selfUnderstanding,
    partnerUnderstanding: record.partnerUnderstanding,
    aacCompleted: record.aacCompleted,
    missedWords: record.confirmedMissedWords,
    media: record.mediaIds,
    reviews: [],
  }));
}
