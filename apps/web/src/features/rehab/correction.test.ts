import { describe, expect, it } from "vitest";
import {
  correctionPrefill,
  preparePracticeCorrection,
  type CorrectionDraft,
} from "./correction";
import type { PracticeRecord } from "./model";

const record: PracticeRecord = {
  id: "one",
  patientId: "local-patient",
  createdAt: 1,
  kind: "sentence",
  language: "en",
  communicationMethod: "natural_speech",
  target: "I want water",
  transcript: "I want daughter",
  rawTranscript: "I want daughter",
  transcriptReviewed: true,
  transcriptSource: "browser",
  confirmedMissedWords: ["water"],
  responseSeconds: null,
  recordingSeconds: null,
  fatigueBefore: null,
  fatigueAfter: null,
  effort: null,
  selfUnderstanding: "unknown",
  partnerUnderstanding: "unknown",
  aacCompleted: null,
  mediaIds: [],
  daypart: "morning",
  place: "home",
  notes: "",
};
const draft: CorrectionDraft = {
  heard: "daughter",
  means: "water",
  addresseeId: "listener",
  personConfirmed: true,
  caregiverUnlocked: true,
};
const identity = { id: "new", now: 2 };

describe("reviewed practice to communication correction", () => {
  it("requires unlocked caregiver, reviewed transcript and separate personal confirmation", () => {
    expect(() =>
      preparePracticeCorrection(
        record,
        { ...draft, caregiverUnlocked: false },
        [],
        identity,
      ),
    ).toThrow("Unlock");
    expect(() =>
      preparePracticeCorrection(
        record,
        { ...draft, personConfirmed: false },
        [],
        identity,
      ),
    ).toThrow("confirm");
    expect(() =>
      preparePracticeCorrection(
        { ...record, transcriptReviewed: false },
        draft,
        [],
        identity,
      ),
    ).toThrow("confirm");
    expect(() =>
      preparePracticeCorrection(
        { ...record, patientId: "imported" },
        draft,
        [],
        identity,
      ),
    ).toThrow("Imported");
  });
  it("creates one actual confirmation, with the recording's language/place and selected listener", () => {
    expect(preparePracticeCorrection(record, draft, [], identity)).toEqual({
      status: "ready",
      mapping: {
        id: "new",
        heard: "daughter",
        means: "water",
        confirmed: true,
        count: 1,
        lastAt: 2,
        lang: "en",
        place: "home",
        addresseeId: "listener",
      },
    });
  });
  it("does not create duplicates or inflate observed frequency", () => {
    const saved = preparePracticeCorrection(
      record,
      draft,
      [],
      identity,
    ).mapping;
    expect(
      preparePracticeCorrection(
        record,
        { ...draft, heard: " DAUGHTER " },
        [saved],
        { id: "second", now: 4 },
      ),
    ).toEqual({ status: "duplicate", mapping: saved });
  });
  it("blocks conflicting confirmed meanings in overlapping scopes including legacy global mappings", () => {
    const saved = preparePracticeCorrection(
      record,
      draft,
      [],
      identity,
    ).mapping;
    expect(() =>
      preparePracticeCorrection(
        record,
        { ...draft, means: "tea" },
        [saved],
        identity,
      ),
    ).toThrow("different approved meaning");
    expect(() =>
      preparePracticeCorrection(
        record,
        { ...draft, means: "tea" },
        [
          {
            ...saved,
            lang: undefined,
            place: undefined,
            addresseeId: undefined,
          },
        ],
        identity,
      ),
    ).toThrow("different approved meaning");
    expect(
      preparePracticeCorrection(
        { ...record, place: "clinic" },
        { ...draft, means: "tea" },
        [saved],
        identity,
      ).status,
    ).toBe("ready");
    expect(
      preparePracticeCorrection(
        record,
        { ...draft, means: "tea" },
        [{ ...saved, confirmed: false }],
        identity,
      ).status,
    ).toBe("ready");
  });
  it("rejects unchanged meanings, blank/long/control text and missing listener", () => {
    for (const patch of [
      { heard: "water" },
      { heard: "" },
      { heard: "x".repeat(121) },
      { means: "line\nnext" },
      { addresseeId: "" },
    ])
      expect(() =>
        preparePracticeCorrection(record, { ...draft, ...patch }, [], identity),
      ).toThrow();
  });
  it("never silently truncates a long transcript or claims unsupported place scope", () => {
    expect(correctionPrefill(" x ")).toBe("x");
    expect(correctionPrefill("x".repeat(121))).toBe("");
    expect(
      preparePracticeCorrection(
        { ...record, place: "bedroom" },
        draft,
        [],
        identity,
      ).mapping.place,
    ).toBeUndefined();
  });
});
