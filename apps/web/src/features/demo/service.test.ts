import { describe, expect, it } from "vitest";
import { ContextPacketSchema, type ContextPacket } from "@sollu/shared";
import { defaultSettings } from "../../db";
import { buildContext } from "../../lib/context";
import { rehearsalKey } from "./service";

const context = (): ContextPacket =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw: "tablet… night" },
    outputLang: "ta",
    place: "home",
    now: { localTime: "20:58", weekday: 0, timeBucket: "night" },
    addressee: {
      name: "Priya",
      relation: "daughter-in-law",
      register: "respectful",
    },
    people: [
      {
        name: "Priya",
        relation: "daughter-in-law",
        aliases: ["ப்ரியா", "Pri"],
      },
    ],
    vocabulary: [
      { term: "filter coffee", kind: "drink", meaning: "Usual coffee" },
    ],
    routine: {
      dueNow: [
        {
          label: "Night tablets",
          topic: "medicine",
          time: "21:00",
          learned: false,
        },
      ],
      justPassed: [],
    },
    partnerQuestion: { text: "What do you need?", lang: "en", minutesAgo: 1 },
    exclude: ["First option", "Second option"],
  });

describe("rehearsal context keys", () => {
  it("changes when the place, contact, register, or routine meaning changes", () => {
    const c = context(),
      original = rehearsalKey(c);
    for (const changed of [
      { ...c, place: "clinic" as const },
      { ...c, addressee: { ...c.addressee!, name: "Karthik" } },
      { ...c, addressee: { ...c.addressee!, register: "familiar" as const } },
      { ...c, addressee: { ...c.addressee!, relation: "friend" } },
      { ...c, routine: { dueNow: [], justPassed: [] } },
      {
        ...c,
        routine: {
          dueNow: [{ ...c.routine!.dueNow[0], time: "22:00" }],
          justPassed: [],
        },
      },
      {
        ...c,
        routine: {
          dueNow: [
            {
              ...c.routine!.dueNow[0],
              label: "Evening walk",
              topic: "go_out" as const,
            },
          ],
          justPassed: [],
        },
      },
    ])
      expect(rehearsalKey(changed)).not.toBe(original);
  });
  it("changes when people or vocabulary grounding changes", () => {
    const c = context(),
      original = rehearsalKey(c);
    expect(rehearsalKey({ ...c, people: [] })).not.toBe(original);
    expect(
      rehearsalKey({
        ...c,
        people: [{ ...c.people![0], aliases: ["Different alias"] }],
      }),
    ).not.toBe(original);
    expect(
      rehearsalKey({
        ...c,
        vocabulary: [{ ...c.vocabulary![0], term: "tea" }],
      }),
    ).not.toBe(original);
    expect(
      rehearsalKey({
        ...c,
        vocabulary: [{ ...c.vocabulary![0], meaning: "Different meaning" }],
      }),
    ).not.toBe(original);
  });
  it("is stable for elapsed clock time, question age, text normalization and ordering", () => {
    const c = context();
    const changed: ContextPacket = {
      ...c,
      fragment: { ...c.fragment, raw: "  TABLET NIGHT  " },
      now: { ...c.now!, localTime: "20:59", weekday: 1 },
      partnerQuestion: { ...c.partnerQuestion!, minutesAgo: 2 },
      exclude: [...c.exclude].reverse(),
      people: [
        { ...c.people![0], aliases: [...c.people![0].aliases].reverse() },
      ],
    };
    expect(rehearsalKey(changed)).toBe(rehearsalKey(c));
    const two = {
      ...c,
      vocabulary: [...c.vocabulary!, { term: "idli", kind: "food" }],
    };
    expect(
      rehearsalKey({ ...two, vocabulary: [...two.vocabulary].reverse() }),
    ).toBe(rehearsalKey(two));
  });
  it("keeps elapsed clock time stable but invalidates changed memory meaning", () => {
    const anchor = new Date(2026, 8, 27, 15, 0).getTime();
    const settings = {
      ...defaultSettings,
      demo: true,
      demoTime: "20:58",
      demoSetAt: anchor,
    };
    const fragment = { modality: "text" as const, raw: "tablet… night" };
    const warmed = buildContext(settings, fragment, { now: anchor });
    const repeated = buildContext(settings, fragment, { now: anchor + 1000 });
    expect(rehearsalKey(repeated)).toBe(rehearsalKey(warmed));
    repeated.ownExamples = [
      {
        fragment: "tablet night",
        sentence: "Please bring my night tablets.",
        timeBucket: "night",
      },
    ];
    expect(rehearsalKey(repeated)).not.toBe(rehearsalKey(warmed));
    expect(rehearsalKey({ ...repeated, round: 2 })).not.toBe(
      rehearsalKey(warmed),
    );
    expect(rehearsalKey({ ...repeated, outputLang: "en" })).not.toBe(
      rehearsalKey(warmed),
    );
  });
  it("invalidates changed corrections, transcription alternatives and rejected meanings", () => {
    const c = context(),
      key = rehearsalKey(c);
    for (const changed of [
      {
        ...c,
        substitutions: [
          { heard: "table", means: "cable", count: 2, confirmed: true },
        ],
      },
      { ...c, fragment: { ...c.fragment, sttAlternatives: ["table"] } },
      { ...c, rejectedMeaningKeys: ["medicine.request"] },
      { ...c, speaker: { preferredName: "Me", gender: "male" as const } },
      {
        ...c,
        recentTurns: [
          { speaker: "person" as const, text: "No medicine", minutesAgo: 1 },
        ],
      },
    ])
      expect(rehearsalKey(changed)).not.toBe(key);
  });
});
