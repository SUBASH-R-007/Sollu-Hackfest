import { describe, expect, it } from "vitest";
import { applyCandidatePolicy } from "./candidatePolicy";
import { getControlledCandidates } from "./mock";
import { ContextPacketSchema, type ContextInput } from "./schemas";
import { getVocabularyCandidates } from "./vocabulary";

const people = [
  { name: "Karthik", relation: "son", aliases: ["கார்த்திக்"] },
  { name: "Rao", relation: "friend", aliases: ["ராவ்"] },
];
function suggest(
  raw: string,
  outputLang: "ta" | "en" = "ta",
  extra: Partial<ContextInput> = {},
) {
  const context = ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang,
    people,
    ...extra,
  });
  return applyCandidatePolicy(getControlledCandidates(context), context)
    .candidates;
}

describe("controlled catalog keeps refusals and qualifiers", () => {
  it.each([
    "தலை வலி இல்ல",
    "head pain illa",
    "தலை வலிக்கல",
    "மாத்திரை வேணா",
    "தண்ணி வேணா",
    "Karthik phone illa",
    "கார்த்திக் ஃபோன் வேணா",
    "டிவி வேணா",
  ])(
    "never turns a colloquial refusal/denial into a positive request: %s",
    (raw) => {
      for (const lang of ["ta", "en"] as const)
        expect(
          suggest(raw, lang).filter((c) => c.polarity !== "negative"),
        ).toEqual([]);
    },
  );

  it("keeps the authored medicine refusal for an explicit colloquial refusal", () => {
    expect(suggest("மாத்திரை வேணா").map((c) => c.intentId)).toEqual([
      "medicine.refuse",
    ]);
  });

  it.each(["didn't take tablet", "மாத்திரை இல்ல", "can't take tablets"])(
    "asks instead of turning an adherence/supply/ability claim into a refusal: %s",
    (raw) => {
      expect(suggest(raw, "en")).toEqual([]);
    },
  );

  it.each([
    "இன்னும் சாப்பிடல",
    "இன்னும் வரல",
    "innum varala",
    "தண்ணி குடிச்சேன்",
    "தூக்கம் வரல",
    "டாக்டர் வந்தாரா",
    "டிவி வேணா",
    "எங்களுக்கு தண்ணி",
  ])(
    "abstains when a Tamil tense/negation/question qualifier is unexplained: %s",
    (raw) => {
      for (const lang of ["ta", "en"] as const) {
        expect(suggest(raw, lang)).toEqual([]);
        expect(
          getVocabularyCandidates({
            fragment: { modality: "text", raw },
            outputLang: lang,
          }),
        ).toEqual([]);
      }
    },
  );

  it("matches a one-syllable Tamil word on Tamil token boundaries", () => {
    expect(suggest("டீ வேணும்").map((c) => c.intentId)).toEqual(["daily.tea"]);
  });
});

describe("controlled pain wording keeps side and body part", () => {
  it.each([
    "my knee hurts right now",
    "knee pain right away",
    "alright knee pain",
    "he left, knee pain",
  ])("does not read an idiom as a body side: %s", (raw) => {
    const result = suggest(raw, "en");
    expect(result.some((c) => c.side)).toBe(false);
  });

  it("still uses an explicit side next to the body part", () => {
    const result = suggest("right knee pain", "en");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.side === "right")).toBe(true);
  });

  it.each([
    ["வயிற்று வலி", "stomach"],
    ["தலைவலி", "head"],
    ["வயிறு வலிக்கிறது", "stomach"],
  ])("keeps the body part in %s", (raw, part) => {
    const result = suggest(raw);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.bodyPart === part)).toBe(true);
  });

  it("treats the authored unbearable wording as intensity, not a denial", () => {
    expect(
      suggest("தலை வலி தாங்க முடியல").every((c) => c.bodyPart === "head"),
    ).toBe(true);
    expect(suggest("தலை வலி தாங்க முடியல").length).toBeGreaterThan(0);
  });
});

describe("contact wording", () => {
  it("uses the Tamil accusative for names ending in a consonant", () => {
    const texts = [
      ...suggest("Karthik phone").map((c) => c.text),
      ...suggest("Rao phone").map((c) => c.text),
    ];
    expect(texts).toContain("கார்த்திக்கை எனக்கு ஃபோன் பண்ண சொல்லுங்க.");
    expect(texts).toContain("ராவை எனக்கு ஃபோன் பண்ண சொல்லுங்க.");
    expect(texts.join(" ")).not.toMatch(/்யை/u);
    const school = getControlledCandidates(
      ContextPacketSchema.parse({
        fragment: { modality: "text", raw: "Karthik school" },
        outputLang: "ta",
        people,
      }),
    ).map((c) => c.text);
    expect(school).toContain("கார்த்திக்கை கூட்டிட்டு வாங்க.");
  });
});
