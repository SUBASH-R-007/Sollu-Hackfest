import { quickPhrases, vocabularyCatalog } from "@sollu/shared";
import { targetWordTokens } from "../rehab/analysis";
import { dueKeys, type ReviewItem } from "./scheduler";

export type CompanionLang = "en" | "ta";

/** One practice phrase, taken verbatim from authored app content. */
export interface CompanionPhrase {
  /** Stable progress key: `<lang>:<source id>`. */
  key: string;
  icon: string;
  /** The exact sentence shown, previewed and practised. */
  text: string;
  /** A short picture cue (the catalog's own word); absent for quick phrases. */
  cue?: string;
  lang: CompanionLang;
}
export interface CompanionUnit {
  id: string;
  icon: string;
  title: { en: string; ta: string };
  phrases: CompanionPhrase[];
}

type Source = { quick: "yes" | "no" | "wait" | "help" } | { vocab: string };
interface UnitDefinition {
  id: string;
  icon: string;
  title: { en: string; ta: string };
  sources: Source[];
}

/** Units reuse authored catalog sentences so almost no new wording is needed. */
export const UNIT_DEFINITIONS: readonly UnitDefinition[] = [
  {
    id: "basics",
    icon: "👍",
    title: { en: "Basics", ta: "அடிப்படைச் சொற்கள்" },
    sources: [
      { quick: "yes" },
      { quick: "no" },
      { quick: "wait" },
      { quick: "help" },
      { vocab: "social.thanks" },
    ],
  },
  {
    id: "food",
    icon: "🍵",
    title: { en: "Drinks & food", ta: "குடிக்க, சாப்பாடு" },
    sources: [
      { vocab: "daily.water" },
      { vocab: "daily.tea" },
      { vocab: "daily.coffee" },
      { vocab: "daily.milk" },
      { vocab: "daily.rice" },
      { vocab: "daily.idli" },
    ],
  },
  {
    id: "comfort",
    icon: "🛏️",
    title: { en: "Comfort", ta: "வசதி" },
    sources: [
      { vocab: "daily.rest" },
      { vocab: "daily.blanket" },
      { vocab: "daily.fan" },
      { vocab: "daily.light" },
      { vocab: "daily.toilet" },
      { vocab: "daily.quiet" },
    ],
  },
  {
    id: "feelings",
    icon: "😊",
    title: { en: "Feelings", ta: "உணர்வுகள்" },
    sources: [
      { vocab: "feeling.happy" },
      { vocab: "feeling.sad" },
      { vocab: "feeling.tired" },
      { vocab: "feeling.calm" },
      { vocab: "feeling.worried" },
      { vocab: "feeling.confused" },
    ],
  },
  {
    id: "repair",
    icon: "⏳",
    title: { en: "Time & repair", ta: "புரிய வைக்க" },
    sources: [
      { vocab: "repair.time" },
      { vocab: "repair.repeat" },
      { vocab: "repair.slower" },
      { vocab: "repair.wrong" },
      { vocab: "repair.dont_understand" },
      { vocab: "repair.finish" },
    ],
  },
];

function phraseFrom(
  source: Source,
  lang: CompanionLang,
): CompanionPhrase | undefined {
  if ("quick" in source) {
    const phrase = quickPhrases[lang][source.quick];
    return {
      key: `${lang}:quick.${source.quick}`,
      icon: phrase.icon,
      text: phrase.text,
      lang,
    };
  }
  const entry = vocabularyCatalog.find((item) => item.id === source.vocab);
  if (!entry) return undefined;
  return {
    key: `${lang}:${entry.id}`,
    icon: entry.icon,
    text: lang === "ta" ? entry.taSentence : entry.enSentence,
    cue: lang === "ta" ? entry.ta : entry.en,
    lang,
  };
}

