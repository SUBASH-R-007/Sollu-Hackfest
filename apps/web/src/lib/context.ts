import type {
  ContextPacket,
  Fragment,
  MemoryEntry,
  TimeBucket,
  WordSubstitution,
} from "@sollu/shared";
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
  const relevant = settings.routines.filter(
    (r) =>
      r.confirmed &&
      r.days.includes(now.getDay()) &&
      Math.abs(minuteDistance(r.time, now)) <= 45,
  );
  const routine = (passed: boolean) =>
    relevant
      .filter((r) => minuteDistance(r.time, now) < 0 === passed)
      .slice(0, 8)
      .map((r) => ({
        label: r.label,
        topic: r.topic,
        time: r.time,
        learned: r.source === "learned",
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
    now: {
      localTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      weekday: now.getDay(),
      timeBucket: timeBucket(now.getHours()),
    },
    place: settings.place,
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
  };
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
  bucket: TimeBucket,
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
