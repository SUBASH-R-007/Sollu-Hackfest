import {
  CandidateSchema,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";
import { db, getKV, setKV } from "../../db";
import { normalize } from "../../lib/context";

export interface RehearsalResult {
  candidates: Candidate[];
  model: string;
  latencyMs: number;
}
export interface RehearsalEntry extends RehearsalResult {
  key: string;
  savedAt: number;
}
const storageKey = "sollu:rehearsal:v4";
const MAX_ENTRIES = 100;

/** Time of day matters; a new wall-clock timestamp must not invalidate a rehearsal. */
export function rehearsalKey(context: ContextPacket): string {
  const stable = <T>(items: T[]) =>
    [...items].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  const routineFields = (
    items: NonNullable<ContextPacket["routine"]>["dueNow"],
  ) =>
    stable(items.map((item) => [normalize(item.label), item.topic, item.time]));
  return JSON.stringify({
    version: 4,
    policyVersion: "meaning-1",
    communication: context.communication,
    alternatives: context.fragment.sttAlternatives ?? [],
    objectSource: context.fragment.objectSource,
    speaker: context.speaker,
    substitutions: context.substitutions ?? [],
    ownExamples: context.ownExamples ?? [],
    recentTurns: context.recentTurns ?? [],
    rejectedMeaningKeys: context.rejectedMeaningKeys ?? [],
    fragment: {
      modality: context.fragment.modality,
      raw: normalize(context.fragment.raw),
      topicPath: (context.fragment.topicPath ?? []).map(normalize),
      objectLabel: normalize(context.fragment.objectLabel ?? ""),
    },
    lang: context.outputLang,
    round: context.round,
    timeBucket: context.now?.timeBucket ?? "",
    place: context.place ?? "",
    addressee: {
      name: normalize(context.addressee?.name ?? ""),
      relation: normalize(context.addressee?.relation ?? ""),
      register: context.addressee?.register ?? "",
    },
    routine: {
      dueNow: routineFields(context.routine?.dueNow ?? []),
      justPassed: routineFields(context.routine?.justPassed ?? []),
    },
    people: stable(
      (context.people ?? []).map((person) => [
        normalize(person.name),
        normalize(person.relation),
        [...new Set(person.aliases.map(normalize))].sort(),
      ]),
    ),
    vocabulary: stable(
      (context.vocabulary ?? []).map((item) => [
        normalize(item.term),
        normalize(item.kind),
        normalize(item.meaning ?? ""),
      ]),
    ),
    exclude: [...new Set(context.exclude.map(normalize))].sort(),
    partnerQuestion: normalize(context.partnerQuestion?.text ?? ""),
  });
}
function validEntry(entry: unknown): entry is RehearsalEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Partial<RehearsalEntry>;
  return (
    typeof e.key === "string" &&
    e.key.length < 6000 &&
    typeof e.model === "string" &&
    e.model.length < 200 &&
    Number.isFinite(e.savedAt) &&
    Number.isFinite(e.latencyMs) &&
    Number(e.latencyMs) >= 0 &&
    Array.isArray(e.candidates) &&
    e.candidates.length > 0 &&
    e.candidates.length <= 3 &&
    e.candidates.every(
      (c) => CandidateSchema.safeParse(c).success && c.source !== "model",
    )
  );
}
async function entries(): Promise<RehearsalEntry[]> {
  const stored = await getKV<unknown>(storageKey);
  return Array.isArray(stored)
    ? stored
        .filter(validEntry)
        .filter(
          (e) =>
            Date.now() - e.savedAt < 7 * 86400000 && e.savedAt <= Date.now(),
        )
        .slice(0, MAX_ENTRIES)
    : [];
}
export async function saveRehearsal(
  context: ContextPacket,
  result: RehearsalResult,
): Promise<void> {
  if (
    !result.candidates.length ||
    result.candidates.some((c) => c.source === "model")
  )
    return;
  const value: RehearsalEntry = {
    key: rehearsalKey(context),
    candidates: result.candidates.map((c) => CandidateSchema.parse(c)),
    model: result.model,
    latencyMs: result.latencyMs,
    savedAt: Date.now(),
  };
  if (!validEntry(value)) throw new Error("Invalid rehearsal result");
  await db.transaction("rw", db.kv, async () => {
    const previous = await entries();
    await setKV(
      storageKey,
      [value, ...previous.filter((e) => e.key !== value.key)].slice(
        0,
        MAX_ENTRIES,
      ),
    );
  });
}
export async function getRehearsal(
  context: ContextPacket,
): Promise<RehearsalEntry | undefined> {
  const key = rehearsalKey(context);
  return (await entries()).find((e) => e.key === key);
}
export async function getRehearsalCount(): Promise<number> {
  return (await entries()).length;
}
export async function clearRehearsal(): Promise<void> {
  await db.kv.delete(storageKey);
}
