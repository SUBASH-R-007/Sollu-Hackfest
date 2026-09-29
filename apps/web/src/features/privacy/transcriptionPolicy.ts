import { isLocalProcessingOnly } from "./browserPolicy";

/** Only a permission token is stored here, never audio, text or keys. */
export const cloudTranscriptionStorageKey = "sollu:cloud-transcription:v1";
const policyEvent = "sollu:transcription-privacy-changed";

function host(): Window | undefined {
  return typeof window === "undefined" ? undefined : window;
}

/**
 * Sending recorded audio to a cloud transcription service needs its own
 * explicit caregiver permission, separate from sentence text sharing and
 * online browser recognition. It is never inferred from any older setting,
 * it is ineffective while local-only protection is on, and anything missing,
 * malformed or unreadable fails closed.
 */
export function cloudTranscriptionPermission(): boolean {
  const win = host();
  if (!win || isLocalProcessingOnly()) return false;
  try {
    return win.localStorage.getItem(cloudTranscriptionStorageKey) === "allowed";
  } catch {
    return false;
  }
}

export function setCloudTranscriptionPermission(value: boolean): void {
  const win = host();
  if (!win) throw new Error("Audio sharing permission could not be saved.");
  if (value && isLocalProcessingOnly())
    throw new Error(
      "Local-only privacy protection blocks sending audio to a cloud service.",
    );
  try {
    if (value)
      win.localStorage.setItem(cloudTranscriptionStorageKey, "allowed");
    else win.localStorage.removeItem(cloudTranscriptionStorageKey);
  } finally {
    win.dispatchEvent(new Event(policyEvent));
  }
}

export function subscribeCloudTranscriptionPermission(
  listener: () => void,
): () => void {
  const win = host();
  if (!win) return () => {};
  const storage = (event: StorageEvent) => {
    if (event.key === cloudTranscriptionStorageKey || event.key === null)
      listener();
  };
  win.addEventListener(policyEvent, listener);
  win.addEventListener("storage", storage);
  return () => {
    win.removeEventListener(policyEvent, listener);
    win.removeEventListener("storage", storage);
  };
}
