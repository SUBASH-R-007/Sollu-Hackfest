import type { Attempt } from "@sollu/shared";
import {
  LOCAL_PATIENT_ID,
  type PracticeRecord,
  type ReviewRecord,
} from "./model";
import { speechWords } from "./analysis";
import { communicationSummary, describe, localDay } from "./report";

/** Calendar-day windows use the device's local clock, including today so far. */
export function clinicianWindow(days: 7 | 28, now: number) {
  if (
    ![7, 28].includes(days) ||
    !Number.isFinite(now) ||
    !Number.isFinite(new Date(now).getTime())
  )
    throw new Error("Choose a valid local date and a 7- or 28-day window.");
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return { from: start.getTime(), to: now };
}

export function clinicianSummary(input: {
  sessions: PracticeRecord[];
  reviews: ReviewRecord[];
  attempts: Attempt[];
  availableMediaIds: string[];
  days: 7 | 28;
  now: number;
}) {
  const window = clinicianWindow(input.days, input.now);
  const inWindow = (at: number) => at >= window.from && at <= window.to;
  const localSessions = input.sessions.filter(
    (row) => row.patientId === LOCAL_PATIENT_ID,
  );
  const sessions = localSessions.filter((row) => inWindow(row.createdAt));
  const reviews = input.reviews.filter(
    (row) => row.patientId === LOCAL_PATIENT_ID && row.reviewedAt <= input.now,
  );
  const reviewedIds = new Set(reviews.map((row) => row.practiceId));
  const availableIds = new Set(input.availableMediaIds);
  const referencedIds = new Set(sessions.flatMap((row) => row.mediaIds));
  const speech = sessions.filter(
    (row) => row.kind !== "aac" && row.communicationMethod !== "aac",
  );
  const scoreable = speech.filter(
    (row) =>
      row.transcriptSource !== "none" &&
      row.transcriptReviewed &&
      speechWords(row.target).length > 0 &&
      speechWords(row.transcript).length > 0,
  );
  const pending = sessions
    .map((record) => ({
      record,
      needsReview: !reviewedIds.has(record.id),
      needsTranscriptReview:
        record.kind !== "aac" &&
        record.communicationMethod !== "aac" &&
        Boolean(record.transcript.trim()) &&
        !record.transcriptReviewed,
      availableClips: record.mediaIds.filter((id) => availableIds.has(id))
        .length,
    }))
    .filter((row) => row.needsReview || row.needsTranscriptReview)
    .sort((a, b) => a.record.createdAt - b.record.createdAt);
  const communication = communicationSummary(
    input.attempts
      .filter((row) => inWindow(row.startedAt))
      .map((row) => ({
        at: row.startedAt,
        spoken: row.outcome === "spoken",
        outcome: row.communicationOutcome ?? "unconfirmed",
        taps: row.taps,
        seconds:
          row.timeToSpeechMs === undefined ? null : row.timeToSpeechMs / 1000,
        excluded: row.demoClock || row.demoCached,
      })),
  );
  const weekStart = new Date(input.now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return {
    ...window,
    sessions,
    activeDays: new Set(sessions.map((row) => localDay(row.createdAt))).size,
    speechRecords: speech.length,
    scoreableTranscripts: scoreable.length,
    reviewedRecords: sessions.filter((row) => reviewedIds.has(row.id)).length,
    pending,
    pendingReview: pending.filter((row) => row.needsReview).length,
    pendingTranscripts: pending.filter((row) => row.needsTranscriptReview)
      .length,
    recordsWithEvidence: sessions.filter((row) =>
      row.mediaIds.some((id) => availableIds.has(id)),
    ).length,
    availableClips: [...referencedIds].filter((id) => availableIds.has(id))
      .length,
    missingClips: [...referencedIds].filter((id) => !availableIds.has(id))
      .length,
    response: describe(sessions.map((row) => row.responseSeconds)),
    partnerChecked: sessions.filter(
      (row) => row.partnerUnderstanding !== "unknown",
    ).length,
    partnerUnderstood: sessions.filter(
      (row) => row.partnerUnderstanding === "yes",
    ).length,
    fatiguePairs: sessions.filter(
      (row) => row.fatigueBefore !== null && row.fatigueAfter !== null,
    ).length,
    communication,
    thisWeek: localSessions.filter(
      (row) =>
        row.createdAt >= weekStart.getTime() && row.createdAt <= input.now,
    ).length,
    weekFrom: weekStart.getTime(),
  };
}
