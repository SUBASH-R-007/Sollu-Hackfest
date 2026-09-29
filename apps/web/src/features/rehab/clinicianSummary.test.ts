import { describe, expect, it } from "vitest";
import { AttemptSchema, type Attempt } from "@sollu/shared";
import { clinicianSummary, clinicianWindow } from "./clinicianSummary";
import type { PracticeRecord, ReviewRecord } from "./model";

const now = new Date(2026, 8, 30, 12).getTime();
const practice = (patch: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: "p1",
  patientId: "local-patient",
  createdAt: now,
  kind: "sentence",
  language: "en",
  communicationMethod: "natural_speech",
  target: "I need water",
  transcript: "I need",
  transcriptSource: "manual",
  transcriptReviewed: true,
  confirmedMissedWords: [],
  responseSeconds: null,
  recordingSeconds: null,
  fatigueBefore: null,
  fatigueAfter: null,
  effort: null,
  selfUnderstanding: "unknown",
  partnerUnderstanding: "unknown",
  aacCompleted: null,
  mediaIds: [],
  daypart: "afternoon",
  place: "home",
  notes: "",
  ...patch,
});
const review = (patch: Partial<ReviewRecord> = {}): ReviewRecord => ({
  id: "r1",
  patientId: "local-patient",
  practiceId: "p1",
  reviewer: "Reviewer",
  reviewedAt: now,
  understanding: "unknown",
  notes: "",
  ...patch,
});
const attempt = (patch: Partial<Attempt> = {}): Attempt =>
  AttemptSchema.parse({
    id: "a1",
    startedAt: now,
    modality: "text",
    fragmentRaw: "water",
    outputLang: "en",
    place: "home",
    timeBucket: "afternoon",
    demoClock: false,
    rounds: [],
    taps: 2,
    offline: true,
    demoCached: false,
    outcome: "spoken",
    ...patch,
  });
const summary = (patch: Partial<Parameters<typeof clinicianSummary>[0]> = {}) =>
  clinicianSummary({
    sessions: [],
    reviews: [],
    attempts: [],
    availableMediaIds: [],
    days: 7,
    now,
    ...patch,
  });

