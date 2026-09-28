export interface TranscriptResults {
  length: number;
  [index: number]: {
    length: number;
    [alternative: number]: { transcript: string };
  };
}

/**
 * Join recognizer segments into rank-aligned utterances, never isolated words.
 * Missing ranks use that segment's primary transcript. These are recognizer
 * alternatives, not inferred paraphrases or independently scored hypotheses.
 */
export function extractTranscript(
  results: TranscriptResults,
  prefix = "",
): { text: string; alternatives: string[] } {
  const utterances: string[] = [];
  for (let rank = 0; rank < 3; rank++) {
    const parts = [prefix.trim()];
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      if (!result?.length) continue;
      const primary = result[0]?.transcript ?? "";
      const transcript =
        rank < result.length ? result[rank]?.transcript : undefined;
      parts.push((transcript?.trim() ? transcript : primary).trim());
    }
    utterances.push(parts.filter(Boolean).join(" "));
  }

  // Context.raw is bounded to 500 UTF-16 units. Do not leave half a surrogate
  // pair at its boundary; otherwise preserve casing, script and punctuation.
  const text = utterances[0].slice(0, 500).replace(/[\uD800-\uDBFF]$/u, "");
  // An overlong alternative is omitted, not shortened into a different claim.
  const alternatives = [...new Set(utterances)].filter(
    (utterance) => utterance.length > 0 && utterance.length <= 120,
  );
  return { text, alternatives };
}
