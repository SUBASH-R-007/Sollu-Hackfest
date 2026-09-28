import { describe, expect, it } from "vitest";
import {
  distribution,
  scoreTranscript,
  speechWords,
  suggestPracticeTargets,
  summarizePractice,
  summarizeUnderstanding,
  wilsonInterval,
} from "./analysis";
import {
  createDefaultPlan,
  createDefaultProfile,
  daypartAt,
  practiceRecordSchema,
  rehabPlanSchema,
  rehabProfileSchema,
  validateMedia,
  type PracticeRecord,
} from "./model";

const now = new Date(2026, 8, 28, 12);
function record(overrides: Partial<PracticeRecord> = {}): PracticeRecord {
  return {
    id: "one",
    patientId: "local-patient",
    createdAt: now.getTime(),
    kind: "sentence",
    language: "en",
    communicationMethod: "natural_speech",
    target: "I need water",
    transcript: "I need water",
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
    ...overrides,
  };
}

describe("bounded text-match scoring", () => {
  it("normalizes punctuation and case without interpreting meaning", () => {
    expect(
      scoreTranscript("Please, give me time!", "please give me time").matchPct,
    ).toBe(100);
    expect(
      scoreTranscript("I want water", "I do not want water"),
    ).toMatchObject({ matchPct: 33.3, insertions: ["do", "not"] });
  });
  it("aligns repeated words and omissions without set matching", () => {
    const result = scoreTranscript("go go home", "go home");
    expect(result.matchPct).toBe(66.7);
    expect(result.matched).toBe(2);
    expect(result.omissions).toEqual(["go"]);
    expect(result.editDistance).toBe(1);
  });
  it("preserves repeated omissions and token order", () => {
    expect(scoreTranscript("go go go home", "home").omissions).toEqual([
      "go",
      "go",
      "go",
    ]);
    expect(scoreTranscript("need water", "water need").matchPct).toBeLessThan(
      100,
    );
  });
  it("aligns substitutions and insertions and clamps negative percentages", () => {
    expect(scoreTranscript("I need water", "I need tea").substitutions).toEqual(
      [{ expected: "water", heard: "tea" }],
    );
    const result = scoreTranscript("water", "tea juice coffee");
    expect(result.matchPct).toBe(0);
    expect(result.editDistance).toBe(3);
    expect(result.insertions).toHaveLength(2);
  });
  it("does not score silence, missing target or punctuation-only input", () => {
    for (const [target, transcript] of [
      ["water", ""],
      ["", "water"],
      ["water", "..."],
      ["...", "water"],
    ]) {
      expect(scoreTranscript(target, transcript)).toMatchObject({
        matchPct: null,
        editDistance: null,
        omissions: [],
      });
    }
  });
  it("preserves Tamil vowel signs and Unicode normalization", () => {
    expect(speechWords("எனக்கு தண்ணீர் வேண்டும்.")).toEqual([
      "எனக்கு",
      "தண்ணீர்",
      "வேண்டும்",
    ]);
    expect(
      scoreTranscript("எனக்கு தண்ணீர் வேண்டும்", "எனக்கு தண்ணீர் வேண்டும்.")
        .matchPct,
    ).toBe(100);
    expect(
      scoreTranscript("எனக்கு தண்ணீர் வேண்டும்", "எனக்கு வேண்டும்").omissions,
    ).toEqual(["தண்ணீர்"]);
    expect(scoreTranscript("café", "cafe\u0301").matchPct).toBe(100);
  });
  it("bounds token-alignment work", () => {
    expect(() => scoreTranscript("a".repeat(501), "a")).toThrow();
    expect(() => scoreTranscript("a", "a".repeat(1001))).toThrow();
  });
});

