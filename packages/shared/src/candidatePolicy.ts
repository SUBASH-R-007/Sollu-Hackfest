import { CandidateSchema, type Candidate, type ContextPacket } from "./schemas";
import { getMockCandidates } from "./mock";
import { numberWords } from "./phrases";
import { requiresPredefinedCommunication } from "./predefinedCommunication";
import { containsTerm, hasNegation, sideMentions } from "./lexicon";
import {
  catalogFitsExplicitContext,
  modelMeaningKey,
  validateModelCandidate,
} from "./modelGrounding";

export const normalizeCandidateText = (text: string) =>
  text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
const contains = containsTerm;
const negative = hasNegation;
const numbers = (s: string) => s.match(/\p{N}+(?:[.:/]\p{N}+)*/gu) ?? [];
const dose =
  /\b(?:mg|mcg|ml|milligrams?|micrograms?|millilitres?|milliliters?|dosage)\b|மில்லிகிராம்|மி\.கி/iu;
const advice =
  /\b(?:you should|you must|diagnosis|diagnosed|prescri(?:be|ption)|take .{0,20} daily|stop taking)\b/iu;

/** Language-independent identity for a meaning, not a model's display label. */
export function candidateMeaningKey(c: Candidate): string {
  if (c.source === "model" && c.modelReview) return c.modelReview.meaningKey;
  if (!c.intentId) return `text:${normalizeCandidateText(c.text)}`;
  return JSON.stringify([
    c.intentId,
    c.speechAct ?? "",
    c.polarity ?? "",
    c.subject ?? "",
    c.objectId ?? "",
    c.bodyPart ?? "",
    c.side ?? "",
    c.timeScope ?? "",
    c.requestedAttribute ?? "",
  ]);
}
export type CandidateDropCode =
  | "schema"
  | "length"
  | "language"
  | "unverified_text"
  | "unsupported_quantity"
  | "medical_instruction"
  | "polarity"
  | "side"
  | "context_mismatch"
  | "rejected"
  | "duplicate"
  | "reading";
export interface CandidatePolicyResult {
  candidates: Candidate[];
  dropped: number;
  reasons: { index: number; code: CandidateDropCode }[];
  clarification?: string;
}
export interface CandidatePolicyOptions {
  /** Caller-owned, explicitly approved local phrases. Never pass model output here. */
  trustedCandidates?: Candidate[];
  /** Fresh authenticated server results only. The browser also requires a nonempty proof signature.
   * A source label, imported record or arbitrary model response is not provenance. */
  serverGeneratedCandidates?: Candidate[];
  /** The privacy-filtered packet actually sent to the model. Local catalog context can be richer. */
  modelContext?: ContextPacket;
}

