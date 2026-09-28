import { describe, expect, it } from "vitest";
import { AttemptSchema, candidate, type Attempt } from "@sollu/shared";
import { memoryIdentity } from "./memory";

const attempt: Attempt = {
  id: "current-attempt",
  startedAt: 1000,
  modality: "text",
  fragmentRaw: "water",
  sttRetries: 0,
  outputLang: "en",
  place: "home",
  addresseeId: "priya",
  timeBucket: "morning",
  demoClock: false,
  rounds: [],
  taps: 1,
  offline: false,
  demoCached: false,
};
const phrase = candidate(
  "Please give me water.",
  "Please give me water.",
  "request water",
  "💧",
  "water",
);

describe("scoped memory identity", () => {
  it("stays stable across attempts and normalized text without exposing the message", async () => {
    const first = await memoryIdentity(attempt, phrase);
    const repeated = await memoryIdentity(
      {
        ...attempt,
        id: "next-attempt",
        startedAt: 2000,
        fragmentRaw: "  WATER!  ",
      },
      { ...phrase, text: "please give me water!" },
    );
    expect(first).toBe(repeated);
    expect(first).toMatch(/^memory:[a-f0-9]{64}$/);
    expect(first).not.toContain("water");
  });
  it("separates language, fragment, sentence, place, captured listener and time bucket", async () => {
    const first = await memoryIdentity(attempt, phrase);
    const changes: Partial<Attempt>[] = [
      { outputLang: "ta" },
      { fragmentRaw: "tea" },
      { place: "clinic" },
      { addresseeId: "rao" },
      { addresseeId: undefined },
      { timeBucket: "night" },
    ];
    for (const change of changes)
      expect(await memoryIdentity({ ...attempt, ...change }, phrase)).not.toBe(
        first,
      );
    expect(
      await memoryIdentity(attempt, {
        ...phrase,
        text: "I do not want water.",
      }),
    ).not.toBe(first);
  });
  it("retains the captured listener through schema validation and ignores unrelated playback metadata", async () => {
    const parsed = AttemptSchema.parse({ ...attempt, addresseeId: "rao" });
    expect(parsed.addresseeId).toBe("rao");
    expect(await memoryIdentity(parsed, phrase)).toBe(
      await memoryIdentity(
        {
          ...parsed,
          endedAt: 3000,
          taps: 9,
          outcome: "spoken",
          communicationOutcome: "understood",
        },
        phrase,
      ),
    );
    expect(
      AttemptSchema.safeParse({ ...attempt, addresseeId: "x".repeat(121) })
        .success,
    ).toBe(false);
  });
  it("uses an unambiguous field encoding when user text contains delimiters", async () => {
    const left = await memoryIdentity(
      { ...attempt, fragmentRaw: "water:please" },
      { ...phrase, text: "give" },
    );
    const right = await memoryIdentity(
      { ...attempt, fragmentRaw: "water" },
      { ...phrase, text: "please:give" },
    );
    expect(left).not.toBe(right);
  });
});