/** Units in one language. Missing catalog entries are dropped, never invented. */
export function unitsFor(lang: CompanionLang): CompanionUnit[] {
  return UNIT_DEFINITIONS.map((unit) => {
    const seen = new Set<string>();
    const phrases = unit.sources
      .map((source) => phraseFrom(source, lang))
      .filter((phrase): phrase is CompanionPhrase => {
        if (!phrase || !phrase.text.trim()) return false;
        const normal = phrase.text.normalize("NFC");
        if (seen.has(normal)) return false;
        seen.add(normal);
        return true;
      });
    return { id: unit.id, icon: unit.icon, title: unit.title, phrases };
  }).filter((unit) => unit.phrases.length > 0);
}

export function findPhrase(key: string): CompanionPhrase | undefined {
  const lang = key.startsWith("ta:") ? "ta" : "en";
  for (const unit of unitsFor(lang)) {
    const phrase = unit.phrases.find((item) => item.key === key);
    if (phrase) return phrase;
  }
  return undefined;
}
export function unitOfPhrase(key: string): CompanionUnit | undefined {
  const lang = key.startsWith("ta:") ? "ta" : "en";
  return unitsFor(lang).find((unit) =>
    unit.phrases.some((phrase) => phrase.key === key),
  );
}

// ---------- deterministic randomness ----------

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** mulberry32: small seeded generator so tests and screens are repeatable. */
function generator(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = generator(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------- lesson steps ----------

export const MIN_BUILD_WORDS = 2;
export const MAX_BUILD_WORDS = 6;

export type LessonStep =
  | { type: "listen"; id: string; phrase: CompanionPhrase }
  | {
      type: "choose";
      id: string;
      phrase: CompanionPhrase;
      options: CompanionPhrase[];
    }
  | {
      type: "build";
      id: string;
      phrase: CompanionPhrase;
      words: string[];
      /** Indices into `words`, in the order the tiles are shown. */
      tileOrder: number[];
    }
  | { type: "yourWay"; id: string; phrase: CompanionPhrase };

export interface Lesson {
  kind: "unit" | "review";
  unitId?: string;
  lang: CompanionLang;
  steps: LessonStep[];
}

export function canBuild(phrase: CompanionPhrase): boolean {
  const count = targetWordTokens(phrase.text).length;
  return count >= MIN_BUILD_WORDS && count <= MAX_BUILD_WORDS;
}

/** The right phrase plus up to two distinct distractors from the same unit. */
export function chooseOptions(
  phrase: CompanionPhrase,
  pool: readonly CompanionPhrase[],
  seed: string,
): CompanionPhrase[] {
  const norm = (value: string) => value.normalize("NFC").toLocaleLowerCase();
  const others = pool.filter(
    (item) => item.key !== phrase.key && norm(item.text) !== norm(phrase.text),
  );
  // Prefer a different picture, so the icon cue stays meaningful.
  const ordered = seededShuffle(others, `${seed}:distractors`).sort(
    (a, b) => Number(a.icon === phrase.icon) - Number(b.icon === phrase.icon),
  );
  const distractors: CompanionPhrase[] = [];
  for (const item of ordered) {
    if (distractors.length === 2) break;
    if (distractors.some((chosen) => norm(chosen.text) === norm(item.text)))
      continue;
    distractors.push(item);
  }
  return seededShuffle([phrase, ...distractors], `${seed}:options`);
}

export function buildStep(
  phrase: CompanionPhrase,
  seed: string,
  id: string,
): LessonStep | undefined {
  if (!canBuild(phrase)) return undefined;
  const words = targetWordTokens(phrase.text);
  const identity = words.map((_, index) => index);
  let order = seededShuffle(identity, `${seed}:tiles`);
  const sameSequence = (candidate: number[]) =>
    candidate.every((value, index) => words[value] === words[index]);
  // Never present the answer already in order when another order exists.
  if (sameSequence(order)) order = [...order.slice(1), order[0]];
  return { type: "build", id, phrase, words, tileOrder: order };
}

/**
 * Five short steps from one unit. Consecutive lessons rotate through the
 * unit's phrases so every phrase appears over time.
 */
export function buildUnitLesson(
  unit: CompanionUnit,
  lessonIndex: number,
  lang: CompanionLang,
): Lesson {
  const phrases = unit.phrases;
  const n = phrases.length;
  const start = n ? (Math.max(0, Math.floor(lessonIndex)) * 2) % n : 0;
  const pick = (offset: number) => phrases[(start + offset) % n];
  const a = pick(0),
    b = pick(1),
    c = pick(2);
  const seed = `${unit.id}:${lang}:${lessonIndex}`;
  const steps: LessonStep[] = [];
  if (!n) return { kind: "unit", unitId: unit.id, lang, steps };
  steps.push({ type: "listen", id: `${seed}:1`, phrase: a });
  steps.push({
    type: "choose",
    id: `${seed}:2`,
    phrase: a,
    options: chooseOptions(a, phrases, `${seed}:2`),
  });
  steps.push({ type: "listen", id: `${seed}:3`, phrase: b });
  const built =
    buildStep(b, `${seed}:4`, `${seed}:4`) ??
    buildStep(a, `${seed}:4`, `${seed}:4`) ??
    buildStep(c, `${seed}:4`, `${seed}:4`);
  steps.push(
    built ?? {
      type: "choose",
      id: `${seed}:4`,
      phrase: b,
      options: chooseOptions(b, phrases, `${seed}:4`),
    },
  );
  steps.push({ type: "yourWay", id: `${seed}:5`, phrase: c });
  return { kind: "unit", unitId: unit.id, lang, steps };
}

/** A review of due phrases (at most five), alternating exercise types. */
export function buildReviewLesson(
  dueKeys: readonly string[],
  lang: CompanionLang,
  seed: string,
): Lesson {
  const units = unitsFor(lang);
  const steps: LessonStep[] = [];
  for (const key of dueKeys) {
    if (steps.length === 5) break;
    const unit = units.find((item) =>
      item.phrases.some((phrase) => phrase.key === key),
    );
    const phrase = unit?.phrases.find((item) => item.key === key);
    if (!unit || !phrase) continue;
    const id = `review:${seed}:${steps.length + 1}`;
    const turn = steps.length % 3;
    if (turn === 1 && unit.phrases.length > 1)
      steps.push({
        type: "choose",
        id,
        phrase,
        options: chooseOptions(phrase, unit.phrases, id),
      });
    else if (turn === 2 && canBuild(phrase))
      steps.push(buildStep(phrase, id, id)!);
    else steps.push({ type: "listen", id, phrase });
  }
  return { kind: "review", lang, steps };
}

/** Compare a rebuilt tile sequence with the phrase's words. */
export function builtMatches(words: readonly string[], placed: number[]) {
  return (
    placed.length === words.length &&
    placed.every((index, position) => words[index] === words[position])
  );
}

// ---------- what comes next ----------

/** The unit with the fewest finished lessons in this language (path order breaks ties). */
export function suggestedUnit(
  units: readonly CompanionUnit[],
  lessons: Readonly<Record<string, number>>,
  lang: CompanionLang,
): CompanionUnit | undefined {
  let best: CompanionUnit | undefined;
  for (const unit of units) {
    const done = lessons[`${unit.id}:${lang}`] ?? 0;
    if (!best || done < (lessons[`${best.id}:${lang}`] ?? 0)) best = unit;
  }
  return best;
}

/** Due phrases that still exist in this language's units, most overdue first. */
export function reviewKeysFor(
  items: Readonly<Record<string, ReviewItem>>,
  today: string,
  lang: CompanionLang,
): string[] {
  const known = new Set(
    unitsFor(lang).flatMap((unit) => unit.phrases.map((phrase) => phrase.key)),
  );
  return dueKeys(items, today, `${lang}:`).filter((key) => known.has(key));
}
