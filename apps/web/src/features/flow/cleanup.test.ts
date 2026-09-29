import { describe, expect, it } from "vitest";
import { cleanTranscript } from "./cleanup";

const words = (text: string) =>
  text
    .toLocaleLowerCase()
    .split(/\s+/u)
    .map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""))
    .filter(Boolean);

describe("Voice flow tidy-up", () => {
  it("removes filler sounds in English and Tamil", () => {
    expect(cleanTranscript("um I want uh water").text).toBe("I want water");
    expect(cleanTranscript("ம்ம் எனக்கு தண்ணி வேணும்").text).toBe(
      "எனக்கு தண்ணி வேணும்",
    );
    expect(cleanTranscript("Hmm, coffee please").removed).toEqual(["Hmm,"]);
  });
  it("removes stutter fragments without guessing words", () => {
    expect(cleanTranscript("I want w-w-water").text).toBe("I want water");
    expect(cleanTranscript("wa- water please").text).toBe("water please");
    // Hyphenated words and split words are not stutters.
    expect(cleanTranscript("my well-being").text).toBe("my well-being");
    expect(cleanTranscript("wa-ter").text).toBe("wa-ter");
  });
  it("collapses immediate repeats but keeps separated ones", () => {
    expect(cleanTranscript("I I want want tea").text).toBe("I want tea");
    expect(cleanTranscript("no no.").text).toBe("no.");
    expect(cleanTranscript("tea and more tea").text).toBe("tea and more tea");
  });
  it("keeps meaningful words, negation and question marks", () => {
    expect(cleanTranscript("I do not want water ?").text).toBe(
      "I do not want water ?",
    );
    expect(cleanTranscript("தண்ணி வேணா").text).toBe("தண்ணி வேணா");
    expect(cleanTranscript("").text).toBe("");
  });
  it("never adds or reorders words", () => {
    for (const input of [
      "um so I I think w-w-we should go go home uh now",
      "ம் அம்மா அம்மா இங்கே வாங்க",
      "please, please help",
    ]) {
      const output = words(cleanTranscript(input).text);
      const source = words(input.replace(/\b\p{L}{1,3}-(?=\p{L})/gu, ""));
      let cursor = 0;
      for (const word of output) {
        const found = source.indexOf(word, cursor);
        expect(found, `${word} in ${input}`).toBeGreaterThanOrEqual(0);
        cursor = found + 1;
      }
    }
  });
});