describe("practice analytics", () => {
  it("reports no observations as null, never as success or zero speed", () => {
    const summary = summarizePractice([], { now });
    expect(summary.total).toBe(0);
    expect(summary.responseSeconds).toEqual({
      n: 0,
      median: null,
      q1: null,
      q3: null,
    });
    expect(summary.partnerUnderstanding).toMatchObject({
      known: 0,
      unknown: 0,
      rate: null,
      ci95: null,
    });
    expect(summary.aac).toEqual({ completed: 0, assessed: 0, rate: null });
  });
  it("uses separate explicit outcome denominators", () => {
    const records = [
      record({
        id: "a",
        selfUnderstanding: "yes",
        partnerUnderstanding: "unknown",
      }),
      record({ id: "b", selfUnderstanding: "no", partnerUnderstanding: "yes" }),
      record({ id: "c", partnerUnderstanding: "partly" }),
      record({ id: "d", partnerUnderstanding: "no" }),
    ];
    const summary = summarizePractice(records, { now });
    expect(summary.selfUnderstanding).toMatchObject({
      known: 2,
      rate: 0.5,
      unknown: 2,
    });
    expect(summary.partnerUnderstanding).toMatchObject({
      known: 3,
      rate: 1 / 3,
      unknown: 1,
      partly: 1,
    });
    expect(summary.partnerUnderstanding.ci95![0]).toBeGreaterThanOrEqual(0);
    expect(summary.partnerUnderstanding.ci95![1]).toBeLessThanOrEqual(1);
  });
  it("excludes unreviewed recognition and AAC from aggregate text scores", () => {
    const summary = summarizePractice(
      [
        record({
          id: "a",
          transcriptSource: "browser",
          transcriptReviewed: false,
        }),
        record({ id: "b", kind: "aac", communicationMethod: "aac" }),
        record({ id: "c", transcript: "I need tea" }),
      ],
      { now },
    );
    expect(summary.textMatch).toMatchObject({ n: 1, median: 66.7 });
    expect(summary.groups).toHaveLength(2);
  });
  it("does not score an AAC communication method even when the task is a sentence", () => {
    const summary = summarizePractice(
      [
        record({
          kind: "sentence",
          communicationMethod: "aac",
          aacCompleted: true,
        }),
      ],
      { now },
    );
    expect(summary.textMatch).toMatchObject({ n: 0, median: null });
    expect(summary.groups[0].textMatch).toMatchObject({ n: 0, median: null });
    expect(summary.weekly.at(-1)?.textMatch).toMatchObject({
      n: 0,
      median: null,
    });
    expect(summary.aac).toMatchObject({ assessed: 1, completed: 1, rate: 1 });
  });
  it("does not count duplicate attempt IDs or future observations", () => {
    const summary = summarizePractice(
      [
        record(),
        record(),
        record({ id: "future", createdAt: now.getTime() + 1 }),
      ],
      { now },
    );
    expect(summary.total).toBe(1);
    expect(summary.weekly.at(-1)?.attempts).toBe(1);
  });
  it("counts unique confirmed target words once per attempt", () => {
    const a = record({
      confirmedMissedWords: [
        "Water",
        "water",
        "water!",
        "banana",
        "need water",
      ],
    });
    const b = record({ id: "b", confirmedMissedWords: ["water"] });
    const c = record({
      id: "c",
      transcript: "I need tea",
      confirmedMissedWords: [],
    });
    expect(summarizePractice([a, a, b, c], { now }).missedWords).toEqual([
      { word: "water", count: 2, attempts: 2 },
    ]);
    expect(suggestPracticeTargets([a, a, b, c])).toEqual([
      {
        target: "water",
        count: 2,
        reason: "Marked for practice in 2 attempts.",
      },
    ]);
  });
  it("counts AAC completion separately and only when explicitly assessed", () => {
    const summary = summarizePractice(
      [
        record({ id: "a", kind: "aac", aacCompleted: true }),
        record({ id: "b", kind: "aac", aacCompleted: false }),
        record({ id: "c", kind: "aac" }),
        record({ id: "d", aacCompleted: true }),
      ],
      { now },
    );
    expect(summary.aac).toEqual({ completed: 1, assessed: 2, rate: 0.5 });
  });
  it("retains valid zero durations and excludes missing ones", () => {
    const summary = summarizePractice(
      [
        record({ id: "a", responseSeconds: 0 }),
        record({ id: "b", responseSeconds: null }),
        record({ id: "c", responseSeconds: 8 }),
      ],
      { now },
    );
    expect(summary.responseSeconds).toEqual({ n: 2, median: 4, q1: 2, q3: 6 });
  });
  it("groups language, kind and communication method for descriptive comparison", () => {
    const summary = summarizePractice(
      [
        record(),
        record({ id: "b", language: "ta" }),
        record({ id: "c", communicationMethod: "electrolarynx" }),
        record({ id: "d", kind: "word" }),
      ],
      { now },
    );
    expect(summary.groups).toHaveLength(4);
    expect(summary.groups.every((group) => group.count === 1)).toBe(true);
  });
  it("uses local calendar weeks beginning Monday and independent day counts", () => {
    const priorSunday = new Date(2026, 8, 27, 23, 59).getTime();
    const summary = summarizePractice(
      [record(), record({ id: "b", createdAt: priorSunday })],
      { now, weeks: 2 },
    );
    expect(summary.weekly.map((week) => week.attempts)).toEqual([1, 1]);
    expect(new Date(summary.weekly[1].weekStart).getDay()).toBe(1);
    expect(summary.activeDays).toBe(2);
  });
  it("uses a declared interpolated IQR and bounded descriptive confidence interval", () => {
    expect(distribution([1, 2, null, 3, 4, NaN, Infinity])).toEqual({
      n: 4,
      median: 2.5,
      q1: 1.75,
      q3: 3.25,
    });
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(3, 2)).toBeNull();
    expect(wilsonInterval(0, 5)![0]).toBeCloseTo(0);
    expect(wilsonInterval(5, 5)![1]).toBeCloseTo(1);
    expect(summarizeUnderstanding(["unknown"])).toMatchObject({
      known: 0,
      rate: null,
    });
  });
});