/** Every displayed path uses this policy; model prose requires explicit server provenance and revalidation. */
export function applyCandidatePolicy(
  input: unknown,
  context: ContextPacket,
  options: CandidatePolicyOptions = {},
): CandidatePolicyResult {
  const source = Array.isArray(input)
    ? input
    : input &&
        typeof input === "object" &&
        Array.isArray((input as { candidates?: unknown }).candidates)
      ? (input as { candidates: unknown[] }).candidates
      : [];
  const current = getMockCandidates({
    ...context,
    exclude: [],
    rejectedMeaningKeys: [],
  });
  const personal = (options.trustedCandidates ?? []).flatMap((c) => {
    const p = CandidateSchema.safeParse(c);
    return p.success ? [p.data] : [];
  });
  const allowed = [...current, ...personal];
  const modelContext = options.modelContext ?? context;
  const fragmentKey = (packet: ContextPacket) =>
    JSON.stringify([
      packet.fragment.modality,
      packet.fragment.raw,
      packet.fragment.topicPath ?? [],
      packet.fragment.objectLabel ?? "",
      packet.fragment.objectSource ?? "",
      packet.outputLang,
      packet.communication?.sentenceStyle ?? "natural",
      packet.communication?.maxWords ?? 12,
    ]);
  const generated = (options.serverGeneratedCandidates ?? []).flatMap((c) => {
    // A saved or previously signed model result cannot bypass today's communication route.
    if (
      requiresPredefinedCommunication(context) ||
      requiresPredefinedCommunication(modelContext)
    )
      return [];
    if (fragmentKey(modelContext) !== fragmentKey(context)) return [];
    const checked = validateModelCandidate(c, modelContext);
    return checked ? [checked] : [];
  });
  // Historic candidates are useful only for rejection identity, never current grounding.
  const history = ([1, 2, 3] as const).flatMap((round) =>
    getMockCandidates({
      ...context,
      round,
      exclude: [],
      rejectedMeaningKeys: [],
    }),
  );
  const exclusions = new Set(context.exclude.map(normalizeCandidateText));
  const rejected = new Set(context.rejectedMeaningKeys ?? []);
  for (const c of [...history, ...personal])
    if (exclusions.has(normalizeCandidateText(c.text))) {
      rejected.add(candidateMeaningKey(c));
      rejected.add(
        modelMeaningKey(
          c.gloss_en,
          c.polarity ?? (negative(c.text) ? "negative" : "positive"),
          c.side,
        ),
      );
    }
  for (const c of [...history, ...personal])
    if (rejected.has(candidateMeaningKey(c)))
      rejected.add(
        modelMeaningKey(
          c.gloss_en,
          c.polarity ?? (negative(c.text) ? "negative" : "positive"),
          c.side,
        ),
      );
  const out: CandidatePolicyResult = {
    candidates: [],
    dropped: 0,
    reasons: [],
  };
  const drop = (index: number, code: CandidateDropCode) => {
    out.dropped++;
    out.reasons.push({ index, code });
  };
  // Past phrases/routine metadata are not evidence for a current quantity.
  const evidence =
    `${context.fragment.raw}\n${context.fragment.objectLabel ?? ""}\n${(context.fragment.topicPath ?? []).join(" ")}`
      .normalize("NFC")
      .toLowerCase();
  const groundedNumbers = new Set(numbers(evidence));
  // "right now"/"all right"/"he left" are not body sides.
  const evidenceSides = sideMentions(evidence);
  const side = evidenceSides.left
    ? "left"
    : evidenceSides.right
      ? "right"
      : undefined;
  for (let i = 0; i < Math.min(source.length, 30); i++) {
    const parsed = CandidateSchema.safeParse(source[i]);
    if (!parsed.success) {
      drop(i, "schema");
      continue;
    }
    const proposed = parsed.data;
    const serverCandidate = generated.find(
      (c) =>
        normalizeCandidateText(c.text) ===
        normalizeCandidateText(proposed.text),
    );
    if (serverCandidate) {
      const key = candidateMeaningKey(serverCandidate);
      if (
        exclusions.has(normalizeCandidateText(serverCandidate.text)) ||
        rejected.has(key)
      ) {
        drop(i, "rejected");
        continue;
      }
      if (
        out.candidates.some(
          (old) =>
            candidateMeaningKey(old) === key ||
            modelMeaningKey(
              old.gloss_en,
              old.polarity ?? (negative(old.text) ? "negative" : "positive"),
              old.side,
            ) === key ||
            normalizeCandidateText(old.text) ===
              normalizeCandidateText(serverCandidate.text),
        )
      ) {
        drop(i, "duplicate");
        continue;
      }
      out.candidates.push(serverCandidate);
      if (out.candidates.length === 3) break;
      continue;
    }
    const trusted = allowed.find(
      (c) =>
        normalizeCandidateText(c.text) ===
        normalizeCandidateText(proposed.text),
    );
    if (!trusted) {
      drop(i, "unverified_text");
      continue;
    }
    // Render trusted wording and metadata. A model cannot swap the gloss, body side or urgency.
    const c: Candidate = { ...trusted, sig: trusted.sig ?? proposed.sig };
    const isCurrent = current.some(
      (item) =>
        normalizeCandidateText(item.text) === normalizeCandidateText(c.text),
    );
    if (isCurrent && !catalogFitsExplicitContext(c, context)) {
      drop(i, "context_mismatch");
      continue;
    }
    if (c.text.length > 90) {
      drop(i, "length");
      continue;
    }
    const tamil = /\p{Script=Tamil}/u.test(c.text);
    if (
      (c.lang && c.lang !== context.outputLang) ||
      (context.outputLang === "ta" && !tamil) ||
      (context.outputLang === "en" && tamil)
    ) {
      drop(i, "language");
      continue;
    }
    if (dose.test(c.text) || advice.test(c.text)) {
      drop(i, "medical_instruction");
      continue;
    }
    if (
      !isCurrent &&
      (numbers(c.text).some((n) => !groundedNumbers.has(n)) ||
        [...numberWords.en, ...numberWords.ta].some(
          (n) => contains(c.text, n) && !contains(evidence, n),
        ))
    ) {
      drop(i, "unsupported_quantity");
      continue;
    }
    const polarity = c.polarity ?? (negative(c.text) ? "negative" : "positive");
    // Mixed negative scopes are resolved by the controlled catalog; personal positives may not override a refusal.
    if (
      negative(evidence) &&
      polarity !== "negative" &&
      !current.some(
        (item) =>
          normalizeCandidateText(item.text) === normalizeCandidateText(c.text),
      )
    ) {
      drop(i, "polarity");
      continue;
    }
    const textSides = sideMentions(c.text);
    const candidateSide =
      c.side ??
      (textSides.right ? "right" : textSides.left ? "left" : undefined);
    if (side && candidateSide && side !== candidateSide) {
      drop(i, "side");
      continue;
    }
    const currentObjects = new Set(
      current.map((item) => item.objectId).filter(Boolean),
    );
    if (
      !isCurrent &&
      c.objectId &&
      currentObjects.size &&
      !currentObjects.has(c.objectId)
    ) {
      drop(i, "context_mismatch");
      continue;
    }
    if (
      c.reading.split("→").some((p) => !p.trim()) ||
      c.reading.split("→").length > 2
    ) {
      drop(i, "reading");
      continue;
    }
    const key = candidateMeaningKey(c);
    const semanticKey = modelMeaningKey(
      c.gloss_en,
      c.polarity ?? (negative(c.text) ? "negative" : "positive"),
      c.side,
    );
    if (
      exclusions.has(normalizeCandidateText(c.text)) ||
      rejected.has(key) ||
      rejected.has(semanticKey)
    ) {
      drop(i, "rejected");
      continue;
    }
    if (
      out.candidates.some(
        (old) =>
          candidateMeaningKey(old) === key ||
          (old.source === "model" &&
            candidateMeaningKey(old) === semanticKey) ||
          normalizeCandidateText(old.text) === normalizeCandidateText(c.text),
      )
    ) {
      drop(i, "duplicate");
      continue;
    }
    if (!c.keyword || !c.text.includes(c.keyword))
      c.keyword =
        c.text
          .replace(/[\p{P}\p{S}]/gu, "")
          .split(/\s+/)
          .sort((a, b) => b.length - a.length)[0] ?? c.text;
    c.lang = context.outputLang;
    out.candidates.push(c);
    if (out.candidates.length === 3) break;
  }
  if (!out.candidates.length)
    out.clarification =
      context.outputLang === "ta"
        ? "வேற வார்த்தையில சொல்ல முடியுமா?"
        : "Can you tell me another word?";
  return out;
}
