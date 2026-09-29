import { getKV, setKV } from "../../db";
import {
  PROGRESS_KEY,
  defaultProgress,
  parseProgress,
  type CompanionProgress,
} from "./progress";

/** Companion progress stays in the on-device `sollu` key-value store. */
export async function loadProgress(): Promise<CompanionProgress> {
  try {
    return parseProgress(await getKV<unknown>(PROGRESS_KEY));
  } catch {
    return defaultProgress();
  }
}

let queue: Promise<unknown> = Promise.resolve();
/** Read–modify–write in order, so quick taps never overwrite each other. */
export function updateProgress(
  change: (progress: CompanionProgress) => CompanionProgress,
): Promise<CompanionProgress> {
  const next = queue.then(async () => {
    const updated = parseProgress(change(await loadProgress()));
    await setKV(PROGRESS_KEY, updated);
    return updated;
  });
  queue = next.catch(() => undefined);
  return next;
}
