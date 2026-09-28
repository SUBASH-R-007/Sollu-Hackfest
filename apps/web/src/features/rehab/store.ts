import Dexie, { type EntityTable } from "dexie";
import {
  createDefaultPlan,
  createDefaultProfile,
  EXERCISES,
  LOCAL_PATIENT_ID,
  MAX_TOTAL_MEDIA_BYTES,
  practiceRecordSchema,
  rehabPlanSchema,
  rehabProfileSchema,
  reviewRecordSchema,
  validateMedia,
  type MediaRecord,
  type PracticeRecord,
  type RehabPlan,
  type RehabProfile,
  type ReviewRecord,
} from "./model";

/** A separate local store: none of these recordings or health records are sent to a model. */
export const rehabDb = new Dexie("sollu-rehab") as Dexie & {
  profiles: EntityTable<RehabProfile, "id">;
  plans: EntityTable<RehabPlan, "id">;
  practice: EntityTable<PracticeRecord, "id">;
  media: EntityTable<MediaRecord, "id">;
  reviews: EntityTable<ReviewRecord, "id">;
};
rehabDb.version(1).stores({
  profiles: "id",
  plans: "id,patientId",
  practice: "id,patientId,createdAt,[patientId+createdAt]",
  media: "id,patientId,practiceId",
  reviews: "id,patientId,practiceId,reviewedAt",
});

function assertLocal(patientId: string) {
  if (patientId !== LOCAL_PATIENT_ID)
    throw new Error(
      "This device stores one active practice profile. Imported reports stay read-only.",
    );
}
export async function getRehabProfile(): Promise<RehabProfile> {
  const stored = await rehabDb.profiles.get(LOCAL_PATIENT_ID);
  return stored ? rehabProfileSchema.parse(stored) : createDefaultProfile();
}
export async function saveRehabProfile(profile: RehabProfile): Promise<void> {
  await rehabDb.profiles.put(rehabProfileSchema.parse(profile));
}
export async function getRehabPlan(): Promise<RehabPlan> {
  const stored = await rehabDb.plans
    .where("patientId")
    .equals(LOCAL_PATIENT_ID)
    .first();
  return stored ? rehabPlanSchema.parse(stored) : createDefaultPlan();
}
export async function saveRehabPlan(plan: RehabPlan): Promise<void> {
  const validated = rehabPlanSchema.parse(plan);
  assertLocal(validated.patientId);
  if (
    validated.id !== "local-plan" ||
    validated.exerciseIds.some(
      (id) => !EXERCISES.some((exercise) => exercise.id === id),
    )
  )
    throw new Error("Choose exercises from the practice library.");
  await rehabDb.plans.put(validated);
}
export async function listPractice(
  patientId = LOCAL_PATIENT_ID,
): Promise<PracticeRecord[]> {
  assertLocal(patientId);
  const rows = await rehabDb.practice
    .where("patientId")
    .equals(patientId)
    .sortBy("createdAt");
  return rows.map((record) => practiceRecordSchema.parse(record)).reverse();
}
export async function listReviews(
  patientId = LOCAL_PATIENT_ID,
): Promise<ReviewRecord[]> {
  assertLocal(patientId);
  const rows = await rehabDb.reviews
    .where("patientId")
    .equals(patientId)
    .sortBy("reviewedAt");
  return rows.map((review) => reviewRecordSchema.parse(review)).reverse();
}

/** Optional evidence is committed with the practice record so quota failures leave neither half saved. */
export async function savePractice(
  record: PracticeRecord,
  evidence: MediaRecord[] = [],
): Promise<void> {
  const validated = practiceRecordSchema.parse(record);
  assertLocal(validated.patientId);
  const media = evidence.map(validateMedia);
  if (
    media.some(
      (item) =>
        item.patientId !== validated.patientId ||
        item.practiceId !== validated.id ||
        !validated.mediaIds.includes(item.id),
    )
  )
    throw new Error("Evidence must belong to this practice attempt.");
  await rehabDb.transaction("rw", rehabDb.practice, rehabDb.media, async () => {
    const existing = await rehabDb.practice.get(validated.id);
    if (!existing && (await rehabDb.practice.count()) >= 10000)
      throw new Error(
        "The local practice store is full. Export and remove older attempts before adding more.",
      );
    await putMediaWithinQuota(media);
    for (const id of validated.mediaIds) {
      const item = await rehabDb.media.get(id);
      if (
        !item ||
        item.patientId !== validated.patientId ||
        item.practiceId !== validated.id
      )
        throw new Error(
          "A recording is missing. Save the attempt without it or record again.",
        );
    }
    // Removed evidence references also remove their stored recordings.
    if (existing)
      await rehabDb.media.bulkDelete(
        existing.mediaIds.filter((id) => !validated.mediaIds.includes(id)),
      );
    await rehabDb.practice.put(validated);
  });
}

