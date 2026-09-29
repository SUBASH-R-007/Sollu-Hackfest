import { describe, expect, it } from "vitest";
import { applyCandidatePolicy } from "./candidatePolicy";
import { getMockCandidates } from "./mock";
import { requiresPredefinedCommunication } from "./predefinedCommunication";
import { ContextPacketSchema } from "./schemas";

const context = (raw: string, outputLang: "ta" | "en" = "en") =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang,
  });
/** The prepared route shown to the patient (no generator). */
const prepared = (raw: string, lang: "ta" | "en" = "en") => {
  const c = context(raw, lang);
  expect(requiresPredefinedCommunication(c)).toBe(true);
  return applyCandidatePolicy(getMockCandidates(c), c).candidates.map(
    (item) => item.text,
  );
};

describe("Tanglish health input gets the same prepared cards as English", () => {
  it.each([
    ["thalai vali", "head pain"],
    ["thalaivali", "head pain"],
    ["thala vali", "head pain"],
    ["vayiru vali", "stomach pain"],
    ["vayitruvali", "stomach pain"],
    ["pal vali", "tooth pain"],
    ["nenju vali", "chest pain"],
    ["idathu kaal vali", "left leg pain"],
    ["udhavi", "help"],
    ["udhavi venum", "help"],
    ["help me please", "help"],
    ["please help me", "help"],
    ["maathirai", "medicine"],
    ["marunthu", "medicine"],
    ["raathiri maathirai", "night medicine"],
    ["maathirai venam", "medicine venam"],
  ])("%s ≡ %s", (tanglish, english) => {
    for (const lang of ["ta", "en"] as const) {
      const expected = prepared(english, lang);
      expect(expected.length).toBeGreaterThan(0);
      expect(prepared(tanglish, lang)).toEqual(expected);
    }
  });

  it.each([
    // Negated, multi-part, paired-without-side or bare body words keep asking.
    "thalai vali illa",
    "thalai valikala",
    "thalaivalikala",
    "thalai kaal vali",
    "kaal vali",
    "nenju",
    "2 maathirai",
    "no udhavi",
  ])("%s has no prepared card (clarification)", (raw) => {
    for (const lang of ["ta", "en"] as const)
      expect(prepared(raw, lang)).toEqual([]);
  });
});

describe("health routing gaps use prepared wording or clarification", () => {
  it.each([
    "I fell",
    "fell down",
    "fall",
    "I had a fall",
    "விழுந்துட்டேன்",
    "vizhunthuten",
    "hospital",
    "take me to hospital",
    "ஆஸ்பத்திரி",
    "cough",
    "sore",
    "sore throat",
    "swelling",
    "leg swollen",
    "loose motion",
    "constipation",
    "can't pee",
    "cannot pee",
    "BP",
    "blood pressure",
    "sugar",
    "சுகர்",
    "urgent",
    "diabetes",
  ])("%s routes before any generator", (raw) => {
    const c = context(raw);
    expect(requiresPredefinedCommunication(c)).toBe(true);
    // No prepared card invents an event, place or condition: at most a catalog card.
    const shown = applyCandidatePolicy(getMockCandidates(c), c).candidates;
    for (const item of shown) expect(item.source).not.toBe("model");
  });

  it("keeps everyday idioms and non-health words on the normal route", () => {
    for (const raw of [
      "fall asleep",
      "I can't fall asleep",
      "I fell asleep",
      "I need to pee",
      "coffee",
      "சக்கரை",
      "football",
      "hospitality",
    ])
      expect(requiresPredefinedCommunication(context(raw))).toBe(false);
    // Idiom removal is local: another fall in the same message still routes.
    expect(
      requiresPredefinedCommunication(context("I fell asleep and then fell")),
    ).toBe(true);
  });

  it("routes 'sugar' even as a food request, then asks rather than dropping the qualifier", () => {
    // Deliberate: English "sugar" often means diabetes (sugar level). A free-text sugar
    // qualifier has no authored renderer, so the prepared route asks for another word.
    for (const raw of ["coffee with sugar", "sugar in coffee"]) {
      const c = context(raw);
      expect(requiresPredefinedCommunication(c)).toBe(true);
      expect(applyCandidatePolicy(getMockCandidates(c), c).candidates).toEqual(
        [],
      );
    }
  });
});
