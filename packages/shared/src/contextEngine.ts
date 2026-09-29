import type { ContextPacket, TopicId } from "./schemas";
import { vocabularyCatalog } from "./vocabulary";

const normalize = (value: string) => value.normalize("NFC").toLowerCase();
const tokens = (value: string) =>
  normalize(value).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, value: string) =>
  new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${escape(normalize(value))}(?=$|[^\\p{L}\\p{M}\\p{N}])`,
    "u",
  ).test(normalize(text));

// Each explicit drink keeps its identity, including colloquial catalog aliases (தண்ணி,
// thanneer, kapi): 'usual தண்ணி' must not resolve to a coffee routine. English words that
// are also Tanglish spellings (pal = friend, tee) are not drink cues.
const ambiguousDrinkAliases = new Set(["pal", "tee"]);
const drinkAliases = (objectId: string, extra: string[]) => [
  ...new Set([
    ...extra,
    ...vocabularyCatalog
      .filter(
        (entry) => entry.category === "daily" && entry.objectId === objectId,
      )
      .flatMap((entry) => [
        entry.en.toLowerCase(),
        entry.ta,
        ...entry.aliases.en,
        ...entry.aliases.ta,
        ...entry.aliases.tanglish,
      ])
      .filter((alias) => !ambiguousDrinkAliases.has(alias)),
  ]),
];
const drinkConcepts = [
  drinkAliases("water", ["water", "தண்ணீர்", "thanni", "tanni"]),
  drinkAliases("tea", ["tea", "தேநீர்", "டீ"]),
  drinkAliases("coffee", ["coffee", "காபி", "kaapi"]),
  ["juice", "சாறு"],
  drinkAliases("milk", ["milk", "பால்", "paal"]),
];
// Topic cues help rank an existing caregiver-confirmed routine. They never author a sentence.
const topicCues: Record<TopicId, string[]> = {
  medicine: [
    "medicine",
    "medication",
    "tablets",
    "pills",
    "மருந்து",
    "மாத்திரை",
  ],
  food: [
    "food",
    "eat",
    "meal",
    "breakfast",
    "lunch",
    "dinner",
    "உணவு",
    "சாப்பாடு",
  ],
  drink: [
    "drink",
    "beverage",
    "water",
    "tea",
    "coffee",
    "juice",
    "milk",
    "தண்ணீர்",
    "தேநீர்",
    "காபி",
    "பால்",
    "பானம்",
    "குடிக்க",
    // Colloquial catalog drink names (தண்ணி, thanneer, பாலு) are drink cues too.
    ...drinkConcepts.flat(),
  ],
  toilet: ["toilet", "bathroom", "கழிப்பறை"],
  pain: ["pain", "hurt", "hurts", "வலி"],
  people: ["people", "call", "visit", "family", "பேச", "அழைக்க"],
  feelings: ["feelings", "happy", "sad", "worried", "மகிழ்ச்சி", "கவலை"],
  rest: ["rest", "sleep", "nap", "bed", "ஓய்வு", "தூக்கம்"],
  tv_phone: ["tv", "television", "phone", "music", "டிவி", "தொலைபேசி", "இசை"],
  prayer: ["prayer", "pray", "worship", "பிரார்த்தனை", "வழிபாடு"],
  go_out: ["outside", "walk", "garden", "out", "வெளியே", "நடை", "தோட்டம்"],
};
const genericCategoryWords = new Set([
  "drink",
  "beverage",
  "food",
  "meal",
  "பானம்",
  "உணவு",
  "சாப்பாடு",
  "குடிக்க",
]);
const referenceGrammar = new Set([
  "i",
  "my",
  "a",
  "an",
  "the",
  "some",
  "any",
  "want",
  "need",
  "would",
  "like",
  "please",
  "to",
  "have",
  "get",
  "can",
  "could",
  "may",
  "do",
  "not",
  "no",
  "dont",
  "don",
  "t",
  "never",
  "maybe",
  "might",
  "perhaps",
  "எனக்கு",
  "வேண்டும்",
  "வேண்டாம்",
  "இல்லை",
  "கொஞ்சம்",
]);

function clockMinutes(value: string | undefined): number | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hour, minute] = value.split(":").map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : undefined;
}
const dayparts = [
  {
    aliases: ["morning", "காலை"],
    matches: (minute: number) => minute >= 240 && minute < 720,
  },
  {
    aliases: ["midday", "noon", "மதியம்"],
    matches: (minute: number) => minute >= 660 && minute < 840,
  },
  {
    aliases: ["afternoon", "பிற்பகல்"],
    matches: (minute: number) => minute >= 720 && minute < 1020,
  },
  {
    aliases: ["evening", "மாலை"],
    matches: (minute: number) => minute >= 1020 && minute < 1200,
  },
  {
    aliases: ["night", "இரவு"],
    matches: (minute: number) => minute >= 1200 || minute < 240,
  },
];
const places: [NonNullable<ContextPacket["place"]>, string[]][] = [
  ["home", ["home", "வீடு", "வீட்டில்"]],
  ["hospital", ["hospital", "மருத்துவமனை", "மருத்துவமனையில்"]],
  ["clinic", ["clinic", "கிளினிக்"]],
  ["outside", ["outside", "outdoors", "வெளியே"]],
];
const clinicalRoutineLabel =
  /\b(?:medicin(?:e|es|al)|medications?|drugs?|tablets?|pills?|dos(?:e|es|age)|prescriptions?|injections?|therapy|treatment|mg|mcg|ml)\b|மருந்து|மாத்திரை|மருந்தளவு|சிகிச்சை|ஊசி/iu;
const foodObjects = new Set(["food", "rice", "rasam", "idli", "dosa"]);
const drinkObjects = new Set(["water", "tea", "coffee", "milk"]);
const knownRoutineTerms = (topic: "food" | "drink") => [
  ...vocabularyCatalog
    .filter(
      (entry) =>
        entry.category === "daily" &&
        (topic === "food" ? foodObjects : drinkObjects).has(
          entry.objectId ?? "",
        ),
    )
    .flatMap((entry) => [
      entry.en,
      entry.ta,
      ...entry.aliases.en,
      ...entry.aliases.ta,
      ...entry.aliases.tanglish,
    ]),
  ...(topic === "food"
    ? ["breakfast", "lunch", "dinner", "meal"]
    : ["drink", "beverage", "juice", "சாறு", "பானம்"]),
];
const routineTerms = {
  food: knownRoutineTerms("food"),
  drink: knownRoutineTerms("drink"),
};

/** Category metadata alone is not evidence that an unfamiliar label names food or drink.
 * Keep known item spans and safe, time-matched daypart labels; unknown modifiers cannot add facts. */
function referenceTerms(label: string, topic: TopicId, time: string): string[] {
  if (clinicalRoutineLabel.test(label)) return [];
  if (topic !== "food" && topic !== "drink") return [label];
  const matches = routineTerms[topic].filter((term) => mentions(label, term));
  if (!matches.length) return [];
  const permitted = new Set(tokens(matches.join(" ")));
  const at = clockMinutes(time);
  for (const part of dayparts)
    if (at !== undefined && part.matches(at))
      for (const alias of part.aliases)
        for (const word of tokens(alias)) permitted.add(word);
  for (const word of ["and", "with", "my", "the", "a", "an"])
    permitted.add(word);
  if (tokens(label).every((word) => permitted.has(word)))
    return [label, ...matches];
  return matches;
}

export interface RoutineSignal {
  /** Original path in the transmitted packet; derived rankings never rewrite evidence paths. */
  path: string;
  label: string;
  topic: TopicId;
  time: string;
  minutesAway?: number;
  place?: ContextPacket["place"];
  learned: boolean;
  reasons: (
    | "topic"
    | "words"
    | "nearby_time"
    | "matching_place"
    | "routine_reference"
    | "category_reference"
  )[];
  score: number;
  mayResolveReference: boolean;
  /** Exact allowed label quotes. Food/drink quotes cannot introduce unrecognized label words. */
  referenceTerms: string[];
}

export interface ContextSignals {
  clock?: ContextPacket["now"];
  place?: ContextPacket["place"];
  fragmentTopics: TopicId[];
  routineReference: boolean;
  genericReference: boolean;
  placeReference: boolean;
  routines: RoutineSignal[];
  routineResolution: "none" | "single" | "ambiguous";
}

/** Derive bounded, explainable hints from the already privacy-filtered request.
 * Clock and schedules are context for ranking, never proof of a need or completed event.
 * Location is the caregiver-selected setting, not GPS or an independently verified fact.
 */
export function deriveContextSignals(context: ContextPacket): ContextSignals {
  const current = [
    context.fragment.raw,
    context.fragment.objectLabel ?? "",
    ...(context.fragment.topicPath ?? []),
  ].join(" ");
  const fragmentTopics = (Object.keys(topicCues) as TopicId[]).filter((topic) =>
    [topic, ...topicCues[topic]].some((cue) => mentions(current, cue)),
  );
  const routineReference =
    /\b(?:usual|routine|normally|regular)\b|வழக்கமான|வழக்கம்|வழக்கம்போல்/iu.test(
      current,
    );
  // A bare food/drink category is an underspecified cue. Explicit objects, people, extra
  // actions and time qualifiers do not pass this narrow gate and cannot be replaced.
  const currentTokens = tokens(current);
  const genericReference =
    !routineReference &&
    fragmentTopics.length === 1 &&
    ["food", "drink"].includes(fragmentTopics[0]) &&
    currentTokens.length > 0 &&
    currentTokens.every(
      (word) => genericCategoryWords.has(word) || referenceGrammar.has(word),
    );
  const explicitPlaces = places
    .filter(([, aliases]) => aliases.some((cue) => mentions(current, cue)))
    .map(([place]) => place);
  const placeReference =
    /\bhere\b|இங்கே|இங்கு/iu.test(current) &&
    explicitPlaces.every((place) => place === context.place);
  const explicitDayparts = dayparts.filter((part) =>
    part.aliases.some((cue) => mentions(current, cue)),
  );
  // Nearby occurrences cannot resolve a different day or an explicit clock reference. Keep the
  // patient's time words, but ask for more context rather than borrow today's nearby activity.
  const otherOccurrence =
    /\b(?:tomorrow|yesterday|later|tonight|last|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|நாளை|நேற்று|\b\d{1,2}:\d{2}\b|\b(?:at|around|before|after)\s+(?:\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/iu.test(
      current,
    );
  const ignoredWords = new Set([
    ...referenceGrammar,
    ...genericCategoryWords,
    "i",
    "my",
    "want",
    "need",
    "please",
    "usual",
    "routine",
    "regular",
    "normally",
    "morning",
    "evening",
    "night",
    "afternoon",
    "midday",
    "early",
    "late",
  ]);
  const currentWords = new Set(
    tokens(current).filter((word) => !ignoredWords.has(word)),
  );
  const explicitDrinks = drinkConcepts.filter((aliases) =>
    aliases.some((cue) => mentions(current, cue)),
  );
  const now = clockMinutes(context.now?.localTime);
  const ranked: RoutineSignal[] = [];
  for (const group of ["dueNow", "justPassed"] as const) {
    context.routine?.[group].forEach((routine, index) => {
      if (otherOccurrence) return;
      if (routine.place && context.place && routine.place !== context.place)
        return;
      if (
        explicitPlaces.some(
          (place) => place !== (routine.place ?? context.place),
        )
      )
        return;
      const at = clockMinutes(routine.time);
      if (
        explicitDayparts.some((part) => at === undefined || !part.matches(at))
      )
        return;
      const namedDayparts = dayparts.filter((part) =>
        part.aliases.some((cue) => mentions(routine.label, cue)),
      );
      if (
        explicitDayparts.length &&
        namedDayparts.some((part) => !explicitDayparts.includes(part))
      )
        return;
      const minutesAway =
        now !== undefined && at !== undefined
          ? ((at - now + 2160) % 1440) - 720
          : routine.minutesAway;
      // The client applies its chosen window; the server additionally caps imported hints.
      if (
        minutesAway === undefined ||
        !Number.isFinite(minutesAway) ||
        Math.abs(minutesAway) > 90
      )
        return;
      const topicMatch = fragmentTopics.includes(routine.topic);
      const wordMatch = tokens(routine.label).some((word) =>
        currentWords.has(word),
      );
      // Category overlap cannot replace a stated object: 'usual water' is not a coffee request.
      const routineDrinks = drinkConcepts.filter((aliases) =>
        aliases.some((cue) => mentions(routine.label, cue)),
      );
      if (
        explicitDrinks.length &&
        routineDrinks.length &&
        explicitDrinks.some((aliases) => !routineDrinks.includes(aliases))
      )
        return;
      if (!routineReference && !topicMatch && !wordMatch) return;
      // Explicit topic anchors rule out an unrelated routine even when it is a little nearer.
      if (fragmentTopics.length && !topicMatch && !wordMatch) return;
      const reasons: RoutineSignal["reasons"] = ["nearby_time"];
      let score = 4 * (1 - Math.abs(minutesAway) / 90);
      if (topicMatch) {
        reasons.push("topic");
        score += 10;
      }
      if (wordMatch) {
        reasons.push("words");
        score += 6;
      }
      if (routineReference) {
        reasons.push("routine_reference");
        score += 3;
      }
      if (genericReference) {
        reasons.push("category_reference");
        score += 3;
      }
      if (routine.place && routine.place === context.place) {
        reasons.push("matching_place");
        score += 2;
      }
      ranked.push({
        path: `routine.${group}.${index}`,
        label: routine.label,
        topic: routine.topic,
        time: routine.time,
        minutesAway,
        place: routine.place,
        learned: routine.learned ?? false,
        reasons,
        score: Math.round(score * 100) / 100,
        mayResolveReference: false,
        referenceTerms: referenceTerms(
          routine.label,
          routine.topic,
          routine.time,
        ),
      });
    });
  }
  ranked.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  // Repeated storage records must not look like two independent competing meanings.
  const unique = ranked.filter(
    (routine, index) =>
      ranked.findIndex(
        (other) =>
          normalize(other.label) === normalize(routine.label) &&
          other.topic === routine.topic,
      ) === index,
  );
  const [first, second] = unique;
  const ambiguous = Boolean(first && second && first.score - second.score < 3);
  // Only a routine reference or a generic category may be expanded. Named 'water' stays water.
  // Clinical routines may rank as hints, but never contribute a drug, dose, treatment or symptom.
  const mayExpand = Boolean(
    (routineReference || genericReference) &&
    first &&
    !ambiguous &&
    !["medicine", "pain"].includes(first.topic) &&
    first.referenceTerms.length > 0,
  );
  if (mayExpand) first.mayResolveReference = true;
  return {
    ...(context.now ? { clock: context.now } : {}),
    ...(context.place ? { place: context.place } : {}),
    fragmentTopics,
    routineReference,
    genericReference,
    placeReference,
    routines: unique.slice(0, 3),
    routineResolution: ambiguous ? "ambiguous" : mayExpand ? "single" : "none",
  };
}
