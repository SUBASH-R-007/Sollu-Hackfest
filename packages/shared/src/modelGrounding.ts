import { z } from "zod";
import { numberWords, painParts } from "./phrases";
import { vocabularyCatalog } from "./vocabulary";
import { deriveContextSignals } from "./contextEngine";
import {
  CandidateSchema,
  ModelEvidenceSchema,
  type Candidate,
  type ContextPacket,
} from "./schemas";

const normalize = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(
      /\b(don|doesn|didn|can|won|isn|aren|wasn|weren)['’]t\b/g,
      (_match, stem: string) =>
        `${({ don: "do", doesn: "does", didn: "did", can: "can", won: "will", isn: "is", aren: "are", wasn: "was", weren: "were" } as Record<string, string>)[stem]} not`,
    )
    .replace(
      /['’](re|ve|ll|d|m)\b/g,
      (_match, suffix: string) =>
        ` ${{ re: "are", ve: "have", ll: "will", d: "would", m: "am" }[suffix as "re" | "ve" | "ll" | "d" | "m"]}`,
    )
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
const words = (text: string) => normalize(text).split(/\s+/).filter(Boolean);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, term: string) =>
  new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${escape(term)}(?=$|[^\\p{L}\\p{M}\\p{N}])`,
    "iu",
  ).test(text);
const negative = (text: string) =>
  /\b(?:no|not|never|don['’]?t|doesn['’]?t|didn['’]?t|can['’]?t|cannot|won['’]?t|without|venam|vendam|vendaam|illai|illa)\b|வேணாம்|வேண்டாம்|இல்லை|இல்ல|முடியாது|மாட்டேன்/u.test(
    text.toLowerCase(),
  );
const sides = (text: string) => ({
  left: /\bleft\b|இடது|\bidathu\b/iu.test(text),
  right: /\bright\b|வலது|\bvalathu\b/iu.test(text),
});
const digits = (text: string) => text.match(/\p{N}+(?:[.:/]\p{N}+)*/gu) ?? [];
const clinicalInstruction =
  /\b(?:mg|mcg|ml|milligrams?|micrograms?|millilit(?:er|re)s?|dosage|you should|you must|diagnos(?:is|ed)|prescri(?:be|ption)|take .{0,30}(?:daily|every)|stop taking|double .{0,20}dose)\b|மில்லிகிராம்|மி\.கி|மருந்தளவு|மருந்து எடுத்துக்கொள்ள/iu;
// These checks are conservative filters, not a semantic proof or a clinical assessment.
const instructionAttempt =
  /(?:ignore|override|disregard).{0,50}(?:instructions?|system|rules?|prompt)|(?:system|developer)\s*(?:message|prompt|:)|reveal.{0,30}(?:key|secret)|(?:api[_ -]?key|<\/?(?:system|assistant)>)/iu;
const functionWords = new Set(
  "i me my mine we us our you your he him his she her they them their it its this that these those a an the to of for from in into on at with by and or as is am are was were be been being have has had do does did please could can would will shall may might want need like get give bring some any no not never dont doesnt didnt cant cannot wont without yes there here help let s m t going go".split(
    " ",
  ),
);
const stem = (word: string) => {
  if (["pain", "pains", "hurt", "hurts", "hurting"].includes(word))
    return "pain";
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
};
const contentWords = (text: string) =>
  words(text)
    .filter((w) => !functionWords.has(w))
    .map(stem);
const englishCatalogWords = new Set(
  vocabularyCatalog.flatMap((entry) =>
    [entry.en, entry.enSentence, ...entry.aliases.en].flatMap(contentWords),
  ),
);
const tanglishWords = new Set(
  vocabularyCatalog
    .flatMap((entry) => entry.aliases.tanglish.flatMap(contentWords))
    .filter((word) => !englishCatalogWords.has(word)),
);

/** Preserve explicit English intent/tense/modal cues that a bag of content words cannot protect.
 * These conservative patterns do not replace human review of meaning or translation. */
function pragmaticMismatch(
  item: GeneratedSentence,
  current: string,
  allowCatalogQuestions = false,
): boolean {
  const input = normalize(current),
    output = normalize(item.gloss_en);
  const desire = /\b(?:want|wants|need|needs|would like)\b/;
  const tentative =
    /\b(?:might|maybe|perhaps|probably|possibly|unsure|uncertain)\b/;
  if (tentative.test(input) !== tentative.test(output)) return true;
  if (tentative.test(input) && item.polarity !== "uncertain") return true;
  const past =
    /\b(?:had|was|were|did|wanted|needed|visited|called|yesterday|ago)\b/;
  const future = /\b(?:will|tomorrow|later|tonight|next)\b/;
  if (
    (past.test(input) !== past.test(output) &&
      !(
        allowCatalogQuestions &&
        !past.test(input) &&
        item.speechAct === "question"
      )) ||
    future.test(input) !== future.test(output)
  )
    return true;
  if (desire.test(input)) {
    const politeRequest =
      /^(?:please )?(?:can|could|may|would) (?:i|you)\b/.test(output) ||
      /^please (?:let|bring|give|help)\b/.test(output);
    if (!desire.test(output) && !politeRequest) return true;
    if (!["request", "refuse"].includes(item.speechAct)) return true;
    if (/^(?:do|does|did|is|are)\b/.test(output)) return true;
  }
  const inputQuestion =
    /\?\s*$/.test(current) || /^(?:who|what|where|when|why|how)\b/.test(input);
  if (inputQuestion && item.speechAct !== "question") return true;
  if (
    !allowCatalogQuestions &&
    !inputQuestion &&
    /^(?:who|what|where|when|why|how|do i|does|did i|is my|are my)\b/.test(
      output,
    )
  )
    return true;
  const possession =
    /\b(?:i|we|you|he|she|they) (?:have|has|had)\b(?! a question)/;
  if (
    possession.test(output) &&
    !possession.test(input) &&
    !/^(?:can|could|may|would) (?:i|we)\b/.test(output)
  )
    return true;
  if (possession.test(input) && !possession.test(output)) return true;
  if (negative(current)) {
    // A leading "No" cannot license a positive clause such as "No, I want water".
    if (
      /^no\s+(?:i|we|you|he|she|they)\s+(?:want|need|have|has|will|can)\b/.test(
        output,
      )
    )
      return true;
    const negation = /\b(?:no|not|never|cannot|without)\b/.exec(output);
    if (negation) {
      const before = output.slice(0, negation.index);
      const currentConcepts = new Set(contentWords(current));
      // "I want water, not help" moves the refusal to a different object.
      if (contentWords(before).some((word) => currentConcepts.has(word)))
        return true;
    }
  }
  return false;
}

/** Catalog wording must not erase explicit English qualifiers just because model inference failed. */
export function catalogFitsExplicitContext(
  candidate: Candidate,
  context: ContextPacket,
): boolean {
  // Exact curated aliases already have an authored bilingual interpretation. Applying English
  // verb/tense heuristics to untranslated Tanglish (e.g. appuram → later) would reject it.
  // Match the whole fragment and this exact catalog meaning, never a substring of a longer claim.
  const canonicalEntry = vocabularyCatalog.find(
    (entry) => entry.id === candidate.intentId,
  );
  if (
    canonicalEntry &&
    !context.fragment.objectLabel &&
    !context.fragment.topicPath?.length &&
    [
      canonicalEntry.en,
      canonicalEntry.ta,
      ...canonicalEntry.aliases.en,
      ...canonicalEntry.aliases.ta,
      ...canonicalEntry.aliases.tanglish,
    ].some((alias) => normalize(alias) === normalize(context.fragment.raw))
  )
    return true;
  const current = [
    context.fragment.raw,
    context.fragment.objectLabel ?? "",
    ...(context.fragment.topicPath ?? []),
  ].join(" ");
  const item: GeneratedSentence = {
    text: candidate.text,
    // The authored pain-repair choice "I'll show you where..." describes the immediate
    // communication action. It does not move the symptom to a future time.
    gloss_en: candidate.intentId?.endsWith(".followup.show")
      ? candidate.gloss_en.replace(/^I'll\b/, "I")
      : candidate.gloss_en,
    speechAct: candidate.speechAct ?? "request",
    polarity: candidate.polarity ?? "positive",
    side: candidate.side ?? "none",
    evidence: [],
  };
  // Tamil source morphology requires native review; these pragmatic patterns apply to English.
  if (
    !/\p{Script=Tamil}/u.test(current) &&
    pragmaticMismatch(item, current, true)
  )
    return false;
  // The reviewed medicine catalog renders the Medicine topic as "my tablets".
  // This equivalence is catalog-specific; model-authored drug/dose text gets no such exemption.
  const catalogConcept = (word: string) =>
    candidate.intentId?.startsWith("medicine.") &&
    ["medicine", "medication", "tablet", "pill"].includes(word)
      ? "medicine"
      : word;
  const output = new Set(contentWords(candidate.gloss_en).map(catalogConcept));
  const tanglish = new Set([
    ...tanglishWords,
    "raathiri",
    "rathiri",
    "kaalai",
    "madhiyaanam",
    "idathu",
    "valathu",
    "vali",
    "ph",
    "phone",
  ]);
  const english = current.match(/[A-Za-z][A-Za-z'-]*/g)?.join(" ") ?? "";
  return contentWords(english).every(
    (word) => tanglish.has(word) || output.has(catalogConcept(word)),
  );
}

export const GeneratedSentenceSchema = z
  .object({
    text: z.string().trim().min(1).max(180),
    gloss_en: z.string().trim().min(1).max(180),
    speechAct: z.enum([
      "request",
      "refuse",
      "question",
      "report",
      "repair",
      "social",
    ]),
    polarity: z.enum(["positive", "negative", "uncertain"]),
    side: z.enum(["left", "right", "none"]),
    evidence: z.array(ModelEvidenceSchema).min(1).max(12),
  })
  .strict();
export const GeneratedSentencesSchema = z
  .object({
    candidates: z.array(GeneratedSentenceSchema).max(3),
    clarification: z.boolean(),
  })
  .strict();
export type GeneratedSentence = z.infer<typeof GeneratedSentenceSchema>;

/** JSON Schema subset supported by all configured structured-output adapters. */
export const generatedSentencesJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["candidates", "clarification"],
  properties: {
    clarification: { type: "boolean" },
    candidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "text",
          "gloss_en",
          "speechAct",
          "polarity",
          "side",
          "evidence",
        ],
        properties: {
          text: { type: "string", maxLength: 180 },
          gloss_en: { type: "string", maxLength: 180 },
          speechAct: {
            type: "string",
            enum: [
              "request",
              "refuse",
              "question",
              "report",
              "repair",
              "social",
            ],
          },
          polarity: {
            type: "string",
            enum: ["positive", "negative", "uncertain"],
          },
          side: { type: "string", enum: ["left", "right", "none"] },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["path", "quote", "translation_en"],
              properties: {
                path: { type: "string" },
                quote: { type: "string" },
                translation_en: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

/** Explicit allowlist. A selected place can resolve 'here', and a single relevant nonclinical
 * routine can resolve 'usual' or a generic food/drink cue. Schedules never prove current events. */
export function modelEvidenceSources(
  context: ContextPacket,
): Record<string, string> {
  const result: Record<string, string> = {
    "fragment.raw": context.fragment.raw,
  };
  const situation = deriveContextSignals(context);
  if (situation.placeReference && context.place) result.place = context.place;
  for (const routine of situation.routines) {
    if (!routine.mayResolveReference) continue;
    result[`${routine.path}.label`] = routine.label;
    result[`${routine.path}.topic`] = routine.topic;
  }
  if (context.fragment.objectLabel)
    result["fragment.objectLabel"] = context.fragment.objectLabel;
  context.fragment.topicPath?.forEach((item, i) => {
    result[`fragment.topicPath.${i}`] = item;
  });
  if (context.partnerQuestion)
    result["partnerQuestion.text"] = context.partnerQuestion.text;
  context.recentTurns?.forEach((item, i) => {
    result[`recentTurns.${i}.text`] = item.text;
  });
  if (context.addressee) {
    result["addressee.name"] = context.addressee.name;
    result["addressee.relation"] = context.addressee.relation;
  }
  context.people?.forEach((item, i) => {
    result[`people.${i}.name`] = item.name;
    result[`people.${i}.relation`] = item.relation;
    item.aliases.forEach((alias, j) => {
      result[`people.${i}.aliases.${j}`] = alias;
    });
  });
  context.vocabulary?.forEach((item, i) => {
    result[`vocabulary.${i}.term`] = item.term;
    if (item.meaning) result[`vocabulary.${i}.meaning`] = item.meaning;
  });
  context.substitutions
    ?.filter(
      (item) =>
        item.confirmed &&
        (!item.lang || item.lang === context.outputLang) &&
        (!item.place || item.place === context.place) &&
        (!item.addresseeId || item.addresseeId === context.addressee?.id),
    )
    .forEach((item, i) => {
      result[`confirmedSubstitutions.${i}.heard`] = item.heard;
      result[`confirmedSubstitutions.${i}.means`] = item.means;
    });
  return result;
}

/** A stale-context marker only; authenticity comes from the server response, never this hash. */
export function modelContextKey(context: ContextPacket): string {
  const fragment = context.fragment,
    communication = context.communication;
  const data = JSON.stringify([
    fragment.modality,
    fragment.raw,
    fragment.sttAlternatives ?? [],
    fragment.topicPath ?? [],
    fragment.objectLabel ?? "",
    fragment.objectSource ?? "",
    context.outputLang,
    communication?.sentenceStyle ?? "natural",
    communication?.maxWords ?? 12,
    communication?.preferences ?? "",
    context.now
      ? [
          context.now.localTime,
          context.now.weekday,
          context.now.timeBucket,
          context.now.isDemo ?? false,
        ]
      : [],
    context.place ?? "",
    ["dueNow", "justPassed"].map(
      (group) =>
        context.routine?.[group as "dueNow" | "justPassed"].map((routine) => [
          routine.label,
          routine.topic,
          routine.time,
          routine.place ?? "",
          routine.minutesAway ?? null,
          routine.learned ?? false,
        ]) ?? [],
    ),
    context.partnerQuestion
      ? [
          context.partnerQuestion.text,
          context.partnerQuestion.lang,
          context.partnerQuestion.minutesAgo,
        ]
      : [],
    (context.recentTurns ?? []).map((turn) => [
      turn.speaker,
      turn.text,
      turn.minutesAgo,
    ]),
    Object.entries(modelEvidenceSources(context)).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  ]);
  let hash = 2166136261;
  for (const char of data)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `contextual-v1:${(hash >>> 0).toString(16)}`;
}

/** Ignore politeness and word order so paraphrasing the same anchors cannot refill rejected slots. */
export function modelMeaningKey(
  gloss: string,
  polarity: string,
  side?: string,
): string {
  return `model:${JSON.stringify([polarity, side ?? "none", [...new Set(contentWords(gloss))].sort()])}`;
}

export type ModelDropReason =
  | "schema"
  | "evidence"
  | "context"
  | "language"
  | "length"
  | "polarity"
  | "side"
  | "quantity"
  | "medical_instruction"
  | "unsupported_words"
  | "rejected"
  | "duplicate";

function checkSentence(
  item: GeneratedSentence,
  context: ContextPacket,
): ModelDropReason | undefined {
  const sources = modelEvidenceSources(context);
  if (instructionAttempt.test(context.fragment.raw)) return "evidence";
  const hasPrimary = item.evidence.some((e) => e.path.startsWith("fragment."));
  if (
    !hasPrimary ||
    item.evidence.some(
      (e) =>
        !sources[e.path]?.normalize("NFC").includes(e.quote.normalize("NFC")),
    )
  )
    return "evidence";
  const contextualRoutines = deriveContextSignals(context).routines;
  if (
    item.evidence.some((entry) => {
      const routine = contextualRoutines.find(
        (hint) => entry.path === `${hint.path}.label`,
      );
      return (
        routine &&
        !routine.referenceTerms.some(
          (term) => normalize(term) === normalize(entry.quote),
        )
      );
    })
  )
    return "evidence";
  // Routine descriptions are hypotheses for requests/questions, never evidence that the patient
  // already did, experienced or needs something. Clinical routine labels are never eligible.
  if (
    item.evidence.some((entry) => entry.path.startsWith("routine.")) &&
    !["request", "refuse", "question"].includes(item.speechAct)
  )
    return "context";
  if (
    item.evidence.some(
      (e) =>
        e.translation_en &&
        (!/\p{Script=Tamil}/u.test(e.quote) ||
          /\p{Script=Tamil}/u.test(e.translation_en)),
    )
  )
    return "evidence";
  // A translated current fragment must be quoted in full, otherwise qualifiers could disappear
  // before comparison. This records the model's translation; it does not independently verify it.
  if (
    /\p{Script=Tamil}/u.test(context.fragment.raw) &&
    !item.evidence.some(
      (e) =>
        e.path === "fragment.raw" && e.quote === context.fragment.raw.trim(),
    )
  )
    return "evidence";
  const current = [
    context.fragment.raw,
    context.fragment.objectLabel ?? "",
    ...(context.fragment.topicPath ?? []),
  ].join(" ");
  const evidence = item.evidence.map((e) => e.quote).join(" ");
  const maxWords = context.communication?.maxWords ?? 12;
  if (words(item.text).length > maxWords || words(item.gloss_en).length > 24)
    return "length";
  const tamil = /\p{Script=Tamil}/u.test(item.text);
  if (
    (context.outputLang === "ta" && !tamil) ||
    (context.outputLang === "en" && tamil) ||
    /\p{Script=Tamil}/u.test(item.gloss_en)
  )
    return "language";
  if (
    context.outputLang === "en" &&
    normalize(item.text) !== normalize(item.gloss_en)
  )
    return "language";
  if (clinicalInstruction.test(`${item.text} ${item.gloss_en}`))
    return "medical_instruction";
  const currentNumbers = new Set(digits(current));
  const outputNumbers = new Set(digits(`${item.text} ${item.gloss_en}`));
  if ([...currentNumbers].some((digit) => !outputNumbers.has(digit)))
    return "quantity";
  if (
    digits(`${item.text} ${item.gloss_en}`).some(
      (digit) => !currentNumbers.has(digit),
    ) ||
    [...numberWords.en, ...numberWords.ta].some(
      (word) =>
        contains(`${item.text} ${item.gloss_en}`, word) &&
        !contains(current, word),
    )
  )
    return "quantity";
  const expectedNegative = negative(current);
  const pragmaticCurrent = `${current} ${item.evidence
    .filter((e) => e.path.startsWith("fragment."))
    .map((e) => e.translation_en)
    .join(" ")}`;
  if (pragmaticMismatch(item, pragmaticCurrent)) return "context";
  const explicitNames = [
    ...[...context.fragment.raw.matchAll(/\s([A-Z][a-z]+)\b/g)].map(
      (match) => match[1],
    ),
    ...(context.people ?? [])
      .filter((person) => contains(current, person.name))
      .map((person) => person.name),
  ];
  if (explicitNames.some((name) => !item.gloss_en.includes(name)))
    return "context";
  if (
    negative(item.gloss_en) !== expectedNegative ||
    negative(item.text) !== expectedNegative ||
    (item.polarity === "negative") !== expectedNegative ||
    (item.speechAct === "refuse" && !expectedNegative)
  )
    return "polarity";
  const currentSide = sides(current),
    outputSide = sides(`${item.text} ${item.gloss_en}`);
  if (
    (currentSide.left && currentSide.right) ||
    outputSide.left !== currentSide.left ||
    outputSide.right !== currentSide.right ||
    item.side !==
      (currentSide.left ? "left" : currentSide.right ? "right" : "none")
  )
    return "side";
  if (context.outputLang === "ta" && (currentSide.left || currentSide.right)) {
    const tamilSide = sides(item.text);
    if (
      tamilSide.left !== currentSide.left ||
      tamilSide.right !== currentSide.right
    )
      return "side";
  }
  // English gloss permits useful grammar, but no new content words. Translation equivalents come
  // only from the controlled vocabulary or explicit shared evidence. Tamil morphology/semantics
  // still require the patient to review the sentence; these checks do not validate translation.
  let englishEvidence = `${evidence} ${item.evidence
    .filter((e) => /\p{Script=Tamil}/u.test(e.quote))
    .map((e) => e.translation_en)
    .join(" ")}`;
  if (currentSide.left) englishEvidence += " left";
  if (currentSide.right) englishEvidence += " right";
  for (const entry of vocabularyCatalog) {
    if (
      [
        entry.en,
        entry.ta,
        ...entry.aliases.en,
        ...entry.aliases.ta,
        ...entry.aliases.tanglish,
      ].some((term) => contains(evidence, term))
    )
      englishEvidence += ` ${entry.en} ${entry.enSentence}`;
  }
  for (const part of painParts)
    if (
      contains(evidence, part.id) ||
      contains(evidence, part.ta) ||
      contains(evidence, part.en)
    )
      englishEvidence += ` ${part.en} pain hurts`;
  const known = new Set(contentWords(englishEvidence));
  if (contentWords(item.gloss_en).some((word) => !known.has(word)))
    return "unsupported_words";
  const proposedConcepts = new Set(contentWords(item.gloss_en));
  const situation = deriveContextSignals(context);
  const resolvedTopics = new Set(
    situation.routines
      .filter(
        (routine) =>
          routine.mayResolveReference &&
          item.evidence.some(
            (entry) =>
              entry.path === `${routine.path}.label` &&
              contentWords(`${entry.quote} ${entry.translation_en}`).some(
                (word) => proposedConcepts.has(word),
              ),
          ),
      )
      .map((routine) => routine.topic),
  );
  const resolvedCategory = (word: string) => {
    // A generic refusal is broad: 'no food' must not shrink to refusing only one food.
    if (situation.genericReference && expectedNegative) return false;
    return (
      (resolvedTopics.has("drink") && ["drink", "beverage"].includes(word)) ||
      (resolvedTopics.has("food") && ["food", "meal"].includes(word))
    );
  };
  const currentEnglish = current.match(/[A-Za-z][A-Za-z'-]*/g)?.join(" ") ?? "";
  // Do not silently omit a named person, place, body part, time or other explicit English qualifier.
  // Known Tanglish words are translation input; their equivalents were added to englishEvidence.
  const tanglish = tanglishWords;
  if (
    contentWords(currentEnglish).some(
      (word) =>
        !tanglish.has(word) &&
        !proposedConcepts.has(word) &&
        !resolvedCategory(word),
    )
  )
    return "unsupported_words";
  if (
    item.evidence
      .filter((e) => e.path.startsWith("fragment."))
      .some((e) =>
        contentWords(e.translation_en).some(
          (word) => !proposedConcepts.has(word) && !resolvedCategory(word),
        ),
      )
  )
    return "unsupported_words";
  if (context.outputLang === "ta") {
    const latin = item.text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    if (latin.some((word) => !contains(evidence, word)))
      return "unsupported_words";
  }
  if (
    !contentWords(item.gloss_en).length &&
    !negative(current) &&
    !/\b(?:yes|hello|thanks|thank)\b|ஆமா|நன்றி|வணக்கம்/iu.test(current)
  )
    return "evidence";
  const key = modelMeaningKey(item.gloss_en, item.polarity, item.side);
  if (
    context.rejectedMeaningKeys?.includes(key) ||
    context.exclude.some((text) => normalize(text) === normalize(item.text))
  )
    return "rejected";
  return undefined;
}

export function resolveGeneratedSentences(
  raw: unknown,
  context: ContextPacket,
) {
  const parsed = GeneratedSentencesSchema.safeParse(raw);
  const candidates: Candidate[] = [];
  const reasons: { index: number; code: ModelDropReason }[] = [];
  if (!parsed.success)
    return {
      candidates,
      reasons: [{ index: 0, code: "schema" as const }],
      abstained: false,
    };
  for (const [index, item] of parsed.data.candidates.entries()) {
    const code = checkSentence(item, context);
    if (code) {
      reasons.push({ index, code });
      continue;
    }
    const meaningKey = modelMeaningKey(item.gloss_en, item.polarity, item.side);
    if (
      candidates.some(
        (c) =>
          c.modelReview?.meaningKey === meaningKey ||
          normalize(c.text) === normalize(item.text),
      )
    ) {
      reasons.push({ index, code: "duplicate" });
      continue;
    }
    candidates.push({
      text: item.text,
      gloss_en: item.gloss_en,
      reading:
        context.fragment.raw.trim().slice(0, 40) ||
        (context.outputLang === "ta" ? "வாக்கியம்" : "Sentence"),
      intent: item.speechAct,
      keyword: item.text.split(/\s+/).sort((a, b) => b.length - a.length)[0],
      icon: "💬",
      urgency: "none",
      lang: context.outputLang,
      speechAct: item.speechAct,
      polarity: item.polarity,
      ...(item.side !== "none" ? { side: item.side } : {}),
      source: "model",
      evidenceRefs: item.evidence.map((e) => e.path),
      modelReview: {
        version: "contextual-v1",
        contextKey: modelContextKey(context),
        evidence: item.evidence,
        meaningKey,
      },
    });
  }
  return {
    candidates,
    reasons,
    abstained: parsed.data.candidates.length === 0,
  };
}

/** Re-run the same filters on candidates independently obtained from the authenticated server. */
export function validateModelCandidate(
  value: unknown,
  context: ContextPacket,
): Candidate | undefined {
  const parsed = CandidateSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const c = parsed.data;
  if (
    c.source !== "model" ||
    !c.modelReview ||
    c.modelReview.contextKey !== modelContextKey(context)
  )
    return undefined;
  const result = resolveGeneratedSentences(
    {
      candidates: [
        {
          text: c.text,
          gloss_en: c.gloss_en,
          speechAct: c.speechAct,
          polarity: c.polarity,
          side: c.side ?? "none",
          evidence: c.modelReview.evidence,
        },
      ],
      clarification: false,
    },
    context,
  );
  const validated = result.candidates[0];
  if (
    !validated ||
    validated.modelReview?.meaningKey !== c.modelReview.meaningKey
  )
    return undefined;
  return { ...validated, sig: c.sig };
}
