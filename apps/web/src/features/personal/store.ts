import { useLiveQuery } from "dexie-react-hooks";
import { db, getKV } from "../../db";
import {
  approveItem,
  PERSONAL_KEY,
  reviseItem,
  validatePersonalItem,
  validatePersonalStore,
  type PersonalItem,
  type PersonalStore,
} from "./model";

export const emptyPersonal: PersonalStore = { version: 1, items: [] };
export async function readPersonal(): Promise<PersonalStore> {
  const saved = await getKV<unknown>(PERSONAL_KEY);
  return saved === undefined ? emptyPersonal : validatePersonalStore(saved);
}
export function usePersonal() {
  return useLiveQuery(readPersonal, [], emptyPersonal);
}

export async function savePersonal(
  item: PersonalItem,
  caregiverUnlocked: boolean,
) {
  if (!caregiverUnlocked) throw new Error("Unlock settings before editing.");
  await db.transaction("rw", db.kv, async () => {
    const current = await readPersonal();
    const previous = current.items.find((v) => v.id === item.id);
    if (previous && previous.revision !== item.revision)
      throw new Error("This card changed. Reopen it before editing.");
    const next = previous
      ? reviseItem({ ...item, revision: previous.revision })
      : reviseItem({ ...item, revision: 0 });
    const items = [
      ...current.items.filter((v) => v.id !== next.id),
      validatePersonalItem(next),
    ];
    await db.kv.put({
      key: PERSONAL_KEY,
      value: validatePersonalStore({ version: 1, items }),
    });
  });
}
export async function approvePersonal(id: string, revision: number) {
  await db.transaction("rw", db.kv, async () => {
    const current = await readPersonal();
    const item = current.items.find((v) => v.id === id);
    if (!item) throw new Error("This card is no longer available.");
    await db.kv.put({
      key: PERSONAL_KEY,
      value: {
        version: 1,
        items: current.items.map((v) =>
          v.id === id ? approveItem(item, revision) : v,
        ),
      },
    });
  });
}
export async function deletePersonal(id: string, caregiverUnlocked: boolean) {
  if (!caregiverUnlocked) throw new Error("Unlock settings before editing.");
  await db.transaction("rw", db.kv, async () => {
    const current = await readPersonal();
    await db.kv.put({
      key: PERSONAL_KEY,
      value: { version: 1, items: current.items.filter((v) => v.id !== id) },
    });
  });
}
/** Pinning changes placement only; it does not change the approved words. */
export async function pinPersonal(id: string) {
  await db.transaction("rw", db.kv, async () => {
    const current = await readPersonal();
    await db.kv.put({
      key: PERSONAL_KEY,
      value: {
        version: 1,
        items: current.items.map((v) =>
          v.id === id ? { ...v, pinned: !v.pinned } : v,
        ),
      },
    });
  });
}
export async function setPersonalHidden(
  id: string,
  hidden: boolean,
  caregiverUnlocked: boolean,
) {
  if (!caregiverUnlocked)
    throw new Error("Unlock settings before changing word visibility.");
  await db.transaction("rw", db.kv, async () => {
    const current = await readPersonal();
    await db.kv.put({
      key: PERSONAL_KEY,
      value: {
        version: 1,
        items: current.items.map((v) =>
          v.id === id && v.kind === "word" ? { ...v, hidden } : v,
        ),
      },
    });
  });
}

export async function preparePhoto(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP photo smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo tools are unavailable in this browser.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Could not prepare that photo.")),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
}
