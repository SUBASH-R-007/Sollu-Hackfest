import { describe, expect, it } from "vitest";
import { applyCandidatePolicy } from "./candidatePolicy";
import { confirmedFragmentCorrection } from "./fragmentRepair";
import { getControlledCandidates } from "./mock";
import { ContextPacketSchema, type ContextInput } from "./schemas";
import { prepareCatalogFragment, repairCatalogFragment } from "./vocabulary";

function suggest(raw: string, extra: Partial<ContextInput> = {}) {
  const context = ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang: "en",
    ...extra,
  });
  return applyCandidatePolicy(getControlledCandidates(context), context);
}

describe("conservative fragmented communication", () => {
  it.each([
    ["w-w-water", "daily.water"],
    ["wa…water", "daily.water"],
    ["wa wa water", "daily.water"],
    ["water water", "daily.water"],
    ["wa-ter", "daily.water"],
    ["me want wate", "daily.water"],
    ["coff", "daily.coffee"],
    ["th-thanni", "daily.water"],
    ["th…thanni", "daily.water"],
    ["than-ni", "daily.water"],
    ["தண்-ணீர்", "daily.water"],
    ["தண்…தண்ணீர்", "daily.water"],
    ["தண்ணீர் தண்ணீர்", "daily.water"],
    ["தண்ணீ", "daily.water"],
  ])("offers an existing meaning for %s with visible repair", (raw, id) => {
    for (const outputLang of ["en", "ta"] as const) {
      const result = suggest(raw, { outputLang });
      expect(result.candidates.map((c) => c.intentId)).toEqual([id]);
      expect(result.candidates[0].reading).toContain("→");
      expect(result.candidates[0].reading.length).toBeLessThanOrEqual(40);
    }
  });

  it.each([
    "no w-w-water",
    "don't want wate",
    "water water no",
    "thanni thanni vendam",
    "தண்ணீர் தண்ணீர் வேண்டாம்",
  ])("does not reverse a refusal in %s", (raw) => {
    const result = suggest(raw);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((c) => c.polarity === "negative")).toBe(
      true,
    );
  });

  it.each([
    "wa",
    "co",
    "water ven",
    "water ven-",
    "water n",
    "water xqz",
    "no wate but tea",
    "wate instead of coffee",
    "wate tomorrow",
    "wate 2",
    "two wate",
    "left wate",
    "right wate",
    "புரிய",
    "tabl",
    "medicin",
    "headach",
    "dizz",
    "left ar pain",
    "take 2 tabl",
    "not wate",
    "தண்ணீ இரண்டு",
    "தண்ணீர் இரண்டு",
    "தண்ணீ மருந்து",
    "தண்ணீ ரவி",
  ])(
    "asks for clarification when meaning or important detail is unresolved: %s",
    (raw) => {
      const result = suggest(raw);
      expect(result.candidates).toEqual([]);
      expect(result.clarification).toBeTruthy();
    },
  );

  it.each([
    "no",
    "not",
    "left",
    "right",
    "two",
    "2",
    "venam",
    "venum",
    "இல்லை",
    "வேண்டாம்",
  ])("never rewrites a protected token %s", (word) => {
    expect(repairCatalogFragment(word).changes).toEqual([]);
    expect(repairCatalogFragment(`${word} ${word}`).changes).toEqual([]);
  });

  it("preserves original source text and respects rejected repaired meanings", () => {
    const context = ContextPacketSchema.parse({
      fragment: { modality: "speech", raw: "w-w-water" },
      outputLang: "en",
    });
    const candidates = getControlledCandidates(context);
    expect(context.fragment.raw).toBe("w-w-water");
    expect(
      applyCandidatePolicy(candidates, {
        ...context,
        exclude: [candidates[0].text],
      }).candidates,
    ).toEqual([]);
  });

  it("does not complete a known word into a different word", () => {
    expect(repairCatalogFragment("tea table no off").changes).toEqual([]);
    expect(repairCatalogFragment("tea-pot").text).toBe("tea-pot");
  });

  it.each([
    "pill",
    "my pill",
    "pill please",
    "a glass",
    "glass",
    "took",
    "chai",
    "clot",
    "mil",
    "மூக்கு",
    "தூக்க",
    "headache",
    "venaa",
    "வேணா",
    "varala",
  ])(
    "never completes a complete health, body, refusal or ordinary word: %s",
    (raw) => {
      expect(repairCatalogFragment(raw).changes).toEqual([]);
      expect(suggest(raw).candidates.map((c) => c.intentId)).not.toContain(
        "daily.pillow",
      );
      expect(suggest(raw).candidates.map((c) => c.intentId)).not.toContain(
        "daily.glasses",
      );
    },
  );
});

describe("confirmed personal corrections and grounding", () => {
  it("uses a confirmed correction before a generic completion and does not mutate the source", () => {
    const context = ContextPacketSchema.parse({
      fragment: { modality: "speech", raw: "wate" },
      outputLang: "en",
      place: "home",
      substitutions: [
        {
          heard: "wate",
          means: "tea",
          confirmed: true,
          count: 1,
          lang: "en",
          place: "home",
        },
      ],
    });
    expect(
      applyCandidatePolicy(
        getControlledCandidates(context),
        context,
      ).candidates.map((c) => c.intentId),
    ).toEqual(["daily.tea"]);
    expect(getControlledCandidates(context)[0].reading).toBe("wate → tea");
    expect(context.fragment.raw).toBe("wate");
  });

  it("retains a non-catalog heard word once a person confirmed the catalog meaning", () => {
    expect(
      suggest("bell", {
        substitutions: [
          { heard: "bell", means: "water", confirmed: true, count: 1 },
        ],
      }).candidates.map((c) => c.intentId),
    ).toEqual(["daily.water"]);
  });

  it("replaces whole heard tokens without touching substrings", () => {
    const result = confirmedFragmentCorrection({
      fragment: { modality: "text", raw: "bell bellflower bell" },
      outputLang: "en",
      substitutions: [
        { heard: "bell", means: "water", confirmed: true, count: 1 },
      ],
    });
    expect(result.text).toBe("water bellflower water");
  });

  it("does not chain one confirmed mapping into another", () => {
    const context: ContextInput = {
      fragment: { modality: "speech", raw: "bell" },
      outputLang: "en",
      substitutions: [
        { heard: "bell", means: "water", confirmed: true, count: 1 },
        { heard: "water", means: "tea", confirmed: true, count: 1 },
      ],
    };
    expect(prepareCatalogFragment(context).text).toBe("water");
    expect(suggest("bell", context).candidates.map((c) => c.intentId)).toEqual([
      "daily.water",
    ]);
  });

  it("abstains on competing corrections and rejects unconfirmed or wrong-scope mappings", () => {
    const substitutions = [
      { heard: "bell", means: "water", confirmed: true, count: 1 },
      { heard: "bell", means: "tea", confirmed: true, count: 9 },
    ];
    expect(suggest("bell", { substitutions }).candidates).toEqual([]);
    for (const mapping of [
      { ...substitutions[0], confirmed: false },
      { ...substitutions[0], place: "hospital" as const },
      { ...substitutions[0], lang: "ta" as const },
      { ...substitutions[0], addresseeId: "different-listener" },
    ])
      expect(
        suggest("bell", { place: "home", substitutions: [mapping] }).candidates,
      ).toEqual([]);
  });
});
