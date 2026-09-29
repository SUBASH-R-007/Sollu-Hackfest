import { describe, expect, it } from "vitest";
import { quickPhrases, vocabularyCatalog } from "@sollu/shared";
import { targetWordTokens } from "../rehab/analysis";
import {
  MAX_BUILD_WORDS,
  MIN_BUILD_WORDS,
  UNIT_DEFINITIONS,
  buildReviewLesson,
  buildStep,
  buildUnitLesson,
  builtMatches,
  canBuild,
  chooseOptions,
  findPhrase,
  reviewKeysFor,
  seededShuffle,
  suggestedUnit,
  unitOfPhrase,
  unitsFor,
  type CompanionLang,
  type CompanionPhrase,
} from "./content";
import { parseProgress, recordStep, defaultProgress } from "./progress";

const langs: CompanionLang[] = ["en", "ta"];
const norm = (value: string) => value.normalize("NFC").toLocaleLowerCase();
const authored = (lang: CompanionLang) =>
  new Set([
    ...Object.values(quickPhrases[lang]).map((item) => item.text),
    ...vocabularyCatalog.map((entry) =>
      lang === "ta" ? entry.taSentence : entry.enSentence,
    ),
  ]);

describe("units", () => {
  it.each(langs)("has every unit with 4–6 authored phrases in %s", (lang) => {
    const units = unitsFor(lang);
    expect(units.map((unit) => unit.id)).toEqual(
      UNIT_DEFINITIONS.map((unit) => unit.id),
    );
    expect(units.map((unit) => unit.id)).toEqual([
      "basics",
      "food",
      "comfort",
      "feelings",
      "repair",
    ]);
    const texts = authored(lang);
    for (const unit of units) {
      expect(unit.phrases.length).toBeGreaterThanOrEqual(4);
      expect(unit.phrases.length).toBeLessThanOrEqual(6);
      expect(unit.title.en && unit.title.ta).toBeTruthy();
      for (const phrase of unit.phrases) {
        expect(phrase.lang).toBe(lang);
        expect(phrase.text.trim()).not.toBe("");
        // Content is reused verbatim; nothing new is invented.
        expect(texts.has(phrase.text)).toBe(true);
        expect(phrase.key.startsWith(`${lang}:`)).toBe(true);
      }
      const unique = new Set(unit.phrases.map((phrase) => norm(phrase.text)));
      expect(unique.size).toBe(unit.phrases.length);
    }
  });

  it("uses the quick phrases for Basics", () => {
    expect(
      unitsFor("ta")[0]
        .phrases.slice(0, 4)
        .map((p) => p.text),
    ).toEqual([
      quickPhrases.ta.yes.text,
      quickPhrases.ta.no.text,
      quickPhrases.ta.wait.text,
      quickPhrases.ta.help.text,
    ]);
  });

  it("has stable, storable phrase keys that are unique across both languages", () => {
    const keys = langs.flatMap((lang) =>
      unitsFor(lang).flatMap((unit) =>
        unit.phrases.map((phrase) => phrase.key),
      ),
    );
    expect(new Set(keys).size).toBe(keys.length);
    let progress = defaultProgress();
    for (const key of keys)
      progress = recordStep(progress, "2026-09-29", { key, outcome: "missed" });
    expect(Object.keys(parseProgress(progress).items).sort()).toEqual(
      [...keys].sort(),
    );
    for (const key of keys) {
      expect(findPhrase(key)?.key).toBe(key);
      expect(unitOfPhrase(key)).toBeDefined();
    }
  });
});

