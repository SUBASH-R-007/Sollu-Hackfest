import { describe, expect, it } from "vitest";
import {
  ContextPacketSchema,
  demoSeed,
  type Attempt,
  type MemoryEntry,
} from "@sollu/shared";
import { defaultSettings, type Settings } from "../db";
import {
  buildContext,
  clockNow,
  memoryScore,
  minuteDistance,
  timeBucket,
  inferenceContext,
  recentConfirmedTurns,
  getNearbyRoutines,
} from "./context";

const settings: Settings = {
  ...defaultSettings,
  contacts: demoSeed.contacts,
  routines: demoSeed.routine.map((routine) => ({
    ...routine,
    isSample: false,
  })),
  demo: false,
};
describe("context timing and grounding", () => {
  it("keeps fictional seed routines out of real mode until explicitly reviewed", () => {
    const now = new Date(2026, 8, 28, 20, 58);
    expect(
      getNearbyRoutines({ ...settings, routines: demoSeed.routine }, now),
    ).toEqual([]);
    const legacy = demoSeed.routine.map(
      ({ isSample: _sample, ...routine }) => routine,
    );
    expect(getNearbyRoutines({ ...settings, routines: legacy }, now)).toEqual(
      [],
    );
    expect(
      getNearbyRoutines({ ...settings, routines: legacy, demo: true }, now)
        .length,
    ).toBeGreaterThan(0);
    expect(getNearbyRoutines(settings, now).length).toBeGreaterThan(0);
  });
  it("matches the scheduled weekday across midnight, not the viewing weekday", () => {
    const sundayNight = new Date(2026, 8, 27, 23, 50);
    const weekly: Settings = {
      ...settings,
      routines: [
        {
          id: "monday",
          label: "Monday music",
          topic: "tv_phone",
          time: "00:10",
          days: [1],
          source: "caregiver",
          confirmed: true,
        },
        {
          id: "sunday",
          label: "Sunday music",
          topic: "tv_phone",
          time: "00:10",
          days: [0],
          source: "caregiver",
          confirmed: true,
        },
        {
          id: "previous",
          label: "Sunday reading",
          topic: "rest",
          time: "23:50",
          days: [0],
          source: "caregiver",
          confirmed: true,
        },
      ],
    };
    expect(
      getNearbyRoutines(weekly, sundayNight).map(({ routine }) => routine.id),
    ).toEqual(["previous", "monday"]);
    const monday = new Date(2026, 8, 28, 0, 5);
    expect(
      getNearbyRoutines(weekly, monday).map(({ routine, minutesAway }) => [
        routine.id,
        minutesAway,
      ]),
    ).toEqual([
      ["monday", 5],
      ["previous", -15],
    ]);
  });
  it("excludes unreviewed, wrong-place, invalid-time and out-of-window routines", () => {
    const routine = {
      id: "a",
      label: "Coffee",
      topic: "drink" as const,
      time: "07:00",
      days: [1],
      source: "caregiver" as const,
      confirmed: true,
    };
    const weekly: Settings = {
      ...settings,
      place: "home",
      routineWindowMinutes: 15,
      routines: [
        routine,
        { ...routine, id: "pending", confirmed: false },
        { ...routine, id: "clinic", place: "clinic" },
        { ...routine, id: "late", time: "07:30" },
        { ...routine, id: "invalid", time: "25:99" },
      ],
    };
    const monday = new Date(2026, 8, 28, 6, 55);
    expect(
      getNearbyRoutines(weekly, monday).map(({ routine }) => routine.id),
    ).toEqual(["a"]);
    expect(
      getNearbyRoutines({ ...weekly, useRoutineContext: false }, monday),
    ).toEqual([]);
    expect(
      getNearbyRoutines({ ...weekly, useTimeContext: false }, monday),
    ).toEqual([]);
    expect(
      getNearbyRoutines(
        {
          ...weekly,
          usePlaceContext: false,
          routines: [{ ...routine, place: "home" }],
        },
        monday,
      ),
    ).toEqual([]);
  });
  it("honors source switches even when a caller passes a previously built packet", () => {
    const full = buildContext(settings, {
      modality: "text",
      raw: "want usual drink",
    });
    const disabled = {
      ...settings,
      sharePersonalContext: true,
      useTimeContext: false,
      usePlaceContext: false,
      useRoutineContext: false,
    };
    const packet = inferenceContext(full, disabled);
    expect(packet.now).toBeUndefined();
    expect(packet.place).toBeUndefined();
    expect(packet.routine).toBeUndefined();
    const local = buildContext(disabled, full.fragment);
    expect(local.now).toBeUndefined();
    expect(local.place).toBeUndefined();
    expect(local.routine).toEqual({ dueNow: [], justPassed: [] });
    expect(ContextPacketSchema.safeParse(local).success).toBe(true);
  });
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

describe("inference context sharing", () => {
  it("canonicalizes the transmitted packet exactly like server validation", () => {
    const context = buildContext(
      { ...settings, name: " Amma " },
      { modality: "text", raw: "want usual drink" },
    );
    context.addressee = {
      name: " Priya ",
      relation: " daughter ",
      register: "familiar",
    };
    const packet = inferenceContext(context, {
      ...settings,
      sharePersonalContext: true,
    });
    expect(packet.speaker?.preferredName).toBe("Amma");
    expect(packet.addressee?.name).toBe("Priya");
    expect(packet).toEqual(ContextPacketSchema.parse(packet));
  });
  it("keeps personal context private by default and retains the current question", () => {
    const context = buildContext(
      settings,
      { modality: "text", raw: "no coffee" },
      {
        question: { text: "Would you like coffee?", at: Date.now() },
      },
    );
    context.communication = {
      sentenceStyle: "brief",
      maxWords: 8,
      preferences: "Private preference",
    };
    context.recentTurns = [
      { speaker: "person", text: "Earlier message", minutesAgo: 1 },
    ];
    const result = inferenceContext(context, {
      ...settings,
      sharePersonalContext: false,
      shareRecentContext: false,
    });
    expect(result.fragment.raw).toBe("no coffee");
    expect(result.partnerQuestion?.text).toBe("Would you like coffee?");
    expect(result.communication).toEqual({
      sentenceStyle: "brief",
      maxWords: 8,
    });
    for (const key of [
      "speaker",
      "people",
      "addressee",
      "routine",
      "vocabulary",
      "substitutions",
      "ownExamples",
      "place",
    ])
      expect(result).not.toHaveProperty(key);
    expect(result.recentTurns).toEqual([]);
    expect(ContextPacketSchema.safeParse(result).success).toBe(true);
  });
  it("shares each optional context group independently", () => {
    const context = buildContext(settings, { modality: "text", raw: "coffee" });
    context.recentTurns = [
      { speaker: "person", text: "Earlier message", minutesAgo: 1 },
    ];
    const personal = inferenceContext(context, {
      ...settings,
      sharePersonalContext: true,
      shareRecentContext: false,
    });
    expect(personal.people).toEqual(context.people);
    expect(personal.recentTurns).toEqual([]);
    const recent = inferenceContext(context, {
      ...settings,
      sharePersonalContext: false,
      shareRecentContext: true,
    });
    expect(recent.people).toBeUndefined();
    expect(recent.recentTurns).toEqual(context.recentTurns);
    expect(JSON.stringify(personal)).not.toContain("pinHash");
  });
  it("uses only recent confirmed chosen messages for the same listener, language and place", () => {
    const now = Date.now();
    const context = buildContext(settings, { modality: "text", raw: "yes" });
    const valid: Attempt = {
      id: "a",
      startedAt: now - 60000,
      endedAt: now - 30000,
      outcome: "spoken",
      modality: "text",
      fragmentRaw: "garden",
      sttRetries: 0,
      outputLang: context.outputLang,
      place: context.place!,
      timeBucket: context.now!.timeBucket,
      addresseeId: context.addressee?.id,
      demoClock: false,
      rounds: [],
      chosenText: "I want to visit the garden.",
      communicationOutcome: "intended",
      taps: 1,
      offline: false,
      demoCached: false,
    };
    const attempts = [
      valid,
      {
        ...valid,
        id: "unconfirmed",
        communicationOutcome: "unconfirmed" as const,
      },
      { ...valid, id: "refused", communicationOutcome: "declined" as const },
      { ...valid, id: "repair", communicationOutcome: "needs_repair" as const },
      { ...valid, id: "old", endedAt: now - 600001 },
      { ...valid, id: "future", endedAt: now + 1 },
      { ...valid, id: "other", addresseeId: "another-listener" },
      { ...valid, id: "place", place: "hospital" },
      { ...valid, id: "abandoned", outcome: "abandoned" as const },
    ];
    expect(recentConfirmedTurns(attempts, context, now)).toEqual([
      { speaker: "person", text: valid.chosenText, minutesAgo: 0.5 },
    ]);
  });
});