describe("clinician overview observations", () => {
  it("keeps absent data unknown, with no invented success or response score", () => {
    const result = summary();
    expect(result.sessions).toEqual([]);
    expect(result.response.median).toBeNull();
    expect(result.communication.rate).toBeNull();
    expect(result.communication.seconds.median).toBeNull();
    expect(result.thisWeek).toBe(0);
    expect(result.pending).toEqual([]);
  });

  it("uses inclusive local calendar days but excludes future and foreign records", () => {
    const from = new Date(2026, 8, 24).getTime();
    expect(clinicianWindow(7, now)).toEqual({ from, to: now });
    const result = summary({
      sessions: [
        practice({ id: "at-start", createdAt: from }),
        practice({ id: "before-start", createdAt: from - 1 }),
        practice({ id: "future", createdAt: now + 1 }),
        practice({ id: "foreign", patientId: "imported" }),
        practice(),
      ],
    });
    expect(result.sessions.map((row) => row.id)).toEqual(["at-start", "p1"]);
    expect(result.activeDays).toBe(2);
    expect(result.thisWeek).toBe(1);
    expect(() => clinicianWindow(7, NaN)).toThrow("valid local date");
    expect(() => clinicianWindow(7, Infinity)).toThrow("valid local date");
  });

  it("expands to 28 days and counts participation this Monday-based week independently", () => {
    const result = summary({
      days: 28,
      sessions: [
        practice({ id: "old", createdAt: new Date(2026, 8, 10).getTime() }),
        practice({ id: "sunday", createdAt: new Date(2026, 8, 27).getTime() }),
        practice({
          id: "monday",
          createdAt: new Date(2026, 8, 28).getTime(),
          kind: "aac",
          communicationMethod: "aac",
          language: "ta",
        }),
        practice(),
      ],
    });
    expect(result.sessions).toHaveLength(4);
    expect(result.thisWeek).toBe(2);
    expect(result.weekFrom).toBe(new Date(2026, 8, 28).getTime());
  });

  it("counts only text comparisons with word-bearing target and reviewed transcript, excluding AAC", () => {
    const result = summary({
      sessions: [
        practice(),
        practice({ id: "unreviewed", transcriptReviewed: false }),
        practice({ id: "no-source", transcriptSource: "none" }),
        practice({ id: "punctuation", transcript: "..." }),
        practice({ id: "no-target", target: "?!" }),
        practice({ id: "aac", kind: "aac" }),
        practice({ id: "aac-method", communicationMethod: "aac" }),
      ],
    });
    expect(result.speechRecords).toBe(5);
    expect(result.scoreableTranscripts).toBe(1);
    expect(result.pendingTranscripts).toBe(1);
  });

  it("queues missing reviewer entries and unconfirmed transcripts oldest first without duplicating a record", () => {
    const result = summary({
      sessions: [
        practice({ id: "new", transcriptReviewed: false }),
        practice({ id: "old", createdAt: now - 1000 }),
        practice({ id: "complete" }),
      ],
      reviews: [
        review({ practiceId: "new" }),
        review({ id: "r2", practiceId: "complete" }),
      ],
    });
    expect(result.pending.map((row) => row.record.id)).toEqual(["old", "new"]);
    expect(result.pendingReview).toBe(1);
    expect(result.pendingTranscripts).toBe(1);
    expect(result.reviewedRecords).toBe(2);
  });

  it("does not treat foreign or future reviewer records as completed reviews", () => {
    const result = summary({
      sessions: [practice()],
      reviews: [
        review({ patientId: "foreign" }),
        review({ id: "future", reviewedAt: now + 1 }),
      ],
    });
    expect(result.reviewedRecords).toBe(0);
    expect(result.pendingReview).toBe(1);
  });

  it("counts actual linked clip availability separately from missing references and optional evidence", () => {
    const result = summary({
      sessions: [
        practice({ mediaIds: ["present", "missing"] }),
        practice({ id: "p2", mediaIds: [] }),
      ],
      availableMediaIds: ["present", "unrelated"],
    });
    expect(result.availableClips).toBe(1);
    expect(result.missingClips).toBe(1);
    expect(result.recordsWithEvidence).toBe(1);
    expect(result.pending[0].availableClips).toBe(1);
  });

  it("reports partner understanding and measurement coverage with explicit observed denominators", () => {
    const result = summary({
      sessions: [
        practice({
          partnerUnderstanding: "yes",
          responseSeconds: 0,
          fatigueBefore: 0,
          fatigueAfter: 1,
        }),
        practice({
          id: "p2",
          partnerUnderstanding: "partly",
          responseSeconds: 6,
          fatigueBefore: 1,
        }),
        practice({ id: "p3", partnerUnderstanding: "no" }),
        practice({ id: "p4" }),
      ],
    });
    expect(result.partnerChecked).toBe(3);
    expect(result.partnerUnderstood).toBe(1);
    expect(result.response.n).toBe(2);
    expect(result.response.median).toBe(3);
    expect(result.fatiguePairs).toBe(1);
  });

  it("excludes demo/cached communication, keeps explicit feedback separate from audio and missing times", () => {
    const result = summary({
      attempts: [
        attempt({ communicationOutcome: "understood", timeToSpeechMs: 0 }),
        attempt({
          id: "repair",
          communicationOutcome: "needs_repair",
          outcome: "abandoned",
        }),
        attempt({ id: "unknown" }),
        attempt({ id: "intended", communicationOutcome: "intended" }),
        attempt({
          id: "demo",
          demoClock: true,
          communicationOutcome: "understood",
          timeToSpeechMs: 5000,
        }),
        attempt({ id: "cache", demoCached: true }),
        attempt({ id: "future", startedAt: now + 1 }),
      ],
    });
    expect(result.communication.eligible).toBe(4);
    expect(result.communication.assessed).toBe(2);
    expect(result.communication.understood).toBe(1);
    expect(result.communication.rate).toBe(0.5);
    expect(result.communication.unassessed).toBe(2);
    expect(result.communication.excluded).toBe(2);
    expect(result.communication.seconds.n).toBe(1);
    expect(result.communication.seconds.median).toBe(0);
  });

  it("treats negative, non-finite or implausible times as missing rather than zero", () => {
    const result = summary({
      attempts: [
        attempt({ timeToSpeechMs: 4000 }),
        attempt({ id: "negative", timeToSpeechMs: -500 }),
        attempt({ id: "huge", timeToSpeechMs: 86_400_001 }),
        // Stored rows can bypass schema parsing (for example, legacy data).
        { ...attempt({ id: "nan" }), timeToSpeechMs: Number.NaN },
      ],
    });
    expect(result.communication.seconds).toMatchObject({ n: 1, median: 4 });
  });
});