async function putMediaWithinQuota(items: MediaRecord[]) {
  if (!items.length) return;
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("Evidence identifiers must be distinct.");
  let total = 0;
  await rehabDb.media.each((item) => {
    if (!items.some((next) => next.id === item.id)) total += item.blob.size;
  });
  total += items.reduce((sum, item) => sum + item.blob.size, 0);
  if (total > MAX_TOTAL_MEDIA_BYTES)
    throw new Error(
      "Recordings use the 250 MB local allowance. Export and remove older evidence before recording more.",
    );
  for (const item of items) {
    const previous = await rehabDb.media.get(item.id);
    if (
      previous &&
      (previous.patientId !== item.patientId ||
        previous.practiceId !== item.practiceId)
    )
      throw new Error(
        "This evidence identifier already belongs to another attempt.",
      );
  }
  await rehabDb.media.bulkPut(items);
}
export async function saveMedia(item: MediaRecord): Promise<void> {
  const validated = validateMedia(item);
  assertLocal(validated.patientId);
  await rehabDb.transaction("rw", rehabDb.media, async () =>
    putMediaWithinQuota([validated]),
  );
}
export async function getMedia(id: string): Promise<MediaRecord | undefined> {
  const record = await rehabDb.media.get(id);
  if (!record) return undefined;
  assertLocal(record.patientId);
  return validateMedia(record);
}
export async function deleteMedia(id: string): Promise<void> {
  await rehabDb.transaction("rw", rehabDb.media, rehabDb.practice, async () => {
    const media = await rehabDb.media.get(id);
    if (!media) return;
    assertLocal(media.patientId);
    const practice = await rehabDb.practice.get(media.practiceId);
    if (practice)
      await rehabDb.practice.update(practice.id, {
        mediaIds: practice.mediaIds.filter((mediaId) => mediaId !== id),
      });
    await rehabDb.media.delete(id);
  });
}
export async function deletePractice(id: string): Promise<void> {
  await rehabDb.transaction(
    "rw",
    rehabDb.practice,
    rehabDb.media,
    rehabDb.reviews,
    async () => {
      const record = await rehabDb.practice.get(id);
      if (!record) return;
      assertLocal(record.patientId);
      await rehabDb.media.where("practiceId").equals(id).delete();
      await rehabDb.reviews.where("practiceId").equals(id).delete();
      await rehabDb.practice.delete(id);
    },
  );
}
export async function saveReview(review: ReviewRecord): Promise<void> {
  const validated = reviewRecordSchema.parse(review);
  assertLocal(validated.patientId);
  await rehabDb.transaction(
    "rw",
    rehabDb.practice,
    rehabDb.reviews,
    async () => {
      const practice = await rehabDb.practice.get(validated.practiceId);
      if (!practice || practice.patientId !== validated.patientId)
        throw new Error(
          "The practice attempt is no longer available for review.",
        );
      const previous = await rehabDb.reviews.get(validated.id);
      if (previous && previous.practiceId !== validated.practiceId)
        throw new Error("This review identifier belongs to another attempt.");
      if (!previous && (await rehabDb.reviews.count()) >= 20000)
        throw new Error("The local review store is full.");
      await rehabDb.reviews.put(validated);
    },
  );
}
export async function clearRehabData(): Promise<void> {
  await rehabDb.transaction(
    "rw",
    [
      rehabDb.profiles,
      rehabDb.plans,
      rehabDb.practice,
      rehabDb.media,
      rehabDb.reviews,
    ],
    async () => {
      await rehabDb.profiles.clear();
      await rehabDb.plans.clear();
      await rehabDb.practice.clear();
      await rehabDb.media.clear();
      await rehabDb.reviews.clear();
    },
  );
}
