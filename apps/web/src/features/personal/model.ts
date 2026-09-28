import type { Lang } from "@sollu/shared";

export const PERSONAL_KEY = "personal:v1";
export const MAX_PERSONAL_ITEMS = 250;
export type PersonalKind = "word" | "scene" | "story" | "passport";
export interface PersonalBase {
  id: string;
  kind: PersonalKind;
  lang: Lang;
  title: string;
  pinned: boolean;
  revision: number;
  updatedAt: number;
  /** Approval is for this revision only. Every edit clears it. */
  approvedAt?: number;
}
export interface PersonalWord extends PersonalBase {
  kind: "word";
  text: string;
  category: string;
  aliases?: string[];
  description?: string;
  hidden?: boolean;
}
export interface SceneChoice {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
}
export interface PersonalScene extends PersonalBase {
  kind: "scene";
  image: Blob;
  choices: SceneChoice[];
}
export interface PersonalStory extends PersonalBase {
  kind: "story" | "passport";
  lines: string[];
}
export type PersonalItem = PersonalWord | PersonalScene | PersonalStory;
export interface PersonalStore {
  version: 1;
  items: PersonalItem[];
}

const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const string = (v: unknown, max: number) =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  ![...v].some(
    (char) =>
      char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0)),
  );
const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);

export function validatePersonalItem(value: unknown): PersonalItem {
  if (
    !object(value) ||
    !string(value.id, 100) ||
    !string(value.title, 120) ||
    !["ta", "en"].includes(String(value.lang)) ||
    typeof value.pinned !== "boolean" ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !finite(value.updatedAt) ||
    Number(value.updatedAt) <= 0 ||
    (value.approvedAt !== undefined &&
      (!finite(value.approvedAt) || Number(value.approvedAt) <= 0))
  ) {
    throw new Error("Invalid personal card.");
  }
  const base: PersonalBase = {
    id: value.id as string,
    title: value.title as string,
    lang: value.lang as Lang,
    kind: value.kind as PersonalKind,
    pinned: value.pinned,
    revision: value.revision as number,
    updatedAt: value.updatedAt as number,
    ...(value.approvedAt === undefined
      ? {}
      : { approvedAt: value.approvedAt as number }),
  };
  if (value.kind === "word") {
    if (!string(value.text, 500) || !string(value.category, 60))
      throw new Error("Invalid saved word.");
    if (
      value.aliases !== undefined &&
      (!Array.isArray(value.aliases) ||
        value.aliases.length > 12 ||
        value.aliases.some((v) => !string(v, 80)))
    )
      throw new Error(
        "Use up to 12 alternative names, each at most 80 characters.",
      );
    if (
      value.description !== undefined &&
      (typeof value.description !== "string" || value.description.length > 240)
    )
      throw new Error("Keep the description within 240 characters.");
    if (value.hidden !== undefined && typeof value.hidden !== "boolean")
      throw new Error("Invalid word visibility.");
    return {
      ...base,
      kind: "word",
      text: value.text as string,
      category: value.category as string,
      ...(value.aliases === undefined
        ? {}
        : { aliases: value.aliases as string[] }),
      ...(value.description === undefined
        ? {}
        : { description: value.description as string }),
      ...(value.hidden === undefined ? {} : { hidden: value.hidden }),
    };
  }
  if (value.kind === "scene") {
    if (
      !(value.image instanceof Blob) ||
      !["image/jpeg", "image/png", "image/webp"].includes(value.image.type) ||
      value.image.size === 0 ||
      value.image.size > 2 * 1024 * 1024 ||
      !Array.isArray(value.choices) ||
      !value.choices.length ||
      value.choices.length > 8
    )
      throw new Error("A scene needs a local photo and 1–8 choices.");
    const ids = new Set<string>();
    const choices = value.choices.map((v) => {
      if (
        !object(v) ||
        !string(v.id, 100) ||
        ids.has(v.id as string) ||
        !string(v.label, 80) ||
        !string(v.text, 500) ||
        !finite(v.x) ||
        !finite(v.y) ||
        Number(v.x) < 0 ||
        Number(v.x) > 100 ||
        Number(v.y) < 0 ||
        Number(v.y) > 100
      )
        throw new Error("Invalid scene choice.");
      ids.add(v.id as string);
      return {
        id: v.id as string,
        label: v.label as string,
        text: v.text as string,
        x: v.x as number,
        y: v.y as number,
      };
    });
    return { ...base, kind: "scene", image: value.image, choices };
  }
  if (value.kind === "story" || value.kind === "passport") {
    if (
      !Array.isArray(value.lines) ||
      value.lines.length < 1 ||
      value.lines.length > 12 ||
      value.lines.some((line) => !string(line, 500))
    )
      throw new Error("Use 1–12 short lines, up to 500 characters each.");
    return { ...base, kind: value.kind, lines: value.lines as string[] };
  }
  throw new Error("Unknown personal card type.");
}

export function validatePersonalStore(value: unknown): PersonalStore {
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.items) ||
    value.items.length > MAX_PERSONAL_ITEMS
  )
    throw new Error("Unsupported personal collection.");
  const items = value.items.map(validatePersonalItem);
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("Duplicate personal card identifiers.");
  return { version: 1, items };
}

export function reviseItem(item: PersonalItem, now = Date.now()): PersonalItem {
  const next = { ...item, revision: item.revision + 1, updatedAt: now };
  delete next.approvedAt;
  return validatePersonalItem(next);
}

export function approveItem(
  item: PersonalItem,
  revision: number,
  now = Date.now(),
): PersonalItem {
  if (item.revision !== revision)
    throw new Error(
      "This card changed. Read the latest version before approving.",
    );
  return validatePersonalItem({ ...item, approvedAt: now });
}

/** Import never overwrites; imported content returns to patient review. */
export function mergePersonal(current: PersonalStore, incoming: PersonalStore) {
  const ids = new Set(current.items.map((item) => item.id));
  const additions = incoming.items
    .filter((item) => !ids.has(item.id))
    .map((item) => {
      const copy = { ...item };
      delete copy.approvedAt;
      return copy;
    });
  return {
    store: validatePersonalStore({
      version: 1,
      items: [...current.items, ...additions],
    }),
    added: additions.length,
    skipped: incoming.items.length - additions.length,
  };
}
