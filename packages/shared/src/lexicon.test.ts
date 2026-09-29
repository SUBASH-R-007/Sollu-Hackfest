import { describe, expect, it } from "vitest";
import {
  bodyPartWords,
  containsTerm,
  hasNegation,
  hasQuestionCue,
  isRefusalOnly,
  sideMentions,
  withoutIdiomaticRight,
} from "./lexicon";
import { painParts } from "./phrases";

describe("shared negation lexicon", () => {
  it.each([
    "தலை வலி இல்ல",
    "head pain illa",
    "தலை வலிக்கல",
    "மாத்திரை வேணா",
    "தண்ணி வேணா",
    "Karthik phone illa",
    "கார்த்திக் ஃபோன் வேணா",
    "இன்னும் சாப்பிடல",
    "தூக்கம் வரல",
    "மூச்சு விட முடியலை",
    "எனக்கு தெரியல",
    "விருப்பமில்லை",
    "வரவில்லை",
    "innum varala",
    "thanni venaa",
    "venda",
    "mudiyala",
    "theriyala",
    "I didn't take it",
    "I can’t sleep",
    "no water",
  ])("recognises a refusal or denial: %s", (text) => {
    expect(hasNegation(text)).toBe(true);
  });

  it.each([
    "தண்ணி வேணும்",
    "கார்த்திக்கிட்ட ஃபோன்ல பேசணும்",
    "காலையில காபி",
    "டேபிள் மேல என்ன இருக்கு?",
    "தல வலி",
    "தலை வலிக்குது",
    "எனக்கு கவலை",
    "காலை வேலை",
    "வெளில போகணும்",
    "ungala miss panren",
    "thala vali",
    "kerala",
    "I want water",
  ])("does not treat ordinary words or locatives as negation: %s", (text) => {
    expect(hasNegation(text)).toBe(false);
  });

  it("separates an explicit refusal from adherence, supply or ability statements", () => {
    for (const text of ["மாத்திரை வேணா", "don't want tablets", "no tablets"])
      expect(isRefusalOnly(text)).toBe(true);
    for (const text of [
      "didn't take tablet",
      "மாத்திரை இல்ல",
      "can't take tablet",
      "tablet",
    ])
      expect(isRefusalOnly(text)).toBe(false);
  });
});

describe("body side cues", () => {
  it.each([
    ["my knee hurts right now", false, false],
    ["knee pain right away", false, false],
    ["alright knee pain", false, false],
    ["all right, knee pain", false, false],
    ["that's right, my knee", false, false],
    ["he left, knee pain", false, false],
    ["I left it at home", false, false],
    ["right knee pain", false, true],
    ["pain in my left knee", true, false],
    ["knee pain on the right", false, true],
    ["left and right knees", true, true],
    ["இடது முட்டி வலி", true, false],
    ["valathu kai vali", false, true],
  ])("%s", (text, left, right) => {
    expect(sideMentions(text)).toEqual({ left, right });
  });

  it("drops only an idiomatic right from content comparison", () => {
    expect(withoutIdiomaticRight("my knee hurts right now")).toBe(
      "my knee hurts now",
    );
    expect(withoutIdiomaticRight("right knee")).toBe("right knee");
  });

  it("covers every authored pain body part", () => {
    for (const part of painParts) {
      expect(bodyPartWords.en).toContain(part.en);
      expect(bodyPartWords.ta).toContain(part.ta);
    }
  });
});

describe("whole-term matching", () => {
  it.each([
    ["Please call Will.", "will", true],
    ["call Karthik", "Karthik", true],
    ["call Karthikeyan", "karthik", false],
    ["that's right now", "that's right", true],
    ["தண்ணி வேணும்", "தண்ணி", true],
    ["தண்ணீர்", "தண்ணி", false],
    ["two-tablets", "two", true],
    ["twofold", "two", false],
    ["anything", "", false],
  ])("containsTerm(%s, %s) = %s", (text, term, expected) => {
    expect(containsTerm(text, term)).toBe(expected);
  });
});

describe("question cues", () => {
  it.each(["எங்க", "தண்ணி எங்கே?", "எப்போது வருவாங்க", "enga", "where"])(
    "recognises %s",
    (text) => expect(hasQuestionCue(text)).toBe(true),
  );
  it.each(["எங்களுக்கு தண்ணி", "எங்கேயாவது", "என்னையும் சேர்த்து", "ஏன்னா"])(
    "does not match inside a longer Tamil word: %s",
    (text) => expect(hasQuestionCue(text)).toBe(false),
  );
});
