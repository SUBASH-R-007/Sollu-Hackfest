import { WordSubstitutionSchema, type WordSubstitution } from "@sollu/shared";
import { LOCAL_PATIENT_ID, type PracticeRecord } from "./model";

export interface CorrectionDraft {
  heard: string;
  means: string;
  addresseeId: string;
  personConfirmed: boolean;
  caregiverUnlocked: boolean;
}
const key = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/gu, " ");
const places = ["home", "hospital", "clinic", "outside", "other"] as const;

export function correctionPrefill(value: string): string {
  return value.trim().length <= 120 ? value.trim() : "";
}

/** Prepare an explicitly approved local text mapping; this never counts recognition errors as observed use. */
export function preparePracticeCorrection(
  record: PracticeRecord,
  draft: CorrectionDraft,
  existing: WordSubstitution[],
  identity: { id: string; now: number },
):
  | { status: "duplicate"; mapping: WordSubstitution }
  | { status: "ready"; mapping: WordSubstitution } {
  if (!draft.caregiverUnlocked)
    throw new Error("Unlock caregiver settings before saving a correction.");
  if (record.patientId !== LOCAL_PATIENT_ID)
    throw new Error(
      "Imported reports cannot change this person's communication model.",
    );
  if (!record.transcriptReviewed || !draft.personConfirmed)
    throw new Error(
      "Review the transcript and confirm the intended meaning with the person first.",
    );
  const heard = draft.heard.trim(),
    means = draft.means.trim();
  if (
    !heard ||
    !means ||
    heard.length > 120 ||
    means.length > 120 ||
    key(heard) === key(means)
  )
    throw new Error(
      "Enter two different short phrases, up to 120 characters each.",
    );
  if (
    [heard, means].some((value) =>
      [...value].some((char) => char.charCodeAt(0) < 32),
    )
  )
    throw new Error("Use a single line of words without control characters.");
  if (!draft.addresseeId.trim() || draft.addresseeId.length > 120)
    throw new Error(
      "Choose an existing listener in settings before saving this mapping.",
    );
  if (!Number.isFinite(identity.now) || identity.now < 0)
    throw new Error("Choose a valid confirmation time.");
  const place = places.find((value) => value === record.place);
  const mapping = WordSubstitutionSchema.parse({
    id: identity.id,
    heard,
    means,
    count: 1,
    lastAt: identity.now,
    confirmed: true,
    lang: record.language,
    ...(place ? { place } : {}),
    addresseeId: draft.addresseeId,
  });
  // Legacy mappings without a scope match all contexts, so they may also conflict.
  const active = existing.filter(
    (item) => item.confirmed === true && key(item.heard) === key(heard),
  );
  const overlapping = active.filter(
    (item) =>
      (!item.lang || item.lang === mapping.lang) &&
      (!item.place || !mapping.place || item.place === mapping.place) &&
      (!item.addresseeId || item.addresseeId === mapping.addresseeId),
  );
  if (overlapping.some((item) => key(item.means) !== key(means)))
    throw new Error(
      "A different approved meaning already exists for these words in this context. Review or forget it in Settings → Privacy → Memory & word corrections first.",
    );
  const duplicate = active.find(
    (item) =>
      key(item.means) === key(means) &&
      item.lang === mapping.lang &&
      item.place === mapping.place &&
      item.addresseeId === mapping.addresseeId,
  );
  return duplicate
    ? { status: "duplicate", mapping: duplicate }
    : { status: "ready", mapping };
}
