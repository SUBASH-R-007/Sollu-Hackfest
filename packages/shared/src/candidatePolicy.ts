import { CandidateSchema, type Candidate, type ContextPacket } from "./schemas";
import { getMockCandidates } from "./mock";
import { numberWords } from "./phrases";

export const normalizeCandidateText = (text: string) =>
  text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
const escapes = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, word: string) =>
  !!word &&
  new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${escapes(word)}(?=$|[^\\p{L}\\p{M}\\p{N}])`,
    "iu",
  ).test(text);
const negative = (s: string) =>
  /\b(?:no|not|never|don['’]?t|without|venam|vendam|vendaam|illai)\b|வேணாம்|வேண்டாம்|இல்லை/u.test(
    s.toLowerCase(),
  );
const numbers = (s: string) => s.match(/\p{N}+(?:[.:/]\p{N}+)*/gu) ?? [];
const dose =
  /\b(?:mg|mcg|ml|milligrams?|micrograms?|millilitres?|milliliters?|dosage)\b|மில்லிகிராம்|மி\.கி/iu;
const advice =
  /\b(?:you should|you must|diagnosis|diagnosed|prescri(?:be|ption)|take .{0,20} daily|stop taking)\b/iu;

/** Language-independent identity for a meaning, not a model's display label. */
export function candidateMeaningKey(c: Candidate): string {
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
}

/** Every displayed path uses this policy; unknown model prose is never made trusted by metadata. */
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
    if (exclusions.has(normalizeCandidateText(c.text)))
      rejected.add(candidateMeaningKey(c));
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
  const side = /\bleft\b|இடது|\bidathu\b/.test(evidence)
    ? "left"
    : /\bright\b|வலது|\bvalathu\b/.test(evidence)
      ? "right"
      : undefined;
  for (let i = 0; i < Math.min(source.length, 30); i++) {
    const parsed = CandidateSchema.safeParse(source[i]);
    if (!parsed.success) {
      drop(i, "schema");
      continue;
    }
    const proposed = parsed.data;
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
    const candidateSide =
      c.side ??
      (/\bright\b|வலது/.test(c.text)
        ? "right"
        : /\bleft\b|இடது/.test(c.text)
          ? "left"
          : undefined);
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
    if (exclusions.has(normalizeCandidateText(c.text)) || rejected.has(key)) {
      drop(i, "rejected");
      continue;
    }
    if (
      out.candidates.some(
        (old) =>
          candidateMeaningKey(old) === key ||
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