describe("practice record validation", () => {
  it("accepts bounded defaults and rejects invalid rating/time measures", () => {
    expect(rehabProfileSchema.parse(createDefaultProfile()).id).toBe(
      "local-patient",
    );
    expect(
      rehabPlanSchema.parse(createDefaultPlan()).exerciseIds.length,
    ).toBeGreaterThan(0);
    expect(practiceRecordSchema.safeParse(record()).success).toBe(true);
    for (const patch of [
      { fatigueAfter: 11 },
      { responseSeconds: -1 },
      { responseSeconds: Infinity },
      { effort: NaN },
      { transcript: "water", transcriptSource: "none" },
    ]) {
      expect(
        practiceRecordSchema.safeParse({ ...record(), ...patch }).success,
      ).toBe(false);
    }
  });
  it("rejects duplicate plan options and evidence references", () => {
    expect(
      rehabPlanSchema.safeParse({
        ...createDefaultPlan(),
        exerciseIds: ["a", "a"],
      }).success,
    ).toBe(false);
    expect(
      rehabPlanSchema.safeParse({
        ...createDefaultPlan(),
        customTargets: ["Water", "water"],
      }).success,
    ).toBe(false);
    expect(
      practiceRecordSchema.safeParse(record({ mediaIds: ["a", "a"] })).success,
    ).toBe(false);
  });
  it("bounds recording duration and checks recording permission and type", () => {
    const media = {
      id: "m",
      patientId: "local-patient",
      practiceId: "one",
      createdAt: 2,
      kind: "audio" as const,
      mimeType: "audio/webm",
      blob: new Blob(["test"], { type: "audio/webm" }),
      durationSeconds: 1,
      consentAt: 1,
    };
    expect(validateMedia(media).durationSeconds).toBe(1);
    expect(() => validateMedia({ ...media, durationSeconds: 121 })).toThrow();
    expect(() => validateMedia({ ...media, consentAt: 3 })).toThrow();
    expect(() => validateMedia({ ...media, kind: "video" })).toThrow();
    expect(() =>
      validateMedia({ ...media, blob: new Blob([], { type: "audio/webm" }) }),
    ).toThrow();
  });
  it("defines dayparts at their local clock boundaries", () => {
    expect(daypartAt(new Date(2026, 8, 28, 3, 59))).toBe("night");
    expect(daypartAt(new Date(2026, 8, 28, 4))).toBe("morning");
    expect(daypartAt(new Date(2026, 8, 28, 11))).toBe("afternoon");
    expect(daypartAt(new Date(2026, 8, 28, 17))).toBe("evening");
    expect(daypartAt(new Date(2026, 8, 28, 20))).toBe("night");
  });
});
