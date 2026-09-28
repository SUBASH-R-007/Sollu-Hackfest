import { describe, expect, it } from "vitest";
import { FragmentSchema } from "@sollu/shared";
import { extractTranscript } from "./transcript";

const results = (...segments: string[][]) =>
  segments.map((segment) => segment.map((transcript) => ({ transcript })));

describe("recognizer transcript extraction", () => {
  it("returns complete utterances and keeps each recognizer rank aligned", () => {
    expect(
      extractTranscript(
        results(
          ["I do not want", "I don't want", "I did not want"],
          ["water.", "tea.", "coffee."],
        ),
      ),
    ).toEqual({
      text: "I do not want water.",
      alternatives: [
        "I do not want water.",
        "I don't want tea.",
        "I did not want coffee.",
      ],
    });
  });

  it("falls back to the best segment where another segment has more alternatives", () => {
    expect(
      extractTranscript(
        results(
          ["எனக்கு"],
          ["தண்ணீர் வேண்டாம்.", "தேநீர் வேண்டாம்.", "காபி வேண்டாம்."],
        ),
      ),
    ).toEqual({
      text: "எனக்கு தண்ணீர் வேண்டாம்.",
      alternatives: [
        "எனக்கு தண்ணீர் வேண்டாம்.",
        "எனக்கு தேநீர் வேண்டாம்.",
        "எனக்கு காபி வேண்டாம்.",
      ],
    });
  });

  it("preserves exact negation, Tamil/Tanglish spelling, casing and punctuation", () => {
    const primary = "தண்ணி வேண்டாம்; Tea venam — NOT water!";
    expect(extractTranscript(results([primary]))).toEqual({
      text: primary,
      alternatives: [primary],
    });
  });

  it("adds the existing Keep Listening draft to every alternative", () => {
    expect(
      extractTranscript(results(["want water", "want tea"]), "I do not"),
    ).toEqual({
      text: "I do not want water",
      alternatives: ["I do not want water", "I do not want tea"],
    });
  });

  it("deduplicates exact whole utterances without merging opposite meanings", () => {
    expect(
      extractTranscript(
        results(["no water", "no water", "water please", "ignored fourth"]),
      ),
    ).toEqual({
      text: "no water",
      alternatives: ["no water", "water please"],
    });
  });

  it("does not merge or rewrite similar alternatives", () => {
    expect(
      extractTranscript(results(["No water.", "no water.", "No water!"]))
        .alternatives,
    ).toEqual(["No water.", "no water.", "No water!"]);
  });

  it("handles empty results, empty alternatives and whitespace-only fragments", () => {
    expect(extractTranscript(results())).toEqual({
      text: "",
      alternatives: [],
    });
    expect(extractTranscript(results([], ["  no  water  ", " "]))).toEqual({
      text: "no  water",
      alternatives: ["no  water"],
    });
    expect(extractTranscript(results(), "  No, please wait.  ")).toEqual({
      text: "No, please wait.",
      alternatives: ["No, please wait."],
    });
  });

  it("omits overlong alternatives rather than dropping their ending negation", () => {
    const long = `${"water ".repeat(21)}வேண்டாம்`;
    const extracted = extractTranscript(results([long, "தண்ணீர் வேண்டாம்."]));
    expect(extracted.text).toBe(long);
    expect(extracted.alternatives).toEqual(["தண்ணீர் வேண்டாம்."]);
  });

  it("bounds raw input at 500 and alternatives at 120 for the Context contract", () => {
    const extracted = extractTranscript(
      results(["a".repeat(501), "b".repeat(120), "c".repeat(121)]),
    );
    expect(extracted.text).toHaveLength(500);
    expect(extracted.alternatives).toEqual(["b".repeat(120)]);
    expect(
      FragmentSchema.safeParse({
        modality: "speech",
        raw: extracted.text,
        sttAlternatives: extracted.alternatives,
      }).success,
    ).toBe(true);
  });

  it("does not split a UTF-16 surrogate pair at the raw-input bound", () => {
    const extracted = extractTranscript(results([`${"a".repeat(499)}🙂`]));
    expect(extracted.text).toBe("a".repeat(499));
    expect(extracted.alternatives).toEqual([]);
  });
});
