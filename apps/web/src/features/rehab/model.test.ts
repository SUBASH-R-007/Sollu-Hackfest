import { describe, expect, it } from "vitest";
import {
  createDefaultPlan,
  EXERCISES,
  exerciseInLanguage,
  friendlyError,
  measuredSeconds,
  planTextProblem,
  rehabPlanSchema,
} from "./model";

describe("practice measurement bounds", () => {
  it("keeps measurable elapsed time and treats overnight or invalid times as missing", () => {
    expect(measuredSeconds(4500)).toBe(4.5);
    expect(measuredSeconds(0)).toBe(0);
    expect(measuredSeconds(86_400_000)).toBe(86400);
    expect(measuredSeconds(86_400_001)).toBeNull();
    expect(measuredSeconds(-1)).toBeNull();
    expect(measuredSeconds(Number.NaN)).toBeNull();
  });
});

describe("plan editor messages", () => {
  it("shows the first validation issue instead of raw JSON", () => {
    const result = rehabPlanSchema.safeParse({
      ...createDefaultPlan(0),
      customTargets: ["Water", "water"],
    });
    expect(result.success).toBe(false);
    const message = friendlyError(result.error, "fallback");
    expect(message).toBe("Keep custom practice targets distinct.");
    expect(message).not.toContain("[");
    expect(friendlyError(new Error("Plain"), "fallback")).toBe("Plain");
    expect(friendlyError("oops", "fallback")).toBe("fallback");
  });

  it("enforces the 20-line personal target and goal limits with friendly copy", () => {
    const many = Array.from({ length: 21 }, (_, i) => `Target ${i}`);
    expect(planTextProblem([], many)).toMatch(
      /20 lines or fewer \(21 entered\)/,
    );
    expect(planTextProblem(many, [])).toMatch(/participation goals/);
    expect(planTextProblem([], ["x".repeat(301)])).toMatch(/300 characters/);
    expect(planTextProblem(["Talk"], many.slice(0, 20))).toBeNull();
  });
});

describe("practice library languages", () => {
  it("gives every English exercise a Tamil counterpart and back", () => {
    for (const exercise of EXERCISES.filter((item) => item.language === "en")) {
      const tamil = exerciseInLanguage(exercise.id, "ta");
      expect(tamil, exercise.id).toBeDefined();
      expect(tamil!.language).toBe("ta");
      expect(tamil!.kind).toBe(exercise.kind);
      expect(/\p{Script=Tamil}/u.test(tamil!.target)).toBe(true);
      expect(exerciseInLanguage(tamil!.id, "en")?.id).toBe(exercise.id);
    }
  });
  it("resolves the default plan for a Tamil profile instead of leaving it empty", () => {
    const ids = createDefaultPlan().exerciseIds;
    const tamil = ids.map((id) => exerciseInLanguage(id, "ta")?.id);
    expect(tamil).toEqual([
      "sentence-time-ta",
      "sentence-break-ta",
      "aac-choice-ta",
    ]);
    expect(exerciseInLanguage("missing", "en")).toBeUndefined();
  });
});
