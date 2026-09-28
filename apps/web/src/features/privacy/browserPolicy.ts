import {
  readRecognitionPreference,
  type RecognitionMode,
} from "./recognitionPreference";

/** Fail closed before persisted settings load. No health content is stored here. */
let localOnly = true;
export const localProcessingStorageKey = "sollu:local-processing-only:v1";
const policyEvent = "sollu:browser-privacy-policy";

/** A synchronous, non-sensitive latch closes the gap before another tab receives
 * its storage event. Missing/unreadable browser storage never grants permission. */
export function readLocalProcessingPreference(): boolean {
  if (typeof window === "undefined" || !("localStorage" in window))
    return localOnly;
  try {
    return window.localStorage.getItem(localProcessingStorageKey) !== "online";
  } catch {
    return true;
  }
}

/** Call only for an explicit caregiver change. Persist before relaxing runtime
 * restrictions; callers keep protection enabled if storage throws. */
export function persistLocalProcessingPreference(value: boolean): void {
  if (typeof window !== "undefined" && "localStorage" in window)
    window.localStorage.setItem(
      localProcessingStorageKey,
      value ? `local:${crypto.randomUUID()}` : "online",
    );
  setLocalProcessingOnly(value);
}

export function localProcessingPreferenceVersion(): string | null {
  if (typeof window === "undefined" || !("localStorage" in window))
    return String(localOnly);
  try {
    return window.localStorage.getItem(localProcessingStorageKey);
  } catch {
    return "unavailable";
  }
}

export function setLocalProcessingOnly(value: boolean): void {
  const changed = localOnly !== value;
  localOnly = value;
  if (
    changed &&
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  )
    window.dispatchEvent(new Event(policyEvent));
}

export function isLocalProcessingOnly(): boolean {
  return localOnly || readLocalProcessingPreference();
}

export function subscribeLocalProcessingPolicy(
  listener: (protectedMode: boolean, source: "storage" | "local") => void,
): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === localProcessingStorageKey || event.key === null)
      listener(
        event.newValue !== "online" || readLocalProcessingPreference(),
        "storage",
      );
  };
  const local = () => listener(isLocalProcessingOnly(), "local");
  window.addEventListener("storage", storage);
  window.addEventListener(policyEvent, local);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(policyEvent, local);
  };
}

export function allowedDeviceVoice(voice: { localService: boolean }): boolean {
  return !isLocalProcessingOnly() || voice.localService === true;
}

/** Recognition has its own permission. Relaxing another privacy setting never
 * opts a person into sending microphone audio to a browser service. */
export function getSpeechRecognitionMode(): RecognitionMode {
  const preference = readRecognitionPreference();
  return isLocalProcessingOnly() ? "local" : preference;
}

/** Merely constructing a recognizer does not open the microphone. Never call
 * start on a legacy/cloud recognizer in local mode or download language packs. */
export function prepareBrowserRecognition<T extends object>(
  Constructor: new () => T,
): T {
  const recognition = new Constructor();
  const mode = getSpeechRecognitionMode();
  if (mode === "browser") {
    if ("processLocally" in recognition) {
      const online = recognition as T & { processLocally: boolean };
      online.processLocally = false;
      if (online.processLocally !== false)
        throw new Error(
          "This browser could not enable online speech recognition.",
        );
    }
    return recognition;
  }
  if (!("processLocally" in recognition))
    throw new Error(
      "Local recognition is selected. This browser has no supported on-device recognizer. Type, use Topics, or record locally and enter the words you heard.",
    );
  const local = recognition as T & { processLocally: boolean };
  local.processLocally = true;
  if (local.processLocally !== true)
    throw new Error("This browser could not enable local speech recognition.");
  return recognition;
}

export function requireModelDownloadPermission(): void {
  if (isLocalProcessingOnly())
    throw new Error(
      "Local-only protection blocks the external object-model download. Your photo stays here. Use Topics or choose a familiar photo message in My tools.",
    );
}
