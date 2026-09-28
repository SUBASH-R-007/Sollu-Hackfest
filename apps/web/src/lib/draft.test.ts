import { describe, expect, it } from "vitest";
import {
  ContextPacketSchema,
  getControlledCandidates,
  type Attempt,
} from "@sollu/shared";
import { parseStoredDraft } from "./draft";
const context = ContextPacketSchema.parse({
  fragment: { modality: "speech", raw: "water" },
  outputLang: "en",
});
const attempt: Attempt = {
  id: "draft-test",
  startedAt: 100000,
  modality: "speech",
  fragmentRaw: "water",
  sttRetries: 0,
  outputLang: "en",
  place: "home",
  timeBucket: "morning",
  demoClock: false,
  rounds: [],
  taps: 1,
  offline: false,
  demoCached: false,
};
const valid = () => ({
  attempt,
  context,
  candidates: getControlledCandidates(context),
  chosen: getControlledCandidates(context)[0],
  loading: true,
  audioStatus: "Speaking",
  delivery: "Sent",
});
describe("draft restore", () => {
  it("restores input but drops stale candidates, selection and playback state", () => {
    const restored = parseStoredDraft(valid(), 100100)!;
    expect(restored.context.fragment.raw).toBe("water");
    expect(restored.context.fragment.modality).toBe("speech");
    expect(restored.candidates).toEqual([]);
    expect(restored.chosen).toBeUndefined();
    expect(restored.loading).toBe(false);
    expect(restored.audioStatus).toBe("");
    expect(restored.delivery).toBe("");
  });
  it("rejects expired, future, completed and malformed drafts", () => {
    expect(parseStoredDraft(valid(), 100000 + 86400000)).toBeNull();
    expect(parseStoredDraft(valid(), 99999)).toBeNull();
    expect(
      parseStoredDraft(
        { ...valid(), attempt: { ...attempt, endedAt: 100010 } },
        100100,
      ),
    ).toBeNull();
    for (const bad of [
      null,
      {},
      { ...valid(), context: { fragment: { raw: "water" } } },
      { ...valid(), candidates: [{ text: "water" }] },
      { ...valid(), attempt: { ...attempt, fragmentRaw: "x".repeat(501) } },
    ])
      expect(parseStoredDraft(bad, 100100)).toBeNull();
  });
});
