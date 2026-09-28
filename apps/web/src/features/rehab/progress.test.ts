import { describe, expect, it } from "vitest";
import {
  practiceProgress,
  practiceWordSessions,
  type ProgressFilters,
} from "./progress";
import { transcriptWordSummary } from "./wordAnalysis";
import type { PracticeRecord } from "./model";

const now = new Date(2026, 8, 30, 12);
const filters: ProgressFilters = { days: 7, language: "all", method: "all" };
function record(
  id: string,
  patch: Partial<PracticeRecord> = {},
): PracticeRecord {
  return {
    id,
    patientId: "local-patient",
    createdAt: now.getTime(),
    kind: "sentence",
    language: "en",
    communicationMethod: "natural_speech",
    target: "I want water",
    transcript: "I want water",
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
    place: "",
    notes: "",
    ...patch,
  };
}

describe("patient rehabilitation progress", () => {
  it("has an honest empty state and exactly seven local calendar days", () => {
    const progress = practiceProgress([], filters, now);
    expect(progress.calendar.map((day) => day.day)).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(progress).toMatchObject({
      weekCount: 0,
      activeDays: 0,
      response: { n: 0, median: null },
      effort: { n: 0, value: null },
      understanding: { known: 0, rate: null },
    });
  });
  it("includes local midnight, excludes older, future, invalid and other-patient rows", () => {
    const start = new Date(2026, 8, 24).getTime();
    const progress = practiceProgress(
      [
        record("start", { createdAt: start }),
        record("before", { createdAt: start - 1 }),
        record("future", { createdAt: now.getTime() + 1 }),
        record("invalid", { createdAt: NaN }),
        record("other", { patientId: "imported" }),
        record("today"),
      ],
      filters,
      now,
    );
    expect(progress.records.map((row) => row.id)).toEqual(["today", "start"]);
    expect(progress.activeDays).toBe(2);
  });
  it("keeps only the latest valid observation per id and does not duplicate calendar counts", () => {
    const old = record("same", {
      createdAt: new Date(2026, 8, 29).getTime(),
      responseSeconds: 4,
    });
    const progress = practiceProgress(
      [old, record("same", { responseSeconds: 8 }), old],
      filters,
      now,
    );
    expect(progress.records).toHaveLength(1);
    expect(progress.calendar.at(-1)?.count).toBe(1);
    expect(progress.response.median).toBe(8);
  });
  it("uses a Monday week independently of language, method or period filters", () => {
    const progress = practiceProgress(
      [
        record("sunday", {
          createdAt: new Date(2026, 8, 27, 23, 59).getTime(),
        }),
        record("monday", {
          createdAt: new Date(2026, 8, 28).getTime(),
          language: "ta",
        }),
        record("aac", { kind: "aac", communicationMethod: "aac" }),
        record("speech"),
      ],
      { ...filters, method: "natural_speech", language: "en" },
      now,
    );
    expect(progress.weekCount).toBe(3);
    expect(progress.records.map((row) => row.id)).toEqual(["speech", "sunday"]);
  });
  it("preserves zero observations, excludes missing values, and exposes sample sizes", () => {
    const progress = practiceProgress(
      [
        record("zero", {
          responseSeconds: 0,
          effort: 0,
          fatigueBefore: 0,
          fatigueAfter: 0,
        }),
        record("measured", {
          responseSeconds: 10,
          effort: 6,
          fatigueBefore: 2,
          fatigueAfter: 4,
        }),
        record("missing"),
      ],
      filters,
      now,
    );
    expect(progress.response).toMatchObject({ n: 2, median: 5 });
    expect(progress.effort).toEqual({ n: 2, value: 3 });
    expect(progress.fatigueBefore).toEqual({ n: 2, value: 1 });
    expect(progress.fatigueAfter).toEqual({ n: 2, value: 2 });
  });
  it("keeps partly understood in the assessed denominator and unknown separate", () => {
    const progress = practiceProgress(
      [
        record("yes", { partnerUnderstanding: "yes" }),
        record("partly", { partnerUnderstanding: "partly" }),
        record("no", { partnerUnderstanding: "no" }),
        record("unknown"),
      ],
      filters,
      now,
    );
    expect(progress.understanding).toMatchObject({
      yes: 1,
      partly: 1,
      no: 1,
      unknown: 1,
      known: 3,
      rate: 1 / 3,
    });
  });
  it("keeps AAC participation and assessed completion distinct", () => {
    const progress = practiceProgress(
      [
        record("done", { kind: "aac", aacCompleted: true }),
        record("notdone", { kind: "aac", aacCompleted: false }),
        record("unchecked", { kind: "aac", aacCompleted: null }),
        record("aac-word", {
          kind: "word",
          communicationMethod: "aac",
          aacCompleted: true,
        }),
        record("speech", { aacCompleted: true }),
      ],
      filters,
      now,
    );
    expect(progress.aac).toEqual({ total: 4, assessed: 3, completed: 2 });
  });
  it("handles a 28-day window across year boundaries", () => {
    const progress = practiceProgress(
      [],
      { ...filters, days: 28 },
      new Date(2027, 0, 2, 12),
    );
    expect(progress.calendar).toHaveLength(28);
    expect(progress.calendar[0].day).toBe("2026-12-06");
    expect(progress.calendar.at(-1)?.day).toBe("2027-01-02");
  });
  it("does not turn unreviewed or AAC transcripts into word errors", () => {
    const words = transcriptWordSummary(
      practiceWordSessions([
        record("reviewed", { transcript: "I want" }),
        record("unreviewed", {
          transcript: "I want",
          transcriptReviewed: false,
        }),
        record("aac", { kind: "aac", transcript: "I want" }),
      ]),
    );
    expect(words.coverage).toMatchObject({
      reviewedAligned: 1,
      unreviewed: 1,
      aac: 1,
    });
    expect(words.words.find((word) => word.word === "water")).toMatchObject({
      omissions: 1,
      opportunities: 1,
    });
  });
  it("rejects an invalid current date", () => {
    expect(() => practiceProgress([], filters, new Date(NaN))).toThrow(
      "valid progress date",
    );
  });
});
