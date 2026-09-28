import type {
  Attempt,
  ContextPacket,
  Fragment,
  MemoryEntry,
  TimeBucket,
  WordSubstitution,
  RoutineItem,
} from "@sollu/shared";
import {
  RoutineItemSchema,
  ContextPacketSchema,
  demoSeed,
} from "@sollu/shared";
import { defaultSettings } from "../db";
import type { Settings } from "../db";
export function timeBucket(hour: number): TimeBucket {
  if (hour < 4 || hour >= 23) return "late_night";
  if (hour < 7) return "early_morning";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}
export function clockNow(settings: Settings, realNow = Date.now()): Date {
  if (!settings.demo) return new Date(realNow);
  // Keep the original calendar anchor: crossing real midnight must not add a day twice.
  const date = new Date(settings.demoSetAt);
  const [h, m] = settings.demoTime.split(":").map(Number);
  date.setHours(h, m, 0, 0);
  return new Date(date.getTime() + Math.max(0, realNow - settings.demoSetAt));
}
export function minuteDistance(time: string, now: Date): number {
  const [h, m] = time.split(":").map(Number);
  const delta = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  return ((delta + 2160) % 1440) - 720;
}
/** Legacy demo records predate the explicit sample flag. A reviewed save sets false. */
export function isSampleRoutine(routine: RoutineItem): boolean {
  if (routine.isSample !== undefined) return routine.isSample;
  return [...defaultSettings.routines, ...demoSeed.routine].some(
    (seed) =>
      seed.id === routine.id &&
      seed.label === routine.label &&
      seed.topic === routine.topic &&
      seed.time === routine.time &&
      !routine.place &&
      JSON.stringify([...seed.days].sort()) ===
        JSON.stringify([...routine.days].sort()),
  );
}

