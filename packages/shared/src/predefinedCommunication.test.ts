import { describe, expect, it } from "vitest";
import { ContextPacketSchema } from "./schemas";
import { requiresPredefinedCommunication } from "./predefinedCommunication";
import { applyCandidatePolicy } from "./candidatePolicy";
import { getMockCandidates } from "./mock";
import { resolveGeneratedSentences } from "./modelGrounding";

const context = (raw: string) =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang: "en",
  });

describe("predefined communication route", () => {
  it.each([
    "chest pain",
    "no chest pain",
    "chest pain yesterday",
    "maybe chest pain",
    "ch-ch-chest pain",
    "tablet… night",
    "double medicine dose",
    "FictionalRemedy treatment",
    "can't breathe",
    "not an emergency",
    "help",
    "no help",
    "நெஞ்சு வலி",
    "மாத்திரை வேணாம்",
    "nenju vali",
    "marunthu vendam",
  ])(
    "keeps recognized health/help wording out of generation without determining urgency: %s",
    (raw) => {
      const c = context(raw),
        before = JSON.stringify(c);
      expect(requiresPredefinedCommunication(c)).toBe(true);
      expect(JSON.stringify(c)).toBe(before);
    },
  );
  it.each([
    "water",
    "want usual food",
    "my helpful friend",
    "painting",
    "chestnut",
    "garden tomorrow sister",
  ])("does not treat unrelated words as a safety assessment: %s", (raw) => {
    expect(requiresPredefinedCommunication(context(raw))).toBe(false);
  });
  it("uses current topic/object and scoped reviewed corrections, never unrelated history or routines", () => {
    const c = context("water");
    c.routine = {
      dueNow: [{ label: "Night tablets", topic: "medicine", time: "21:00" }],
      justPassed: [],
    };
    c.recentTurns = [
      { speaker: "partner", text: "Do you need help?", minutesAgo: 0 },
    ];
    expect(requiresPredefinedCommunication(c)).toBe(false);
    expect(
      requiresPredefinedCommunication({
        ...c,
        fragment: { ...c.fragment, topicPath: ["pain", "chest"] },
      }),
    ).toBe(true);
    expect(
      requiresPredefinedCommunication({
        ...c,
        fragment: { ...c.fragment, objectLabel: "medicine" },
      }),
    ).toBe(true);
    const corrected = {
      ...context("word"),
      place: "home" as const,
      substitutions: [
        {
          heard: "word",
          means: "medicine",
          confirmed: true,
          count: 2,
          lang: "en" as const,
          place: "home" as const,
        },
      ],
    };
    expect(requiresPredefinedCommunication(corrected)).toBe(true);
    expect(
      requiresPredefinedCommunication({ ...corrected, place: "clinic" }),
    ).toBe(false);
    expect(
      requiresPredefinedCommunication({
        ...corrected,
        substitutions: [{ ...corrected.substitutions[0], confirmed: false }],
      }),
    ).toBe(false);
  });
  it("preserves useful exact Help requests without converting refusals or qualifiers", () => {
    for (const lang of ["en", "ta"] as const) {
      for (const raw of ["help", "I need help", "உதவி வேணும்"]) {
        const c = { ...context(raw), outputLang: lang };
        const result = applyCandidatePolicy(getMockCandidates(c), c);
        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0].intentId).toBe("communication.help");
        expect(
          getMockCandidates({ ...c, exclude: [result.candidates[0].text] }),
        ).toEqual([]);
      }
    }
    for (const raw of [
      "no help",
      "help yesterday",
      "maybe need help",
      "help FictionalName",
      "உதவி வேண்டாம்",
    ]) {
      const c = context(raw);
      expect(applyCandidatePolicy(getMockCandidates(c), c).candidates).toEqual(
        [],
      );
    }
  });
  it("does not reauthorize a previously grounded model draft on a predefined route", () => {
    const c = context("need help here");
    c.place = "home";
    const draft = resolveGeneratedSentences(
      {
        candidates: [
          {
            text: "I need help here at home.",
            gloss_en: "I need help here at home.",
            speechAct: "request",
            polarity: "positive",
            side: "none",
            evidence: [
              {
                path: "fragment.raw",
                quote: c.fragment.raw,
                translation_en: "",
              },
              { path: "place", quote: "home", translation_en: "" },
            ],
          },
        ],
        clarification: false,
      },
      c,
    ).candidates;
    expect(draft).toHaveLength(1);
    expect(
      applyCandidatePolicy(draft, c, { serverGeneratedCandidates: draft })
        .candidates,
    ).toEqual([]);
  });
});
