import type { ContextInput } from "./schemas";
import { prepareCatalogFragment, vocabularyCatalog } from "./vocabulary";

const normalize = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
const terms = new Set(
  [
    ..."help emergency ambulance pain pains hurt hurts hurting chest breath breathe breathing choke choking bleed bleeding faint fainting seizure seizures medicine medicines medication medications tablet tablets pill pills drug drugs dose doses dosage treatment diagnosis diagnose diagnosed prescription prescribe prescribed overdose mg mcg ml".split(
      " ",
    ),
    // Existing vocabulary and terms are matching boundaries, never new translated output.
    "vali",
    "nenju",
    "nenchu",
    "marunthu",
    "marundhu",
    "mathirai",
    "maathirai",
    "udhavi",
    "uthavi",
    "வலி",
    "வலிக்குது",
    "நெஞ்சு",
    "மருந்து",
    "மாத்திரை",
    "உதவி",
    "சிகிச்சை",
    "மருந்தளவு",
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
  );
  const padded = ` ${current} `;
  return [...terms].some((term) => padded.includes(` ${term} `));
}