/** Match the actual occurrence day, including yesterday/tomorrow across midnight. */
export function getNearbyRoutines(
  settings: Settings,
  now = clockNow(settings),
): Array<{ routine: RoutineItem; minutesAway: number }> {
  if (settings.useRoutineContext === false || settings.useTimeContext === false)
    return [];
  const windowMinutes = [15, 45, 90].includes(settings.routineWindowMinutes)
    ? settings.routineWindowMinutes
    : 45;
  return settings.routines
    .slice(0, 32)
    .flatMap((stored) => {
      const parsed = RoutineItemSchema.safeParse(stored);
      if (!parsed.success || !parsed.data.confirmed) return [];
      const routine = parsed.data;
      if (!settings.demo && isSampleRoutine(routine)) return [];
      if (
        routine.place &&
        (settings.usePlaceContext === false || routine.place !== settings.place)
      )
        return [];
      const [hours, minutes] = routine.time.split(":").map(Number);
      const occurrences = [-1, 0, 1].flatMap((dayOffset) => {
        const at = new Date(now);
        at.setDate(at.getDate() + dayOffset);
        at.setHours(hours, minutes, 0, 0);
        const minutesAway = (at.getTime() - now.getTime()) / 60_000;
        return routine.days.includes(at.getDay()) &&
          Math.abs(minutesAway) <= windowMinutes
          ? [{ routine, minutesAway }]
          : [];
      });
      return occurrences
        .sort((a, b) => Math.abs(a.minutesAway) - Math.abs(b.minutesAway))
        .slice(0, 1);
    })
    .sort(
      (a, b) =>
        Math.abs(a.minutesAway) - Math.abs(b.minutesAway) ||
        a.routine.id.localeCompare(b.routine.id),
    );
}
export function buildContext(
  settings: Settings,
  fragment: Fragment,
  opts: {
    now?: number;
    round?: 1 | 2 | 3;
    exclude?: string[];
    question?: { text: string; at: number; lang?: ContextPacket["outputLang"] };
    memories?: MemoryEntry[];
    substitutions?: WordSubstitution[];
  } = {},
): ContextPacket {
  const realNow = opts.now ?? Date.now(),
    now = clockNow(settings, realNow);
  const contact = settings.contacts.find((c) => c.id === settings.addressee);
  const relevant = getNearbyRoutines(settings, now);
  const routine = (passed: boolean) =>
    relevant
      .filter((r) => r.minutesAway < 0 === passed)
      .slice(0, 8)
      .map(({ routine: r, minutesAway }) => ({
        label: r.label,
        topic: r.topic,
        time: r.time,
        learned: r.source === "learned",
        place: r.place,
        minutesAway: Math.round(minutesAway),
      }));
  const question =
    opts.question && realNow - opts.question.at < 300000
      ? {
          text: opts.question.text,
          lang: opts.question.lang ?? settings.lang,
          minutesAgo: Math.max(0, (realNow - opts.question.at) / 60000),
        }
      : undefined;
  return {
    fragment,
    outputLang: contact?.lang ?? settings.lang,
    round: opts.round ?? 1,
    exclude: opts.exclude ?? [],
    now:
      settings.useTimeContext === false
        ? undefined
        : {
            localTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
            weekday: now.getDay(),
            timeBucket: timeBucket(now.getHours()),
            isDemo: settings.demo,
          },
    place: settings.usePlaceContext === false ? undefined : settings.place,
    speaker: {
      preferredName: settings.name,
      gender: settings.speakerGender ?? "unspecified",
      dialectNote: settings.dialectNote || undefined,
    },
    addressee: contact
      ? {
          id: contact.id,
          name: contact.name,
          relation: contact.relation,
          register: contact.register,
        }
      : undefined,
    inputLangHints: ["ta", "en"],
    people: settings.contacts
      .slice(0, 10)
      .map((c) => ({ name: c.name, relation: c.relation, aliases: c.aliases })),
    routine: { dueNow: routine(false), justPassed: routine(true) },
    partnerQuestion: question,
    recentTurns: [],
    vocabulary: settings.vocabulary
      .slice(0, 20)
      .map((term) => ({ term, kind: "other" })),
    substitutions: (opts.substitutions ?? [])
      .filter(
        (s) =>
          s.confirmed === true &&
          (!s.lang || s.lang === (contact?.lang ?? settings.lang)) &&
          (!s.place || s.place === settings.place) &&
          (!s.addresseeId || s.addresseeId === settings.addressee) &&
          fragment.raw.toLowerCase().includes(s.heard.toLowerCase()),
      )
      .slice(0, 10),
    ownExamples: (opts.memories ?? [])
      .filter(
        (m) =>
          m.confirmed === true &&
          m.lang === (contact?.lang ?? settings.lang) &&
          m.placeLabel === settings.place &&
          m.addresseeId === settings.addressee &&
          memoryScore(m, fragment.raw, timeBucket(now.getHours()), realNow) > 0,
      )
      .slice(0, 5)
      .map((m) => ({
        fragment: m.fragmentRaw.slice(0, 120),
        sentence: m.sentence,
        timeBucket: m.timeBucket,
      })),
    communication: {
      sentenceStyle: settings.sentenceStyle ?? "natural",
      maxWords: settings.sentenceLength ?? 12,
      preferences: settings.sharePersonalContext
        ? settings.communicationPreferences?.trim().slice(0, 240) || undefined
        : undefined,
    },
  };
}

// Unicode marks belong to the same token as Tamil letters. Prefixes, suffixes and
// relationship labels alone must not expose unrelated people or custom terms.
function contextTokens(value: string): string[] {
  return (
    value
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
  );
}
function containsContextTerm(clues: string[][], term: string): boolean {
  const tokens = contextTokens(term);
  return (
    tokens.length > 0 &&
    clues.some((clue) =>
      clue.some((_, start) =>
        tokens.every((token, offset) => clue[start + offset] === token),
      ),
    )
  );
}

