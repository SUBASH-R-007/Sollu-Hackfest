import type { ContextInput } from "./schemas";

export interface FragmentRepair {
  /** Matching aid only. The original fragment remains the evidence/audit text. */
  text: string;
  changes: { from: string; to: string }[];
}

/** Confirmed, in-scope personal mappings precede generic repair. */
export function confirmedFragmentCorrection(context: ContextInput): {
  text: string;
  reading?: string;
  ambiguous: boolean;
} {
  const raw = normalize(context.fragment.raw);
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = (value: string) =>
    new RegExp(
      `(^|[^\\p{L}\\p{M}\\p{N}])(${escape(normalize(value))})(?=$|[^\\p{L}\\p{M}\\p{N}])`,
      "gu",
    );
  const mappings = (context.substitutions ?? []).filter(
    (mapping) =>
      mapping.confirmed === true &&
      !!mapping.heard.trim() &&
      (!mapping.lang ||
        mapping.lang === (context.outputLang ?? context.lang ?? "ta")) &&
      (!mapping.place || mapping.place === context.place) &&
      (!mapping.addresseeId || mapping.addresseeId === context.addressee?.id) &&
      pattern(mapping.heard).test(raw),
  );
  if (new Set(mappings.map((mapping) => normalize(mapping.means))).size > 1)
    return { text: raw, ambiguous: true };
  const mapping = mappings[0];
  if (!mapping) return { text: raw, ambiguous: false };
  return {
    text: raw.replace(
      pattern(mapping.heard),
      (_match, boundary: string) => `${boundary}${normalize(mapping.means)}`,
    ),
    reading: fragmentRepairReading({
      text: "",
      changes: [{ from: mapping.heard, to: mapping.means }],
    }),
    ambiguous: false,
  };
}

export interface FragmentLexicon {
  /** Complete everyday words from the authored catalog; never names, drugs or body slots. */
  repairable: ReadonlySet<string>;
  /** All known tokens, including clinical words and refusals, prevent prefix collisions. */
  known: ReadonlySet<string>;
}

const normalize = (value: string) => value.normalize("NFC").toLowerCase();
const protectedWord =
  /^(?:no|not|never|none|without|dont|don't|cannot|cant|can't|yes|off|on|left|right|one|two|three|four|five|six|seven|eight|nine|ten|dose|mg|mcg|ml|venam|vendam|vendaam|venum|vendum|venda|illai|illa|வேணும்|வேண்டும்|வேணாம்|வேண்டாம்|இல்லை|இல்ல|ஒரு|ஒன்று|இரண்டு)$/u;
const word = /^[\p{L}\p{M}]+$/u;
const letterCount = (value: string) => value.match(/\p{L}/gu)?.length ?? 0;

/**
 * Deliberately no edit-distance, phonetic or medical inference. A repair is a
 * visible proposal based on an existing everyday word. Unknown/ambiguous text
 * stays present so downstream grounding can abstain instead of dropping it.
 */
export function repairFragment(
  original: string,
  lexicon: FragmentLexicon,
): FragmentRepair {
  let text = normalize(original);
  const changes: FragmentRepair["changes"] = [];
  const usable = (value: string) =>
    lexicon.repairable.has(value) && !protectedWord.test(value);
  const replace = (from: string, to: string) => {
    if (from !== to) changes.push({ from, to });
    return to;
  };

  // Explicit syllable boundaries: wa-ter, tha-nni, தண்-ணீர். Each piece must
  // not itself be a known word (so tea-pot and no-water are not rewritten).
  text = text.replace(/[\p{L}\p{M}]+(?:[-‐‑][\p{L}\p{M}]+)+/gu, (cluster) => {
    const parts = cluster.split(/[-‐‑]/u);
    const last = parts.at(-1)!;
    if (
      usable(last) &&
      parts
        .slice(0, -1)
        .every(
          (part) =>
            part.length < last.length &&
            last.startsWith(part) &&
            !lexicon.known.has(part) &&
            !protectedWord.test(part),
        )
    )
      return replace(cluster, last);
    const joined = parts.join("");
    if (
      usable(joined) &&
      parts.every(
        (part) => !lexicon.known.has(part) && !protectedWord.test(part),
      )
    )
      return replace(cluster, joined);
    return cluster;
  });

  // Repeated prefixes immediately followed by the full word, including pauses.
  // Never remove a valid standalone word: "no ... water" keeps the refusal.
  const tokens = text.split(/(\s+|\.{2,}|…)/u);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const complete = tokens[i];
    if (!usable(complete)) continue;
    let start = i;
    while (start >= 2 && /^(?:\s+|\.{2,}|…)$/u.test(tokens[start - 1])) {
      const previous = tokens[start - 2];
      if (
        !word.test(previous) ||
        protectedWord.test(previous) ||
        (previous !== complete &&
          (!complete.startsWith(previous) || lexicon.known.has(previous)))
      )
        break;
      start -= 2;
    }
    if (start < i) {
      const from = tokens.slice(start, i + 1).join("");
      tokens.splice(start, i - start + 1, replace(from, complete));
      i = start;
    }
  }
  text = tokens.join("");

  // A sufficiently long unique prefix can propose an everyday catalog word.
  // Uniqueness considers *all* catalog tokens, including refusal forms and
  // clinical vocabulary. Short or competing prefixes remain unresolved.
  text = text.replace(/[\p{L}\p{M}]+/gu, (token) => {
    if (
      protectedWord.test(token) ||
      lexicon.known.has(token) ||
      letterCount(token) < 3
    )
      return token;
    const completions = [...lexicon.known].filter((known) =>
      known.startsWith(token),
    );
    if (completions.length !== 1 || !usable(completions[0])) return token;
    return replace(token, completions[0]);
  });
  return { text, changes };
}

export function fragmentRepairReading(
  repair: FragmentRepair,
): string | undefined {
  if (!repair.changes.length) return undefined;
  const last = repair.changes.at(-1)!;
  // Both sides are visible within the existing 40-character reading contract.
  const shorten = (value: string) =>
    value.length <= 17 ? value : `${value.slice(0, 16)}…`;
  return `${shorten(last.from)} → ${shorten(last.to)}`;
}
