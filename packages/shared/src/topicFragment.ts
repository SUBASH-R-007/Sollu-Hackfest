import { containsTerm } from "./lexicon";
import type { Fragment } from "./schemas";

/** Topic menus whose first path element is navigation, not patient wording. A tap sends the
 * leaf as fragment.raw (idli, water, Karthik, worried, tv, home, pray) and the path
 * [category, leaf]; People leaves are contact ids and the raw text is the display name. */
export const navigationTopicIds = [
  "food",
  "drink",
  "people",
  "feelings",
  "tv_phone",
  "go_out",
  "prayer",
] as const;
const navigation = new Set<string>(navigationTopicIds);

type TopicFragment = Pick<Fragment, "modality" | "raw" | "topicPath">;

const isNavigationPath = (fragment: TopicFragment) => {
  const path = fragment.topicPath ?? [];
  return (
    fragment.modality === "topic" && path.length > 1 && navigation.has(path[0]!)
  );
};

/** Topic path elements that carry the tapped meaning and must survive into any sentence.
 * Pain keeps its whole path (body part and side are the patient's selection); single-level
 * topics keep their id. For navigation topics only the tapped word leaf counts: a category id
 * (food, people, tv_phone) is a menu label and a contact id is an identifier, not a word. */
export function explicitTopicTerms(fragment: TopicFragment): string[] {
  const path = fragment.topicPath ?? [];
  if (!isNavigationPath(fragment)) return [...path];
  if (path[0] === "people") return [];
  const leaf = path.at(-1)!;
  return containsTerm(fragment.raw, leaf) ? [] : [leaf];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Remove navigation category ids that an older client may have prefixed to the raw text
 * ("food idli", "tv_phone tv"). Only whole category ids are removed; the leaf always stays. */
export function withoutTopicParents(
  text: string,
  fragment: TopicFragment,
): string {
  if (!isNavigationPath(fragment)) return text;
  const leaf = fragment.topicPath!.at(-1)!.toLowerCase();
  let result = text;
  for (const parent of fragment.topicPath!.slice(0, -1)) {
    for (const form of new Set([parent, parent.replaceAll("_", " ")])) {
      if (form.toLowerCase() === leaf) continue;
      result = result.replace(
        new RegExp(
          `(^|[^\\p{L}\\p{M}\\p{N}_])${escape(form)}(?=$|[^\\p{L}\\p{M}\\p{N}_])`,
          "giu",
        ),
        "$1 ",
      );
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

/** The explicit patient words of a fragment: raw (without navigation ids), object label and
 * the meaningful topic path terms. */
export function explicitFragmentText(
  fragment: TopicFragment & { objectLabel?: string },
  text: string = fragment.raw,
): string {
  return [
    withoutTopicParents(text, fragment),
    fragment.objectLabel ?? "",
    ...explicitTopicTerms(fragment),
  ]
    .filter(Boolean)
    .join(" ");
}
