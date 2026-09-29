import { describe, expect, it } from "vitest";
import {
  completeLesson,
  currentStreak,
  defaultProgress,
  parseProgress,
  recordStep,
  stepsToday,
  toggleRest,
  weekDots,
  weekStart,
  type CompanionProgress,
  type DayActivity,
} from "./progress";

// 2026-09-29 is a Tuesday; its Monday-start week runs 28 Sep – 4 Oct.
const today = "2026-09-29";

describe("week dots", () => {
  it("start on Monday in the local week, including when today is Sunday or Monday", () => {
    expect(weekStart(today)).toBe("2026-09-28");
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
    expect(weekStart("2026-09-28")).toBe("2026-09-28");
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("show practised, rest, empty and future days", () => {
    const days: Record<string, DayActivity> = {
      "2026-09-27": { steps: 4, rest: false },
      "2026-09-28": { steps: 0, rest: true },
      "2026-09-29": { steps: 2, rest: true },
    };
    const dots = weekDots(days, today);
    expect(dots.map((dot) => dot.day)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(dots.map((dot) => dot.state)).toEqual([
      "rest",
      "practised",
      "future",
      "future",
      "future",
      "future",
      "future",
    ]);
    expect(dots.filter((dot) => dot.today).map((dot) => dot.day)).toEqual([
      today,
    ]);
    expect(weekDots({}, "2026-10-04").map((dot) => dot.state)).toEqual(
      Array(7).fill("none"),
    );
  });
});

describe("streak", () => {
  it("counts practice and chosen rest days in a row", () => {
    const days: Record<string, DayActivity> = {
      "2026-09-25": { steps: 3, rest: false },
      "2026-09-26": { steps: 0, rest: true },
      "2026-09-27": { steps: 1, rest: false },
      "2026-09-28": { steps: 5, rest: false },
      "2026-09-29": { steps: 1, rest: false },
    };
    expect(currentStreak(days, today)).toBe(5);
  });

  it("does not break before today has happened, but a missed day ends it", () => {
    const days: Record<string, DayActivity> = {
      "2026-09-26": { steps: 2, rest: false },
      "2026-09-27": { steps: 2, rest: false },
      "2026-09-28": { steps: 2, rest: false },
    };
    expect(currentStreak(days, today)).toBe(3);
    expect(currentStreak(days, "2026-09-30")).toBe(0);
    expect(currentStreak({}, today)).toBe(0);
    expect(
      currentStreak({ "2026-09-29": { steps: 0, rest: false } }, today),
    ).toBe(0);
  });

  it("runs across a month boundary", () => {
    const days: Record<string, DayActivity> = {
      "2026-09-30": { steps: 1, rest: false },
      "2026-10-01": { steps: 1, rest: false },
    };
    expect(currentStreak(days, "2026-10-01")).toBe(2);
  });
});

describe("progress updates", () => {
  it("counts every completed step toward today's goal and schedules reviews", () => {
    let progress = recordStep(defaultProgress(), today);
    progress = recordStep(progress, today, {
      key: "en:daily.water",
      outcome: "missed",
      words: ["water"],
    });
    expect(stepsToday(progress.days, today)).toBe(2);
    expect(progress.items["en:daily.water"]).toEqual({
      box: 1,
      due: "2026-09-30",
      lastSeen: today,
      words: ["water"],
    });
  });

  it("records a rest day positively and can undo it", () => {
    const rested = toggleRest(defaultProgress(), today);
    expect(rested.days[today]).toEqual({ steps: 0, rest: true });
    expect(currentStreak(rested.days, today)).toBe(1);
    expect(toggleRest(rested, today).days[today]).toEqual({
      steps: 0,
      rest: false,
    });
  });

  it("counts finished lessons per unit and language", () => {
    const once = completeLesson(defaultProgress(), "food", "ta");
    expect(completeLesson(once, "food", "ta").lessons).toEqual({
      "food:ta": 2,
    });
  });
});

describe("stored progress validation", () => {
  it("falls back to safe defaults for missing or malformed data", () => {
    for (const value of [undefined, null, "x", 3, [], { version: 2 }])
      expect(parseProgress(value)).toEqual(defaultProgress());
    expect(defaultProgress().dailyGoal).toBe(5);
  });

  it("keeps each valid part and drops only what is malformed", () => {
    const parsed = parseProgress({
      version: 1,
      dailyGoal: 7,
      contentLang: "fr",
      days: {
        "2026-09-29": { steps: 3, rest: false },
        "2026-02-30": { steps: 1, rest: false },
        "2026-09-28": { steps: -1, rest: false },
        "2026-09-27": { steps: 2 },
      },
      items: {
        "en:daily.water": {
          box: 2,
          due: "2026-10-01",
          lastSeen: "2026-09-29",
          words: [],
        },
        "en:daily.tea": {
          box: 6,
          due: "2026-10-01",
          lastSeen: "2026-09-29",
          words: [],
        },
        "<script>": {
          box: 1,
          due: "2026-10-01",
          lastSeen: "2026-09-29",
          words: [],
        },
      },
      lessons: { "food:ta": 2, "food:fr": 1, "comfort:en": 1.5 },
    });
    expect(parsed.dailyGoal).toBe(5);
    expect(parsed.contentLang).toBeUndefined();
    expect(Object.keys(parsed.days)).toEqual(["2026-09-29"]);
    expect(Object.keys(parsed.items)).toEqual(["en:daily.water"]);
    expect(parsed.lessons).toEqual({ "food:ta": 2 });
  });

  it("round-trips a valid saved state", () => {
    let progress: CompanionProgress = {
      ...defaultProgress(),
      dailyGoal: 10 as const,
      contentLang: "ta" as const,
    };
    progress = recordStep(progress, today, {
      key: "ta:quick.help",
      outcome: "correct",
    });
    progress = completeLesson(progress, "basics", "ta");
    expect(parseProgress(JSON.parse(JSON.stringify(progress)))).toEqual(
      progress,
    );
  });

  it("keeps at most 120 days of activity", () => {
    const days: Record<string, DayActivity> = {};
    for (let i = 1; i <= 28; i++)
      for (const month of ["01", "02", "03", "04", "05"])
        days[`2026-${month}-${String(i).padStart(2, "0")}`] = {
          steps: 1,
          rest: false,
        };
    const parsed = parseProgress({ version: 1, dailyGoal: 3, days });
    expect(Object.keys(parsed.days)).toHaveLength(120);
    expect(Object.keys(parsed.days).at(-1)).toBe("2026-05-28");
  });
});
