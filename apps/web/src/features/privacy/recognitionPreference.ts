export type RecognitionMode = "local" | "browser";

/** This stores only the chosen recognition service, never audio or health data. */
export const recognitionPreferenceStorageKey = "sollu:speech-recognition:v1";
const preferenceEvent = "sollu:speech-recognition-changed";
const storageBridges = new WeakSet<Window>();
const failedHosts = new WeakSet<Window>();

function browserHost(): Window | undefined {
  return typeof window === "undefined" ||
    typeof window.addEventListener !== "function" ||
    typeof window.dispatchEvent !== "function"
    ? undefined
    : window;
}

function stopRecognition(host: Window): void {
  host.dispatchEvent(new Event("sollu:stop"));
}

/** Install once per window so active recognition stops on a change even when
 * the settings screen is closed. Read/start guards do not rely on event timing. */
function installStorageBridge(host: Window): void {
  if (storageBridges.has(host)) return;
  storageBridges.add(host);
  host.addEventListener("storage", (event: StorageEvent) => {
    if (event.key !== recognitionPreferenceStorageKey && event.key !== null)
      return;
    // Also stop for an earlier queued revocation followed by a newer allowance.
    stopRecognition(host);
    host.dispatchEvent(new Event(preferenceEvent));
  });
}

/** Missing, malformed or unreadable permission always means local recognition. */
export function readRecognitionPreference(): RecognitionMode {
  const host = browserHost();
  if (!host) return "local";
  installStorageBridge(host);
  if (failedHosts.has(host)) return "local";
  try {
    return host.localStorage.getItem(recognitionPreferenceStorageKey) ===
      "browser"
      ? "browser"
      : "local";
  } catch {
    return "local";
  }
}

/** The UI must separately respect the local-only privacy master. The effective
 * recognition guard enforces that master even if a stored preference is online. */
export function setRecognitionPreference(mode: RecognitionMode): void {
  const host = browserHost();
  if (!host)
    throw new Error("Speech recognition preferences could not be saved.");
  installStorageBridge(host);
  try {
    if (mode !== "local" && mode !== "browser")
      throw new Error("Choose a supported speech recognition mode.");
    host.localStorage.setItem(
      recognitionPreferenceStorageKey,
      mode === "browser" ? "browser" : `local:${crypto.randomUUID()}`,
    );
    failedHosts.delete(host);
  } catch (error) {
    // A failed local revocation must still stop online recognition in this tab.
    failedHosts.add(host);
    stopRecognition(host);
    host.dispatchEvent(new Event(preferenceEvent));
    throw error;
  }
  // Every explicit selection stops the current recorder; no mode auto-restarts it.
  stopRecognition(host);
  host.dispatchEvent(new Event(preferenceEvent));
}

export function subscribeRecognitionPreference(
  listener: () => void,
): () => void {
  const host = browserHost();
  if (!host) return () => {};
  installStorageBridge(host);
  host.addEventListener(preferenceEvent, listener);
  return () => host.removeEventListener(preferenceEvent, listener);
}
