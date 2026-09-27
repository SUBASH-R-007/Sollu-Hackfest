import {
  CandidateSchema,
  numberWords,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";

export const normalise = (text: string) =>
  text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, word: string) =>
  new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegex(word)}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(text);
const doses =
  /\b(?:mg|mcg|ml|milligram(?:s)?|microgram(?:s)?|millilitre(?:s)?|milliliter(?:s)?|dosage)\b|மில்லிகிராம்|மி\.கி/iu;
const forbiddenAdvice =
  /\b(?:you should|you must|diagnosis|diagnosed|prescri(?:be|ption)|take .{0,20} daily|stop taking)\b/iu;
export function validateCandidates(
  input: unknown,
  context: ContextPacket,
): { candidates: Candidate[]; dropped: number } {
  const source = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null
      ? Object.values(input)
      : [];
  const kept: Candidate[] = [];
  // Only communication content can ground a quantity. Bookkeeping such as round,
  // weekday, memory counts and question age must never license a spoken number.
  const grounded = [
    context.fragment.raw,
    context.fragment.objectLabel ?? "",
    ...(context.fragment.topicPath ?? []),
    ...(context.fragment.sttAlternatives ?? []),
    context.partnerQuestion?.text ?? "",
    ...(context.recentTurns ?? []).map((turn) => turn.text),
    ...(context.ownExamples ?? []).flatMap((example) => [
      example.fragment,
      example.sentence,
    ]),
    ...(context.vocabulary ?? []).flatMap((item) => [
      item.term,
      item.meaning ?? "",
    ]),
    ...(context.routine?.dueNow ?? []).flatMap((item) => [
      item.label,
      item.time,
    ]),
    ...(context.routine?.justPassed ?? []).flatMap((item) => [
      item.label,
      item.time,
    ]),
    context.now?.localTime ?? "",
  ]
    .join("\n")
    .normalize("NFC")
    .toLowerCase();
  const numericTokens = (text: string) =>
    text.match(/\p{N}+(?:[.:/]\p{N}+)*/gu) ?? [];
  const groundedNumbers = new Set(numericTokens(grounded));
  const nameSupport = [
    context.fragment.raw,
    context.fragment.objectLabel ?? "",
    ...(context.fragment.topicPath ?? []),
    context.addressee?.name ?? "",
    context.partnerQuestion?.text ?? "",
    ...(context.recentTurns ?? []).map((t) => t.text),
    ...(context.ownExamples ?? []).map((t) => t.sentence),
  ]
    .join(" ")
    .toLowerCase();
  let dropped = 0;
  for (const raw of source.slice(0, 10)) {
    const obj =
      typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>)
        : {};
    const parsed = CandidateSchema.safeParse({
      ...obj,
      urgency:
        typeof obj.urgency === "string"
          ? obj.urgency.toLowerCase()
          : obj.urgency,
      sig: undefined,
    });
    if (!parsed.success) {
      dropped++;
      continue;
    }
    const c = parsed.data;
    c.text = c.text
      .normalize("NFC")
      .replace(/["“”[\]{}]|\p{Extended_Pictographic}|\uFE0F/gu, "")
      .trim();
    const normalized = normalise(c.text);
    const digits = numericTokens(c.text);
    const readingParts = c.reading.split("→");
    const numbers = [...numberWords.en, ...numberWords.ta].filter((n) =>
      contains(c.text, n),
    );
    const wrongName = (context.people ?? []).some((p) => {
      const aliases = [p.name, ...p.aliases];
      return (
        aliases.some((name) => contains(c.text, name)) &&
        !aliases.some((name) => contains(nameSupport, name))
      );
    });
    const similarIntent = kept.some((k) => {
      const a = new Set(normalise(k.intent).split(" ")),
        b = new Set(normalise(c.intent).split(" "));
      const common = [...a].filter((w) => b.has(w)).length;
      return (
        normalise(k.intent) === normalise(c.intent) ||
        (common >= 2 && common / Math.min(a.size, b.size) >= 0.8)
      );
    });
    if (
      !c.text ||
      c.text.length > 90 ||
      doses.test(c.text) ||
      forbiddenAdvice.test(c.text) ||
      digits.some((d) => !groundedNumbers.has(d)) ||
      numbers.some((n) => !contains(grounded, n)) ||
      wrongName ||
      readingParts.some((p) => !p.trim()) ||
      readingParts.length > 2 ||
      kept.some((k) => normalise(k.text) === normalized) ||
      similarIntent ||
      context.exclude.some((t) => normalise(t) === normalized)
    ) {
      dropped++;
      continue;
    }
    if (!c.keyword || !c.text.includes(c.keyword))
      c.keyword =
        c.text
          .replace(/[\p{P}\p{S}]/gu, "")
          .split(/\s+/)
          .sort((a, b) => b.length - a.length)[0] ?? c.text;
    kept.push(c);
    if (kept.length === 3) break;
  }
  return { candidates: kept, dropped };
}