describe("deterministic shuffles", () => {
  it("returns the same permutation for the same seed", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(seededShuffle(items, "a")).toEqual(seededShuffle(items, "a"));
    expect([...seededShuffle(items, "a")].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("choose options", () => {
  it.each(langs)(
    "always include the right phrase plus up to two distinct distractors (%s)",
    (lang) => {
      for (const unit of unitsFor(lang))
        for (const phrase of unit.phrases) {
          const options = chooseOptions(
            phrase,
            unit.phrases,
            `seed:${phrase.key}`,
          );
          expect(options.length).toBeLessThanOrEqual(3);
          expect(options.length).toBe(Math.min(3, unit.phrases.length));
          expect(
            options.filter((item) => item.key === phrase.key),
          ).toHaveLength(1);
          expect(new Set(options.map((item) => norm(item.text))).size).toBe(
            options.length,
          );
          expect(options.every((item) => unit.phrases.includes(item))).toBe(
            true,
          );
          expect(
            chooseOptions(phrase, unit.phrases, `seed:${phrase.key}`),
          ).toEqual(options);
        }
    },
  );

  it("returns fewer options rather than inventing filler", () => {
    const [first, second] = unitsFor("en")[1].phrases;
    expect(chooseOptions(first, [first], "s")).toEqual([first]);
    expect(chooseOptions(first, [first, second], "s")).toHaveLength(2);
    const twin: CompanionPhrase = {
      ...second,
      key: "en:twin",
      text: first.text,
    };
    expect(chooseOptions(first, [first, twin], "s")).toEqual([first]);
  });
});

describe("build the sentence", () => {
  it.each(langs)(
    "offers 2–6 word phrases only, as shuffled tiles (%s)",
    (lang) => {
      for (const unit of unitsFor(lang))
        for (const phrase of unit.phrases) {
          const count = targetWordTokens(phrase.text).length;
          const step = buildStep(phrase, `seed:${phrase.key}`, "id");
          if (count < MIN_BUILD_WORDS || count > MAX_BUILD_WORDS) {
            expect(step).toBeUndefined();
            expect(canBuild(phrase)).toBe(false);
            continue;
          }
          expect(step?.type).toBe("build");
          if (step?.type !== "build") continue;
          expect(step.words).toEqual(targetWordTokens(phrase.text));
          expect([...step.tileOrder].sort()).toEqual(
            step.words.map((_, index) => index),
          );
          // The tiles never start in the answer's order.
          expect(builtMatches(step.words, step.tileOrder)).toBe(false);
          expect(buildStep(phrase, `seed:${phrase.key}`, "id")).toEqual(step);
          expect(
            builtMatches(
              step.words,
              step.words.map((_, i) => i),
            ),
          ).toBe(true);
        }
    },
  );

  it("skips one-word phrases", () => {
    const yes = unitsFor("en")[0].phrases[0];
    expect(yes.text).toBe("Yes");
    expect(buildStep(yes, "s", "id")).toBeUndefined();
  });

  it("accepts either copy of a repeated word", () => {
    const words = ["no", "no", "thanks"];
    expect(builtMatches(words, [1, 0, 2])).toBe(true);
    expect(builtMatches(words, [0, 2, 1])).toBe(false);
    expect(builtMatches(words, [0, 1])).toBe(false);
  });
});

describe("lessons", () => {
  it.each(langs)(
    "builds five steps for every unit, deterministically (%s)",
    (lang) => {
      for (const unit of unitsFor(lang))
        for (let index = 0; index < 4; index++) {
          const lesson = buildUnitLesson(unit, index, lang);
          expect(lesson.steps).toHaveLength(5);
          expect(lesson.steps.map((step) => step.type)).toEqual([
            "listen",
            "choose",
            "listen",
            expect.stringMatching(/^(build|choose)$/u),
            "yourWay",
          ]);
          expect(new Set(lesson.steps.map((step) => step.id)).size).toBe(5);
          expect(
            lesson.steps.every((step) => unit.phrases.includes(step.phrase)),
          ).toBe(true);
          expect(buildUnitLesson(unit, index, lang)).toEqual(lesson);
        }
    },
  );

  it("includes a build step whenever the unit has a buildable phrase", () => {
    for (const lang of langs)
      for (const unit of unitsFor(lang)) {
        const lesson = buildUnitLesson(unit, 0, lang);
        const [a, , b, , c] = lesson.steps.map((step) => step.phrase);
        if ([a, b, c].some(canBuild))
          expect(lesson.steps[3].type).toBe("build");
      }
  });

  it("rotates through a unit's phrases over consecutive lessons", () => {
    const unit = unitsFor("en")[2];
    const seen = new Set<string>();
    for (let index = 0; index < unit.phrases.length; index++)
      for (const step of buildUnitLesson(unit, index, "en").steps)
        seen.add(step.phrase.key);
    expect(seen.size).toBe(unit.phrases.length);
  });

  it("reviews at most five due phrases in their own language", () => {
    const keys = unitsFor("ta").flatMap((unit) =>
      unit.phrases.map((phrase) => phrase.key),
    );
    const lesson = buildReviewLesson(
      ["ta:unknown", ...keys],
      "ta",
      "2026-09-29",
    );
    expect(lesson.kind).toBe("review");
    expect(lesson.steps).toHaveLength(5);
    expect(lesson.steps.map((step) => step.phrase.key)).toEqual(
      keys.slice(0, 5),
    );
    expect(lesson.steps.every((step) => step.phrase.lang === "ta")).toBe(true);
    expect(buildReviewLesson(keys, "ta", "2026-09-29")).toEqual(
      buildReviewLesson(keys, "ta", "2026-09-29"),
    );
    expect(buildReviewLesson(["en:daily.tea"], "ta", "x").steps).toEqual([]);
  });
});

describe("what comes next", () => {
  it("suggests the unit with the fewest finished lessons, in path order", () => {
    const units = unitsFor("en");
    expect(suggestedUnit(units, {}, "en")?.id).toBe("basics");
    expect(
      suggestedUnit(units, { "basics:en": 1, "food:en": 1 }, "en")?.id,
    ).toBe("comfort");
    expect(suggestedUnit(units, { "basics:ta": 3 }, "en")?.id).toBe("basics");
  });

  it("lists due review keys only for phrases that still exist", () => {
    const items = {
      "en:daily.tea": {
        box: 1 as const,
        due: "2026-09-29",
        lastSeen: "2026-09-28",
        words: [],
      },
      "en:daily.retired": {
        box: 1 as const,
        due: "2026-09-29",
        lastSeen: "2026-09-28",
        words: [],
      },
      "ta:daily.tea": {
        box: 1 as const,
        due: "2026-09-29",
        lastSeen: "2026-09-28",
        words: [],
      },
      "en:daily.milk": {
        box: 2 as const,
        due: "2026-10-02",
        lastSeen: "2026-09-28",
        words: [],
      },
    };
    expect(reviewKeysFor(items, "2026-09-29", "en")).toEqual(["en:daily.tea"]);
  });
});
