import { describe, expect, it } from "vitest";
import { CandidateSchema } from "./schemas";
import {
  getVocabularyCandidate,
  getVocabularyCandidates,
  searchVocabulary,
  vocabularyCatalog,
  vocabularyCategories,
} from "./vocabulary";
import {
  canonicalText,
  getPainCandidates,
  getPainFollowupCandidates,
  painParts,
} from "./phrases";

describe("offline vocabulary content contracts", () => {
  it("has unique meanings, complete bilingual phrases and honest review metadata", () => {
    expect(new Set(vocabularyCatalog.map((v) => v.id)).size).toBe(
      vocabularyCatalog.length,
    );
    expect(new Set(vocabularyCatalog.map((v) => v.enSentence)).size).toBe(
      vocabularyCatalog.length,
    );
    for (const category of vocabularyCategories)
      expect(vocabularyCatalog.some((v) => v.category === category)).toBe(true);
    for (const v of vocabularyCatalog) {
      expect(v.id).toMatch(/^[a-z]+\.[a-z_]+$/);
      expect(v.nativeReview).toBe("pending");
      expect(v.taSentence).toMatch(/[\u0B80-\u0BFF]/u);
      for (const lang of ["ta", "en"] as const) {
        const c = getVocabularyCandidate(v.id, lang)!;
        expect(CandidateSchema.safeParse(c).success, v.id).toBe(true);
        expect(c.text.length, v.id).toBeLessThanOrEqual(90);
        expect(c.intentId).toBe(v.id);
        expect(c.source).toBe("catalog");
        expect(canonicalText("default", c.text, lang)).toBe(true);
      }
    }
  });
  it.each([
    ["thanni", "daily.water"],
    ["தண்ணீர்", "daily.water"],
    ["water venum", "daily.water"],
    ["tanni venam", "refuse.water"],
    ["தண்ணி வேண்டாம்", "refuse.water"],
    ["no food", "refuse.food"],
    ["valikala", "health.no_pain"],
    ["வலி இல்லை", "health.no_pain"],
    ["vali", "health.pain"],
    ["light off", "daily.light_off"],
    ["fan off pannunga", "daily.fan_off"],
    ["puriyala", "repair.dont_understand"],
    ["puriyuthu", "repair.understand"],
    ["pidikala", "social.dislike"],
    ["pidikkum", "social.like"],
    ["en mudivu", "identity.my_choice"],
    ["nandri", "social.thanks"],
    ["oru kelvi", "repair.one_question"],
    ["dosai", "daily.dosa"],
    ["paal", "daily.milk"],
    ["bottle", "daily.bottle"],
  ])("retrieves %s without reversing meaning", (raw, id) => {
    const rows = getVocabularyCandidates({
      fragment: { modality: "text", raw },
      outputLang: "ta",
    });
    expect(rows.map((c) => c.intentId)).toEqual([id]);
  });
  it.each([
    "no water but tea",
    "water instead of coffee",
    "left water",
    "two tablets",
    "yesterday water",
    "தண்ணி வேண்டாம் ஆனா டீ வேணும்",
    "don't want rice",
  ])(
    "abstains rather than inventing a compound or unsupported meaning: %s",
    (raw) => {
      expect(
        getVocabularyCandidates({
          fragment: { modality: "text", raw },
          outputLang: "en",
        }),
      ).toEqual([]);
    },
  );
  it("excludes a rejected exact meaning and never fills remaining slots with duplicates", () => {
    const c = getVocabularyCandidate("daily.water", "ta")!;
    expect(
      getVocabularyCandidates({
        fragment: { modality: "text", raw: "thanni" },
        outputLang: "ta",
        exclude: [c.text],
      }),
    ).toEqual([]);
  });
  it("search supports categories and Tamil or Tanglish regardless of output-language preference", () => {
    expect(searchVocabulary("thanni", { lang: "en" })[0]?.id).toBe(
      "daily.water",
    );
    expect(
      searchVocabulary("", { category: "repair", limit: 100 }).every(
        (v) => v.category === "repair",
      ),
    ).toBe(true);
    expect(searchVocabulary("zzzxq unknown")).toEqual([]);
    expect(getVocabularyCandidate("unknown", "en")).toBeUndefined();
  });
  it.each([
    ["food", "rice", "daily.rice"],
    ["food", "idli", "daily.idli"],
    ["food", "dosa", "daily.dosa"],
    ["drink", "water", "daily.water"],
    ["drink", "coffee", "daily.coffee"],
  ])(
    "does not confuse the topic parent %s with selected leaf %s",
    (parent, leaf, id) => {
      expect(
        getVocabularyCandidates({
          fragment: {
            modality: "topic",
            raw: `${leaf} ${parent} ${leaf}`,
            topicPath: [parent, leaf],
          },
          outputLang: "en",
        }).map((c) => c.intentId),
      ).toEqual([id]);
    },
  );
});

describe("body and side identity across pain rounds", () => {
  it("never changes shoulder to arm during repair", () => {
    for (const lang of ["ta", "en"] as const)
      for (const side of ["left", "right"] as const) {
        const candidates = getPainFollowupCandidates("shoulder", side, lang);
        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) {
          expect(c.bodyPart).toBe("shoulder");
          expect(c.side).toBe(side);
          expect(c.gloss_en).toContain(`${side} shoulder`);
          expect(c.gloss_en).not.toMatch(/arm|wrist/);
          expect(canonicalText("template", c.text, lang)).toBe(true);
        }
      }
  });
  it("requires explicit side on paired parts and never offers invented chest symptoms", () => {
    for (const p of painParts.filter((p) => p.paired)) {
      expect(getPainCandidates(p.id, undefined, "ta")).toEqual([]);
      expect(getPainFollowupCandidates(p.id, undefined, "ta")).toEqual([]);
    }
    expect(
      getPainCandidates("chest", undefined, "en").some((c) =>
        /breathe|tight/.test(c.text),
      ),
    ).toBe(false);
  });
});
