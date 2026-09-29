import { describe, expect, it } from "vitest";
import {
  generatedSentencesJsonSchema,
  resolveGeneratedSentences,
  type GeneratedSentence,
} from "./modelGrounding";
import { ContextPacketSchema, type ContextPacket } from "./schemas";

const context = (
  raw: string,
  outputLang: "ta" | "en" = "en",
  extra: Partial<ContextPacket> = {},
) =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang,
    ...extra,
  });
const sentence = (
  c: ContextPacket,
  overrides: Partial<GeneratedSentence> = {},
  translation_en = "",
): GeneratedSentence => ({
  text: overrides.gloss_en ?? "",
  gloss_en: "",
  speechAct: "request",
  polarity: "positive",
  side: "none",
  evidence: [{ path: "fragment.raw", quote: c.fragment.raw, translation_en }],
  ...overrides,
});
const run = (c: ContextPacket, ...candidates: GeneratedSentence[]) =>
  resolveGeneratedSentences({ candidates, clarification: false }, c);

describe("model validator polarity for Tamil", () => {
  const c = context("தூக்கம் வரல", "ta");
  it("drops a positive reading of a suffix-negated fragment", () => {
    const result = run(
      c,
      sentence(
        c,
        { text: "எனக்கு தூங்கணும்.", gloss_en: "I want to sleep." },
        "I cannot sleep",
      ),
    );
    expect(result.candidates).toEqual([]);
    expect(result.reasons[0].code).toBe("polarity");
  });

  it("keeps the faithful negative reading", () => {
    const result = run(
      c,
      sentence(
        c,
        {
          text: "எனக்கு தூக்கம் வரல.",
          gloss_en: "I cannot sleep.",
          speechAct: "report",
          polarity: "negative",
        },
        "I cannot sleep",
      ),
    );
    expect(result.reasons).toEqual([]);
    expect(result.candidates).toHaveLength(1);
  });

  it("abstains when the model's own fragment translation disagrees with the recognised polarity", () => {
    const result = run(
      c,
      sentence(
        c,
        { text: "எனக்கு தூங்கணும்.", gloss_en: "I want to sleep." },
        "I want to sleep",
      ),
    );
    expect(result.candidates).toEqual([]);
    expect(result.reasons[0].code).toBe("polarity");
  });

  it("recognises a fused இல்லை form", () => {
    const fused = context("விருப்பமில்லை", "ta");
    expect(
      run(
        fused,
        sentence(
          fused,
          { text: "எனக்கு பிடிச்சிருக்கு.", gloss_en: "I like it." },
          "I do not like it",
        ),
      ).reasons[0].code,
    ).toBe("polarity");
  });
});

describe("model validator evidence", () => {
  it("compares the full Tamil quote after NFC normalization", () => {
    const raw = "தண்ணி கொடுங்க";
    const c = context(raw.normalize("NFD"), "ta");
    expect(c.fragment.raw).not.toBe(raw);
    const result = run(c, {
      ...sentence(c, {
        text: "எனக்கு தண்ணி வேணும்.",
        gloss_en: "I want water.",
      }),
      evidence: [
        { path: "fragment.raw", quote: raw, translation_en: "give water" },
      ],
    });
    expect(result.reasons.map((r) => r.code)).not.toContain("evidence");
    expect(result.candidates).toHaveLength(1);
  });

  it("accepts a translation of a Tanglish fragment when the output is Tamil", () => {
    const c = context("thanni venum", "ta");
    const result = run(
      c,
      sentence(
        c,
        { text: "எனக்கு தண்ணி வேணும்.", gloss_en: "I want water." },
        "want water",
      ),
    );
    expect(result.reasons).toEqual([]);
    expect(result.candidates).toHaveLength(1);
  });

  it("still rejects a translation on English output or Tamil text in a translation", () => {
    const english = context("water please");
    expect(
      run(english, sentence(english, { gloss_en: "Water, please." }, "water"))
        .reasons[0].code,
    ).toBe("evidence");
    const tanglish = context("thanni venum", "ta");
    expect(
      run(
        tanglish,
        sentence(
          tanglish,
          { text: "எனக்கு தண்ணி வேணும்.", gloss_en: "I want water." },
          "தண்ணி",
        ),
      ).reasons[0].code,
    ).toBe("evidence");
    expect(
      run(english, sentence(english, { gloss_en: "Water, please." }))
        .candidates,
    ).toHaveLength(1);
  });
});

describe("model validator names and sides", () => {
  it.each([
    ["Yes. Water please", "Yes, water please."],
    ["I want Coffee now", "I want coffee now."],
    ["I Want water", "I want water."],
  ])(
    "does not treat a capitalised ordinary word as a required name: %s",
    (raw, gloss) => {
      const c = context(raw);
      const result = run(c, sentence(c, { gloss_en: gloss }));
      expect(result.reasons).toEqual([]);
      expect(result.candidates).toHaveLength(1);
    },
  );

  it("requires a mentioned person case-insensitively", () => {
    const people = [{ name: "Karthik", relation: "son", aliases: [] }];
    const c = context("call karthik", "en", { people });
    expect(
      run(c, sentence(c, { gloss_en: "Please call Karthik." })).candidates,
    ).toHaveLength(1);
    expect(
      run(c, sentence(c, { gloss_en: "Please call." })).reasons[0].code,
    ).toBe("context");
  });

  it("does not read right now as a body side", () => {
    const c = context("my knee hurts right now");
    const result = run(
      c,
      sentence(c, {
        gloss_en: "My knee hurts now.",
        speechAct: "report",
      }),
    );
    expect(result.reasons).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    const explicit = context("my right knee hurts");
    expect(
      run(
        explicit,
        sentence(explicit, { gloss_en: "My knee hurts.", speechAct: "report" }),
      ).reasons[0].code,
    ).toBe("side");
  });
});

describe("provider JSON schema", () => {
  it("matches the Zod non-empty string bounds", () => {
    const item = (
      generatedSentencesJsonSchema.properties as Record<
        string,
        { items: { properties: Record<string, Record<string, unknown>> } }
      >
    ).candidates.items;
    expect(item.properties.text.minLength).toBe(1);
    expect(item.properties.gloss_en.minLength).toBe(1);
    const evidence = (
      item.properties.evidence as unknown as {
        items: { properties: Record<string, Record<string, unknown>> };
      }
    ).items;
    expect(evidence.properties.quote.minLength).toBe(1);
    expect(evidence.properties.path.minLength).toBe(1);
    expect(evidence.properties.translation_en.minLength).toBeUndefined();
  });
});
