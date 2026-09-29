import type { ContextInput } from "./schemas";
import { benignHealthIdioms, containsHealthStem, healthTerms } from "./lexicon";
import { prepareCatalogFragment, vocabularyCatalog } from "./vocabulary";

const normalize = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
const terms = new Set(
  [
    ...healthTerms,
    ...vocabularyCatalog
      .filter((entry) => entry.category === "health")
      .flatMap((entry) => [
        entry.id,
        entry.en,
        entry.ta,
        ...entry.aliases.en,
        ...entry.aliases.ta,
        ...entry.aliases.tanglish,
      ]),
  ]
    .map(normalize)
    .filter(Boolean),
);

/** A bounded communication-routing rule, NOT emergency detection or medical triage.
 * Recognized health/help wording (including refusal, uncertainty and past events) uses
 * authored communication or clarification instead of an LLM. It does not infer a condition,
 * expand clinical fragments, assign severity, add facts, speak, send or call anyone.
 * Missing/unknown words are not evidence that a message is safe or non-urgent. */
export function requiresPredefinedCommunication(
  context: ContextInput,
): boolean {
  const prepared = prepareCatalogFragment(context);
  const current = normalize(
    [
      context.fragment.raw,
      prepared.ambiguous ? "" : prepared.text,
      context.fragment.objectLabel ?? "",
      ...(context.fragment.topicPath ?? []),
    ].join(" "),
  )
    .replace(benignHealthIdioms, " ")
    .replace(/\s+/g, " ")
    .trim();
  const padded = ` ${current} `;
  // Whole words/phrases, plus health stems inside agglutinated or compound tokens
  // (தலைவலி, வலிக்கிறது, உதவிக்கு, thalaivali, headache, vomiting).
  return (
    [...terms].some((term) => padded.includes(` ${term} `)) ||
    current.split(" ").some(containsHealthStem)
  );
}
