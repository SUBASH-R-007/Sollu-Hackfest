import { describe, expect, it } from "vitest";
import { practiceRecordSchema } from "../rehab/model";
import { summarizePractice } from "../rehab/analysis";
import { unitsFor, type CompanionPhrase } from "./content";
import { spokenAttemptRecord, type SpokenResult } from "./practiceRecord";

const food = unitsFor("en")[1];
const water = food.phrases[0];
const yes = unitsFor("en")[0].phrases[0];
const createdAt = new Date(2026, 8, 29, 9, 30).getTime();

function attempt(result: SpokenResult, phrase: CompanionPhrase = water) {
  return spokenAttemptRecord({
    id: "attempt-1",
    createdAt,
    phrase,
    unitTitle: food.title.en,
    communicationMethod: "mixed",
    place: "home",
    result,
  });
}

describe("companion practice records", () => {
  it("records one-tap 'Said it' like the practice screen", () => {
    const { record, outcome, words } = attempt({ type: "said" });
    expect(water.text).toBe("I'd like some water.");
    expect(record).toMatchObject({
      kind: "sentence",
      language: "en",
      target: water.text,
      transcript: water.text,
      transcriptSource: "manual",
      transcriptReviewed: true,
      confirmedMissedWords: [],
      responseSeconds: null,
      mediaIds: [],
      daypart: "morning",
      notes: "Speech companion: Drinks & food",
    });
    expect(outcome).toBe("correct");
    expect(words).toEqual([]);
    expect(() => practiceRecordSchema.parse(record)).not.toThrow();
  });

  it("records tapped unclear words with the chip logic", () => {
    const { record, outcome, words } = attempt({
      type: "words",
      notSaid: [3, 99],
    });
    expect(record).toMatchObject({
      transcript: "I'd like some",
      transcriptSource: "manual",
      transcriptReviewed: true,
      confirmedMissedWords: ["water"],
    });
    expect(outcome).toBe("missed");
    expect(words).toEqual(["water"]);
  });

  it("keeps an attempt with every word marked unscored, but keeps the marks", () => {
    const { record } = attempt({ type: "words", notSaid: [0, 1, 2, 3] });
    expect(record).toMatchObject({
      transcript: "",
      transcriptSource: "none",
      transcriptReviewed: false,
      confirmedMissedWords: ["i'd", "like", "some", "water"],
    });
  });

  it("treats 'Not yet' on a sentence as missing, not as zero or guessed misses", () => {
    const { record, outcome } = attempt({ type: "notYet" });
    expect(record).toMatchObject({
      transcript: "",
      transcriptSource: "none",
      transcriptReviewed: false,
      confirmedMissedWords: [],
      aacCompleted: null,
    });
    expect(outcome).toBe("missed");
  });

  it("treats 'Not yet' on a single word like the practice screen's chip", () => {
    const { record, outcome, words } = attempt({ type: "notYet" }, yes);
    expect(record).toMatchObject({
      kind: "word",
      transcript: "",
      transcriptSource: "none",
      confirmedMissedWords: ["yes"],
    });
    expect(outcome).toBe("missed");
    expect(words).toEqual(["Yes"]);
  });

  it("counts a communication aid as a completed AAC practice", () => {
    const { record, outcome } = attempt({ type: "aid" });
    expect(record).toMatchObject({
      kind: "aac",
      aacCompleted: true,
      transcript: "",
      transcriptSource: "none",
    });
    expect(outcome).toBe("correct");
  });

  it("keeps a browser transcript unreviewed and does not change the review schedule", () => {
    const { record, outcome } = attempt({
      type: "browser",
      transcript: "  like some water ",
    });
    expect(record).toMatchObject({
      transcript: "like some water",
      rawTranscript: "like some water",
      transcriptSource: "browser",
      transcriptReviewed: false,
      confirmedMissedWords: [],
    });
    expect(outcome).toBeUndefined();
    expect(attempt({ type: "browser", transcript: " " }).record).toMatchObject({
      transcript: "",
      transcriptSource: "none",
    });
  });

  it("accepts speaking, typing and pointing in 'Say it your way'", () => {
    expect(attempt({ type: "yourWay", method: "speak" }).record).toMatchObject({
      kind: "sentence",
      aacCompleted: null,
      transcriptSource: "none",
    });
    for (const method of ["type", "point"] as const)
      expect(attempt({ type: "yourWay", method }).record).toMatchObject({
        kind: "aac",
        aacCompleted: true,
      });
  });

  it("uses the phrase language and appears in rehabilitation summaries", () => {
    const tamil = unitsFor("ta")[1].phrases[0];
    const records = [
      attempt({ type: "said" }).record,
      { ...attempt({ type: "words", notSaid: [3] }).record, id: "attempt-2" },
      {
        ...spokenAttemptRecord({
          id: "attempt-3",
          createdAt,
          phrase: tamil,
          unitTitle: "Drinks & food",
          communicationMethod: "mixed",
          place: "home",
          result: { type: "notYet" },
        }).record,
      },
    ];
    expect(records[2].language).toBe("ta");
    const summary = summarizePractice(records, { now: new Date(createdAt) });
    expect(summary.total).toBe(3);
    // Unscored attempts are missing values, not zero.
    expect(summary.textMatch.n).toBe(2);
    expect(summary.missedWords.map((item) => item.word)).toContain("water");
  });
});
