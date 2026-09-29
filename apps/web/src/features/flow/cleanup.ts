/**
 * Local, deterministic dictation tidy-up for Voice flow. It only REMOVES:
 * filler sounds, stutter fragments and immediate word repeats. It never adds,
 * reorders or replaces words, so the result stays the person's own words.
 * Meaning is found later by the validated sentence engine.
 */
const fillers = new Set([
  "um",
  "umm",
  "ummm",
  "uh",
  "uhh",
  "uhm",
  "er",
  "erm",
  "hmm",
  "hm",
  "mm",
  "mmm",
  "ம்",
  "ம்ம்",
  "ம்ம்ம்",
]);
const edgePunctuation = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;
const core = (token: string) =>
  token.normalize("NFC").replace(edgePunctuation, "").toLocaleLowerCase();

/** "w-w-water" → "water": leading fragments that each start the final word. */
function withoutInnerStutter(token: string): string {
  const parts = token.split("-");
  if (parts.length < 2) return token;
  const last = parts[parts.length - 1];
  const lastCore = core(last);
  const fragments = parts.slice(0, -1).map(core);
  return lastCore &&
    fragments.every(
      (fragment) =>
        fragment.length > 0 &&
        fragment.length < lastCore.length &&
        lastCore.startsWith(fragment),
    )
    ? `${parts[0].match(/^[\p{P}\p{S}]*/u)?.[0] ?? ""}${last}`
    : token;
}

export function cleanTranscript(raw: string): {
  text: string;
  removed: string[];
} {
  const removed: string[] = [];
  const tokens = raw.normalize("NFC").split(/\s+/u).filter(Boolean);
  const kept: string[] = [];
  tokens.forEach((original, index) => {
    const token = withoutInnerStutter(original);
    if (token !== original) removed.push(original);
    const value = core(token);
    if (!value) {
      // Keep standalone punctuation; it can carry meaning ("?").
      kept.push(token);
      return;
    }
    if (fillers.has(value)) {
      removed.push(original);
      return;
    }
    // "wa- water": a trailing-hyphen fragment that starts the next word.
    const next = tokens[index + 1] ? core(tokens[index + 1]) : "";
    if (
      /-$/u.test(token) &&
      value.length < next.length &&
      next.startsWith(value)
    ) {
      removed.push(original);
      return;
    }
    const previous = kept.length ? core(kept[kept.length - 1]) : "";
    if (previous && previous === value) {
      // Immediate repeat: keep the later form (it may carry punctuation).
      removed.push(kept[kept.length - 1]);
      kept[kept.length - 1] = token;
      return;
    }
    kept.push(token);
  });
  return { text: kept.join(" "), removed };
}
