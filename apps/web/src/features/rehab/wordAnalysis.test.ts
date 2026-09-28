import { describe, expect, it, vi } from "vitest";
import { scoreTranscript } from "./analysis";
import type { ReportSession } from "./report";
import {
  createTranscriptWordSummarizer,
  transcriptWordSummary,
} from "./wordAnalysis";

const session = (extra: Partial<ReportSession> = {}): ReportSession => ({
  id: "one",
  at: 100,
  kind: "sentence",
  language: "en",
  method: "natural_speech",
  target: "I need water",
  transcript: "I need water",
  transcriptSource: "manual",
  transcriptReviewed: true,
  textMatch: 100,
  responseSeconds: null,
  recordingSeconds: null,
  fatigueBefore: null,
  fatigueAfter: null,
  effort: null,
  selfUnderstanding: "unknown",
  partnerUnderstanding: "unknown",
  aacCompleted: null,
  missedWords: [],
  media: [],
  reviews: [],
  ...extra,
});

describe("reviewed transcript word observations", () => {
  it("shares expensive alignments across aggregate, weekly and filtered views without reusing changed text", () => {
    const score = vi.fn(scoreTranscript);
    const summarize = createTranscriptWordSummarizer(score);
    const first = session(),
      second = session({ id: "two", transcript: "I need tea" });
    expect(summarize([first, second]).totals.opportunities).toBe(6);
    expect(summarize([first]).wordMatchRate).toBe(1);
    expect(summarize([second]).wordMatchRate).toBe(2 / 3);
    expect(score).toHaveBeenCalledTimes(2);
    first.transcript = "I need";
    expect(summarize([first]).totals.omissions).toBe(1);
    expect(score).toHaveBeenCalledTimes(3);
    first.transcriptReviewed = false;
    expect(summarize([first]).wordMatchRate).toBeNull();
    expect(score).toHaveBeenCalledTimes(3);
  });
  it("counts every repeated target opportunity but each marked record only once", () => {
    const result = transcriptWordSummary([
      session({
        target: "go go home",
        transcript: "go home",
        missedWords: ["go", "GO", "go go"],
      }),
    ]);
    expect(result.words.find((word) => word.word === "go")).toMatchObject({
      opportunities: 2,
      matches: 1,
      omissions: 1,
      substitutions: 0,
      records: 1,
      markedRecords: 1,
      matchRate: 0.5,
    });
    expect(result.totals).toEqual({
      opportunities: 3,
      matches: 2,
      omissions: 1,
      substitutions: 0,
      insertions: 0,
    });
  });
  it("separates substitutions and insertions without assigning extra words a target denominator", () => {
    const result = transcriptWordSummary([
      session({ transcript: "well I need tea" }),
    ]);
    expect(result.words.find((word) => word.word === "water")).toMatchObject({
      opportunities: 1,
      matches: 0,
      substitutions: 1,
      matchRate: 0,
    });
    expect(result.inserted).toEqual([
      {
        word: "well",
        language: "en",
        method: "natural_speech",
        occurrences: 1,
        records: 1,
      },
    ]);
    expect(result.words.some((word) => word.word === "well")).toBe(false);
    expect(result.wordMatchRate).toBe(2 / 3);
  });
  it("does not treat unreviewed recognition, AAC, silence, source-less or omitted content as failure", () => {
    const result = transcriptWordSummary([
      session({
        id: "unreviewed",
        transcriptSource: "browser",
        transcriptReviewed: false,
      }),
      session({ id: "aac", kind: "aac" }),
      session({ id: "aac-method", kind: "sentence", method: "aac" }),
      session({ id: "silent", transcript: "..." }),
      session({ id: "redacted", target: undefined, transcript: undefined }),
      session({ id: "no-source", transcriptSource: "none" }),
    ]);
    expect(result.wordMatchRate).toBeNull();
    expect(result.words).toEqual([]);
    expect(result.coverage).toMatchObject({
      total: 6,
      reviewedAligned: 0,
      unreviewed: 1,
      aac: 2,
      unavailable: 3,
    });
  });
  it("recomputes alignments from reviewed text instead of trusting a reported numeric score or raw ASR", () => {
    const result = transcriptWordSummary([
      session({
        textMatch: 0,
        rawTranscript: "wrong words",
        transcriptSource: "browser",
      }),
    ]);
    expect(result.wordMatchRate).toBe(1);
    expect(result.totals.matches).toBe(3);
  });
  it("keeps languages and methods separate and preserves Tamil vowel signs", () => {
    const result = transcriptWordSummary([
      session({ target: "water", transcript: "water" }),
      session({
        id: "different-method",
        target: "water",
        transcript: "tea",
        method: "electrolarynx",
      }),
      session({
        id: "tamil",
        target: "தண்ணீர் வேண்டும்",
        transcript: "வேண்டும்",
        language: "ta",
      }),
    ]);
    expect(result.words.filter((word) => word.word === "water")).toHaveLength(
      2,
    );
    expect(result.words.find((word) => word.word === "தண்ணீர்")).toMatchObject({
      opportunities: 1,
      omissions: 1,
      language: "ta",
    });
  });
  it("uses latest unique observations and marks choices independently from transcript differences", () => {
    const result = transcriptWordSummary([
      session({ at: 50, transcript: "I need tea" }),
      session({ missedWords: ["WATER!", "unrelated"], at: 100 }),
      session({ id: "two", at: 101, transcript: "I need tea" }),
    ]);
    expect(result.coverage.total).toBe(2);
    expect(result.words.find((word) => word.word === "water")).toMatchObject({
      opportunities: 2,
      matches: 1,
      substitutions: 1,
      markedRecords: 1,
      lastObservedAt: 101,
    });
  });
  it("does not merge target and inserted occurrences of the same word", () => {
    const result = transcriptWordSummary([
      session({ target: "go home", transcript: "go go home" }),
    ]);
    expect(result.words.find((word) => word.word === "go")).toMatchObject({
      opportunities: 1,
      matches: 1,
    });
    expect(result.inserted.find((word) => word.word === "go")).toMatchObject({
      occurrences: 1,
      records: 1,
    });
  });
  it("reports missing observation coverage with real zero measures retained", () => {
    const result = transcriptWordSummary([
      session({
        responseSeconds: 0,
        fatigueBefore: 0,
        fatigueAfter: 0,
        partnerUnderstanding: "no",
        media: ["clip"],
      }),
      session({ id: "missing" }),
    ]);
    expect(result.coverage).toMatchObject({
      total: 2,
      withResponseTime: 1,
      withPartnerFeedback: 1,
      withPairedFatigue: 1,
      withEvidence: 1,
    });
  });
  it("keeps word match distinct from sentence match when extra words are present", () => {
    const result = transcriptWordSummary([
      session({ target: "water", transcript: "please water", textMatch: 0 }),
    ]);
    expect(result.wordMatchRate).toBe(1);
    expect(result.totals.insertions).toBe(1);
  });
  it("does not invent observations for an empty report", () => {
    const result = transcriptWordSummary([]);
    expect(result.wordMatchRate).toBeNull();
    expect(result.words).toEqual([]);
    expect(result.inserted).toEqual([]);
    expect(result.coverage.total).toBe(0);
  });
});
