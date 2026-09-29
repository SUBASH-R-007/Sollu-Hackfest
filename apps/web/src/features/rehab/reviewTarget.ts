import type { ClinicianReviewTarget } from "./ClinicianOverview";

/** Reads a review target saved in this history entry's state, if valid. */
export function reviewTargetFromState(
  state: unknown,
): ClinicianReviewTarget | undefined {
  if (!state || typeof state !== "object") return undefined;
  const target = (state as { reviewTarget?: unknown }).reviewTarget;
  if (!target || typeof target !== "object") return undefined;
  const value = target as Record<string, unknown>;
  if (value.section === "plan" || value.section === "transfer")
    return { section: value.section };
  if (
    value.section === "record" &&
    typeof value.practiceId === "string" &&
    typeof value.at === "number" &&
    Number.isFinite(value.at)
  )
    return { section: "record", practiceId: value.practiceId, at: value.at };
  return undefined;
}
