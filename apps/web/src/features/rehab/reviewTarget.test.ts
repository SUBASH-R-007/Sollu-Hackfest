import { describe, expect, it } from "vitest";
import { reviewTargetFromState } from "./reviewTarget";

describe("clinician review target history state", () => {
  it("restores only well-formed targets saved on the history entry", () => {
    expect(
      reviewTargetFromState({
        reviewTarget: { section: "record", practiceId: "p1", at: 5, extra: 1 },
      }),
    ).toEqual({ section: "record", practiceId: "p1", at: 5 });
    expect(
      reviewTargetFromState({ reviewTarget: { section: "plan" } }),
    ).toEqual({ section: "plan" });
  });

  it("treats entries without a target, or with malformed state, as no target", () => {
    expect(reviewTargetFromState(null)).toBeUndefined();
    expect(reviewTargetFromState({ usr: 1 })).toBeUndefined();
    expect(
      reviewTargetFromState({ reviewTarget: { section: "record", at: 1 } }),
    ).toBeUndefined();
    expect(
      reviewTargetFromState({
        reviewTarget: { section: "record", practiceId: "p", at: Infinity },
      }),
    ).toBeUndefined();
    expect(
      reviewTargetFromState({ reviewTarget: { section: "other" } }),
    ).toBeUndefined();
  });
});
