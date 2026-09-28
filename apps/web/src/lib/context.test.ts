import { describe, expect, it } from "vitest";
import { ContextPacketSchema, demoSeed, type MemoryEntry } from "@sollu/shared";
import { defaultSettings, type Settings } from "../db";
import {
  buildContext,
  clockNow,
  memoryScore,
  minuteDistance,
  timeBucket,
} from "./context";

const settings: Settings = {
  ...defaultSettings,
  contacts: demoSeed.contacts,
  routines: demoSeed.routine,
  demo: false,
};
describe("context timing and grounding", () => {
  it("has the specified bucket boundaries", () => {
    expect(
      [0, 3, 4, 6, 7, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23].map(timeBucket),
    ).toEqual([
      "late_night",
      "late_night",
      "early_morning",
      "early_morning",
      "morning",
      "morning",
      "midday",
      "midday",
      "afternoon",
      "afternoon",
      "evening",
      "evening",
      "night",
      "night",
      "late_night",
    ]);
  });
  it("keeps real time unchanged when the demo clock is disabled", () => {
    const real = new Date(2026, 8, 27, 14, 23, 15).getTime();
    expect(clockNow(settings, real).getTime()).toBe(real);
  });
  it("advances from the original demo anchor across real midnight exactly once", () => {
    const anchor = new Date(2026, 8, 27, 23, 50).getTime();
    const c = { ...settings, demo: true, demoTime: "20:58", demoSetAt: anchor };
    expect(clockNow(c, anchor + 20 * 60_000).getTime()).toBe(
      new Date(2026, 8, 27, 21, 18).getTime(),
    );
    expect(clockNow(c, anchor + 25 * 60 * 60_000).getTime()).toBe(
      new Date(2026, 8, 28, 21, 58).getTime(),
    );
  });
  it("does not run the demo clock backward when the system clock moves", () => {
    const anchor = new Date(2026, 8, 27, 15, 0).getTime();
    expect(
      clockNow(
        { ...settings, demo: true, demoTime: "20:58", demoSetAt: anchor },
        anchor - 1000,
      ).getTime(),
    ).toBe(new Date(2026, 8, 27, 20, 58).getTime());
  });
  it("uses a circular +/-45 minute routine window including midnight", () => {
    const date = new Date(2026, 8, 27, 23, 50);
    expect(minuteDistance("00:10", date)).toBe(20);
    expect(minuteDistance("23:30", new Date(2026, 8, 28, 0, 5))).toBe(-35);
    const now = new Date(2026, 8, 27, 20, 58).getTime();
    const packet = buildContext(
      settings,
      { modality: "topic", raw: "medicine" },
      { now },
    );
    expect(packet.routine?.dueNow.map((r) => r.label)).toEqual([
      "Night tablets",
      "Sleep",
    ]);
    expect(packet.routine?.justPassed).toEqual([]);
    expect(ContextPacketSchema.safeParse(packet).success).toBe(true);
  });
  it("uses the addressee language and sends only supported relevant context", () => {
    const now = new Date(2026, 8, 27, 20, 58).getTime();
    const packet = buildContext(
      { ...settings, addressee: "rao" },
      { modality: "speech", raw: "table" },
      {
        now,
        question: { text: "What would you like?", at: now - 60_000 },
        substitutions: [
          {
            id: "a",
            heard: "table",
            means: "tablet",
            count: 2,
            lastAt: now,
            confirmed: true,
            lang: "en",
            addresseeId: "rao",
            place: "home",
          },
          {
            id: "b",
            heard: "fan",
            means: "phone",
            count: 5,
            lastAt: now,
            confirmed: true,
          },
          { id: "c", heard: "table", means: "cable", count: 1, lastAt: now },
          {
            id: "d",
            heard: "table",
            means: "cable",
            count: 5,
            lastAt: now,
            confirmed: true,
            lang: "ta",
          },
          {
            id: "e",
            heard: "table",
            means: "cable",
            count: 5,
            lastAt: now,
            confirmed: true,
            place: "clinic",
          },
          {
            id: "f",
            heard: "table",
            means: "cable",
            count: 5,
            lastAt: now,
            confirmed: true,
            addresseeId: "priya",
          },
        ],
      },
    );
    expect(packet.outputLang).toBe("en");
    expect(packet.addressee?.register).toBe("respectful");
    expect(packet.partnerQuestion?.minutesAgo).toBe(1);
    expect(packet.substitutions?.map((s) => s.means)).toEqual(["tablet"]);
    expect(JSON.stringify(packet)).not.toContain("pinHash");
    expect(JSON.stringify(packet)).not.toContain("latitude");
    const expired = buildContext(
      settings,
      { modality: "text", raw: "water" },
      { now, question: { text: "Old question", at: now - 300_000 } },
    );
    expect(expired.partnerQuestion).toBeUndefined();
  });
  it("gives familiar exact wording a reproducible score and rejects unrelated memory", () => {
    const now = 1_000_000;
    const memory: MemoryEntry = {
      id: "m",
      fragmentRaw: "water",
      fragmentKey: "water",
      reading: "water",
      sentence: "Please give me water.",
      lang: "en",
      timeBucket: "night",
      placeLabel: "home",
      count: 3,
      firstAt: now,
      lastAt: now,
    };
    expect(memoryScore(memory, "water", "night", now)).toBeCloseTo(
      7 + 0.5 * Math.log(4),
    );
    expect(memoryScore(memory, "fan", "night", now)).toBe(0);
    expect(
      memoryScore(
        { ...memory, lastAt: now - 1209600000 },
        "water",
        "night",
        now,
      ),
    ).toBeCloseTo(6.5 + 0.5 * Math.log(4));
  });
  it("includes only confirmed, relevant memories in the current language, place and contact", () => {
    const now = new Date(2026, 8, 27, 20, 58).getTime();
    const approved: MemoryEntry = {
      id: "approved",
      fragmentRaw: "water",
      fragmentKey: "water",
      reading: "water",
      sentence: "Please give me water.",
      lang: "en",
      timeBucket: "night",
      placeLabel: "home",
      addresseeId: "rao",
      confirmed: true,
      count: 3,
      firstAt: now,
      lastAt: now,
    };
    const memories: MemoryEntry[] = [
      { ...approved, id: "unapproved", confirmed: undefined },
      {
        ...approved,
        id: "unrelated",
        fragmentRaw: "fan",
        fragmentKey: "fan",
        reading: "fan",
      },
      { ...approved, id: "other-language", lang: "ta" },
      { ...approved, id: "other-place", placeLabel: "clinic" },
      { ...approved, id: "other-contact", addresseeId: "priya" },
      approved,
    ];
    const packet = buildContext(
      { ...settings, addressee: "rao" },
      { modality: "text", raw: "water" },
      { now, memories },
    );
    expect(packet.ownExamples).toEqual([
      { fragment: "water", sentence: approved.sentence, timeBucket: "night" },
    ]);
  });
});
