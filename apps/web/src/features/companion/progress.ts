import { z } from "zod";
import {
  addDays,
  isDayKey,
  localDayKey,
  parseDay,
  schedule,
  type Outcome,
  type ReviewItem,
} from "./scheduler";

export const PROGRESS_KEY = "companion-progress:v1";
export const DAILY_GOALS = [3, 5, 10] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];
const MAX_DAYS = 120;
const MAX_ITEMS = 500;
const MAX_LESSON_COUNTERS = 50;

export interface DayActivity {
  steps: number;
  rest: boolean;
}
export interface CompanionProgress {
  version: 1;
  dailyGoal: DailyGoal;
  /** Companion content language; undefined follows the rehab profile. */
  contentLang?: "en" | "ta";
  days: Record<string, DayActivity>;
  items: Record<string, ReviewItem>;
  /** Completed lessons per `<unitId>:<lang>`. */
  lessons: Record<string, number>;
}
export function defaultProgress(): CompanionProgress {
  return { version: 1, dailyGoal: 5, days: {}, items: {}, lessons: {} };
}

const dayKey = z.string().refine(isDayKey);
const phraseKey = z
  .string()
  .min(4)
  .max(100)
  .regex(/^(en|ta):[a-z_.]+$/u);
const daySchema = z.object({
  steps: z.number().int().min(0).max(10000),
  rest: z.boolean(),
});
const itemSchema = z.object({
  box: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  due: dayKey,
  lastSeen: dayKey,
  words: z.array(z.string().min(1).max(80)).max(20),
});

/** Keeps every valid part of stored progress; anything malformed is dropped, never guessed. */
export function parseProgress(value: unknown): CompanionProgress {
  const result = defaultProgress();
  if (!value || typeof value !== "object" || Array.isArray(value))
    return result;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return result;
  if (DAILY_GOALS.includes(raw.dailyGoal as DailyGoal))
    result.dailyGoal = raw.dailyGoal as DailyGoal;
  if (raw.contentLang === "en" || raw.contentLang === "ta")
    result.contentLang = raw.contentLang;
  const record = (input: unknown) =>
    input && typeof input === "object" && !Array.isArray(input)
      ? Object.entries(input as Record<string, unknown>)
      : [];
  for (const [key, day] of record(raw.days)) {
    const parsed = daySchema.safeParse(day);
    if (dayKey.safeParse(key).success && parsed.success)
      result.days[key] = parsed.data;
  }
  result.days = trimDays(result.days);
  for (const [key, item] of record(raw.items).slice(0, MAX_ITEMS)) {
    const parsed = itemSchema.safeParse(item);
    if (phraseKey.safeParse(key).success && parsed.success)
      result.items[key] = parsed.data;
  }
  for (const [key, count] of record(raw.lessons).slice(
    0,
    MAX_LESSON_COUNTERS,
  )) {
    if (
      /^[a-z]+:(en|ta)$/u.test(key) &&
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0 &&
      count <= 100000
    )
      result.lessons[key] = count;
  }
  return result;
}

function trimDays(days: Record<string, DayActivity>) {
  const keys = Object.keys(days).sort().slice(-MAX_DAYS);
  return Object.fromEntries(keys.map((key) => [key, days[key]]));
}

// ---------- pure updates ----------

export function recordStep(
  progress: CompanionProgress,
  today: string,
  result?: { key: string; outcome: Outcome; words?: string[] },
): CompanionProgress {
  const day = progress.days[today] ?? { steps: 0, rest: false };
  const items = { ...progress.items };
  if (result)
    items[result.key] = schedule(
      items[result.key],
      result.outcome,
      today,
      result.words,
    );
  return {
    ...progress,
    days: trimDays({
      ...progress.days,
      [today]: { ...day, steps: day.steps + 1 },
    }),
    items,
  };
}
export function toggleRest(
  progress: CompanionProgress,
  today: string,
  rest?: boolean,
): CompanionProgress {
  const day = progress.days[today] ?? { steps: 0, rest: false };
  return {
    ...progress,
    days: trimDays({
      ...progress.days,
      [today]: { ...day, rest: rest ?? !day.rest },
    }),
  };
}
export function completeLesson(
  progress: CompanionProgress,
  unitId: string,
  lang: "en" | "ta",
): CompanionProgress {
  const key = `${unitId}:${lang}`;
  return {
    ...progress,
    lessons: { ...progress.lessons, [key]: (progress.lessons[key] ?? 0) + 1 },
  };
}

// ---------- calendar views ----------

export type DotState = "practised" | "rest" | "none" | "future";
export interface WeekDot {
  day: string;
  state: DotState;
  today: boolean;
}

/** Monday of the local week containing `today`. */
export function weekStart(today: string): string {
  const weekday = parseDay(today).getDay(); // 0 = Sunday
  return addDays(today, -((weekday + 6) % 7));
}
export function weekDots(
  days: Readonly<Record<string, DayActivity>>,
  today: string,
): WeekDot[] {
  const monday = weekStart(today);
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(monday, index);
    const activity = days[day];
    const state: DotState =
      day > today
        ? "future"
        : activity?.steps
          ? "practised"
          : activity?.rest
            ? "rest"
            : "none";
    return { day, state, today: day === today };
  });
}
/**
 * Consecutive days with practice or a chosen rest day. A day that has not
 * happened yet today never breaks the count: it ends at yesterday instead.
 */
export function currentStreak(
  days: Readonly<Record<string, DayActivity>>,
  today: string,
): number {
  const active = (day: string) =>
    Boolean(days[day]?.steps) || Boolean(days[day]?.rest);
  let day = active(today) ? today : addDays(today, -1);
  let count = 0;
  while (active(day) && count < 10000) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
export function stepsToday(
  days: Readonly<Record<string, DayActivity>>,
  today: string,
): number {
  return days[today]?.steps ?? 0;
}
export const todayKey = (now = Date.now()) => localDayKey(now);
