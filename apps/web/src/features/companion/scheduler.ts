/**
 * Deterministic Leitner scheduling on local calendar days ("YYYY-MM-DD"),
 * never fixed 24-hour intervals, so daylight-saving changes cannot shift a day.
 */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14] as const;
export type Box = 1 | 2 | 3 | 4 | 5;

export interface ReviewItem {
  box: Box;
  /** Local day on which the phrase is next due. */
  due: string;
  /** Local day of the most recent practice. */
  lastSeen: string;
  /** Words the person marked as not clear last time (practice hints only). */
  words: string[];
}
export type Outcome = "correct" | "missed";

const pad = (value: number) => String(value).padStart(2, "0");
export function localDayKey(date: Date | number): string {
  const value = typeof date === "number" ? new Date(date) : date;
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
export function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}
export function addDays(day: string, days: number): string {
  const value = parseDay(day);
  value.setDate(value.getDate() + days);
  return localDayKey(value);
}
export const isDayKey = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/u.test(value) && localDayKey(parseDay(value)) === value;

export function intervalFor(box: Box): number {
  return BOX_INTERVAL_DAYS[box - 1];
}
export function isDue(item: ReviewItem, today: string): boolean {
  return item.due <= today;
}

/**
 * - A miss (Not yet, unclear words, wrong choice) returns to box 1, due tomorrow.
 * - Correct recall of a new phrase starts in box 2.
 * - Correct recall of a due phrase moves up one box (max 5).
 * - Correct practice before the due day changes nothing, so repeating a
 *   phrase several times in one lesson cannot skip boxes or undo a miss.
 */
export function schedule(
  previous: ReviewItem | undefined,
  outcome: Outcome,
  today: string,
  words: readonly string[] = [],
): ReviewItem {
  if (outcome === "missed")
    return {
      box: 1,
      due: addDays(today, intervalFor(1)),
      lastSeen: today,
      words: [...new Set(words)].slice(0, 20),
    };
  if (!previous)
    return {
      box: 2,
      due: addDays(today, intervalFor(2)),
      lastSeen: today,
      words: [],
    };
  if (!isDue(previous, today)) return { ...previous, lastSeen: today };
  const box = Math.min(5, previous.box + 1) as Box;
  return {
    box,
    due: addDays(today, intervalFor(box)),
    lastSeen: today,
    words: [],
  };
}

/** Due phrase keys, most overdue first, then lower boxes, then key order. */
export function dueKeys(
  items: Readonly<Record<string, ReviewItem>>,
  today: string,
  prefix = "",
): string[] {
  return Object.entries(items)
    .filter(([key, item]) => key.startsWith(prefix) && isDue(item, today))
    .sort(
      ([keyA, a], [keyB, b]) =>
        a.due.localeCompare(b.due) || a.box - b.box || keyA.localeCompare(keyB),
    )
    .map(([key]) => key);
}