/** Explicit allowlist: device settings, keys, raw history and recordings never enter inference. */
export function inferenceContext(
  context: ContextPacket,
  settings: Settings,
): ContextPacket {
  // Minimize only the outgoing packet. The full local packet still supports
  // controlled vocabulary/interpretation. This does not de-identify free text.
  const explicitClues = [
    context.fragment.raw,
    context.partnerQuestion?.text ?? "",
  ].map(contextTokens);
  const selectedName = context.addressee?.name ?? "";
  const selectedTokens = contextTokens(selectedName);
  const people = context.people?.filter(
    (person) =>
      [person.name, ...person.aliases].some((term) =>
        containsContextTerm(explicitClues, term),
      ) ||
      (selectedTokens.length > 0 &&
        contextTokens(person.name).join(" ") === selectedTokens.join(" ")),
  );
  const vocabulary = context.vocabulary?.filter((entry) =>
    containsContextTerm([...explicitClues, selectedTokens], entry.term),
  );
  return ContextPacketSchema.parse({
    fragment: context.fragment,
    outputLang: context.outputLang,
    inputLangHints: context.inputLangHints,
    round: context.round,
    exclude: context.exclude,
    rejectedMeaningKeys: context.rejectedMeaningKeys,
    now: settings.useTimeContext === false ? undefined : context.now,
    partnerQuestion: context.partnerQuestion,
    communication: {
      sentenceStyle: context.communication?.sentenceStyle ?? "natural",
      maxWords: context.communication?.maxWords ?? 12,
      ...(settings.sharePersonalContext && context.communication?.preferences
        ? { preferences: context.communication.preferences }
        : {}),
    },
    ...(settings.sharePersonalContext
      ? {
          place: settings.usePlaceContext === false ? undefined : context.place,
          speaker: context.speaker,
          addressee: context.addressee,
          people,
          vocabulary,
          routine:
            settings.useRoutineContext === false ||
            settings.useTimeContext === false
              ? undefined
              : context.routine,
          substitutions: context.substitutions,
          ownExamples: context.ownExamples,
        }
      : {}),
    recentTurns: settings.shareRecentContext ? (context.recentTurns ?? []) : [],
  });
}

export function recentConfirmedTurns(
  attempts: Attempt[],
  context: ContextPacket,
  now = Date.now(),
): NonNullable<ContextPacket["recentTurns"]> {
  return attempts
    .filter(
      (attempt) =>
        attempt.outcome === "spoken" &&
        ["intended", "understood"].includes(
          attempt.communicationOutcome ?? "",
        ) &&
        Boolean(attempt.chosenText?.trim()) &&
        attempt.outputLang === context.outputLang &&
        attempt.addresseeId === context.addressee?.id &&
        attempt.place === context.place &&
        (attempt.endedAt ?? 0) <= now &&
        (attempt.endedAt ?? 0) > now - 10 * 60_000,
    )
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, 3)
    .reverse()
    .map((attempt) => ({
      speaker: "person",
      text: attempt.chosenText!.slice(0, 500),
      minutesAgo: (now - attempt.endedAt!) / 60000,
    }));
}
export const normalize = (s: string) =>
  s
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[.,!?…]/g, "")
    .replace(/\s+/g, " ");
export function memoryScore(
  memory: MemoryEntry,
  fragment: string,
  bucket: TimeBucket | undefined,
  now = Date.now(),
): number {
  const key = normalize(fragment),
    tokens = new Set(key.split(" "));
  const other = new Set(
    normalize(`${memory.fragmentRaw} ${memory.reading}`).split(" "),
  );
  const overlap = [...tokens].filter((x) => other.has(x)).length;
  const union = new Set([...tokens, ...other]).size;
  if (!overlap && key !== memory.fragmentKey) return 0;
  return (
    3 * Number(key === memory.fragmentKey) +
    (2 * overlap) / Math.max(1, union) +
    Number(bucket === memory.timeBucket) +
    0.5 * Math.log1p(memory.count) +
    Math.pow(0.5, (now - memory.lastAt) / 1209600000)
  );
}
