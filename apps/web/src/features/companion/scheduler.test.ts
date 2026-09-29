import { describe, expect, it } from "vitest";
import {
  BOX_INTERVAL_DAYS,
  addDays,
  dueKeys,
  intervalFor,
  isDayKey,
  isDue,
  localDayKey,
  schedule,
  type ReviewItem,
} from "./scheduler";

const day = "2026-09-29";

describe("Leitner scheduler", () => {
  it("uses 1, 2, 4, 7 and 14 day intervals for boxes 1–5", () => {
    expect(BOX_INTERVAL_DAYS).toEqual([1, 2, 4, 7, 14]);
    expect([1, 2, 3, 4, 5].map((box) => intervalFor(box as 1))).toEqual([
      1, 2, 4, 7, 14,
    ]);
  });

  it("puts a missed phrase in box 1, due the next local day, with its marked words", () => {
    expect(
      schedule(undefined, "missed", day, ["water", "water", "some"]),
    ).toEqual({
      box: 1,
      due: "2026-09-30",
      lastSeen: day,
      words: ["water", "some"],
    });
  });

  it("moves correct recall up one box at a time and caps at box 5", () => {
    let item = schedule(undefined, "correct", day);
    expect(item).toMatchObject({ box: 2, due: "2026-10-01" });
    const boxes: number[] = [item.box];
    for (let i = 0; i < 5; i++) {
      item = schedule(item, "correct", item.due);
      boxes.push(item.box);
    }
    expect(boxes).toEqual([2, 3, 4, 5, 5, 5]);
    expect(item.due).toBe(addDays(item.lastSeen, 14));
  });

  it("walks 1 → 2 → 3 → 4 → 5 from a missed phrase", () => {
    let item = schedule(undefined, "missed", day);
    const seen: [number, string][] = [[item.box, item.due]];
    for (let i = 0; i < 4; i++) {
      item = schedule(item, "correct", item.due);
      seen.push([item.box, item.due]);
    }
    expect(seen).toEqual([
      [1, "2026-09-30"],
      [2, "2026-10-02"],
      [3, "2026-10-06"],
      [4, "2026-10-13"],
      [5, "2026-10-27"],
    ]);
  });

  it("returns any box to box 1 after a miss", () => {
    const box4: ReviewItem = {
      box: 4,
      due: day,
      lastSeen: "2026-09-22",
      words: [],
    };
    expect(schedule(box4, "missed", day)).toMatchObject({
      box: 1,
      due: "2026-09-30",
    });
  });

  it("does not skip boxes or undo a miss when practised again before it is due", () => {
    const missed = schedule(undefined, "missed", day, ["tea"]);
    const again = schedule(missed, "correct", day);
    expect(again).toEqual({ ...missed, lastSeen: day });
    const box3: ReviewItem = {
      box: 3,
      due: "2026-10-03",
      lastSeen: "2026-09-29",
      words: [],
    };
    expect(schedule(box3, "correct", "2026-10-01")).toEqual({
      ...box3,
      lastSeen: "2026-10-01",
    });
  });

  it("an overdue phrase still moves up only one box", () => {
    const overdue: ReviewItem = {
      box: 2,
      due: "2026-09-01",
      lastSeen: "2026-08-30",
      words: [],
    };
    expect(schedule(overdue, "correct", day)).toMatchObject({
      box: 3,
      due: "2026-10-03",
    });
  });
});

describe("local calendar days", () => {
  it("changes day exactly at local midnight", () => {
    const beforeMidnight = new Date(2026, 8, 29, 23, 59, 59);
    const afterMidnight = new Date(2026, 8, 30, 0, 0, 1);
    expect(localDayKey(beforeMidnight)).toBe("2026-09-29");
    expect(localDayKey(afterMidnight)).toBe("2026-09-30");
    const item = schedule(undefined, "missed", localDayKey(beforeMidnight));
    expect(isDue(item, localDayKey(beforeMidnight))).toBe(false);
    expect(isDue(item, localDayKey(afterMidnight))).toBe(true);
  });

  it("adds calendar days across month, year and daylight-saving boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-11-01", 14)).toBe("2026-11-15");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("accepts only real YYYY-MM-DD days", () => {
    expect(isDayKey("2026-09-29")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-9-29")).toBe(false);
    expect(isDayKey("yesterday")).toBe(false);
  });
});

describe("due phrases", () => {
  const items: Record<string, ReviewItem> = {
    "en:daily.tea": {
      box: 3,
      due: "2026-09-20",
      lastSeen: "2026-09-16",
      words: [],
    },
    "en:daily.water": {
      box: 1,
      due: "2026-09-29",
      lastSeen: "2026-09-28",
      words: [],
    },
    "en:daily.milk": {
      box: 1,
      due: "2026-09-20",
      lastSeen: "2026-09-19",
      words: [],
    },
    "en:daily.rice": {
      box: 2,
      due: "2026-09-30",
      lastSeen: "2026-09-28",
      words: [],
    },
    "ta:daily.tea": {
      box: 1,
      due: "2026-09-01",
      lastSeen: "2026-08-31",
      words: [],
    },
  };
  it("lists due phrases, most overdue first, then lower boxes", () => {
    expect(dueKeys(items, day, "en:")).toEqual([
      "en:daily.milk",
      "en:daily.tea",
      "en:daily.water",
    ]);
  });
  it("keeps languages apart and includes the next day's items after midnight", () => {
    expect(dueKeys(items, day, "ta:")).toEqual(["ta:daily.tea"]);
    expect(dueKeys(items, "2026-09-30", "en:")).toContain("en:daily.rice");
  });
});
