import { isLocalProcessingOnly } from "./browserPolicy";

/** Only a permission token is stored here, never text, keys or patient data. */
export const cloudSentenceStorageKey = "sollu:cloud-sentences:v1";
const policyEvent = "sollu:sentence-privacy-changed";
const storageBridges = new WeakSet<Window>();
const failedHosts = new WeakSet<Window>();

function browserHost(): Window | undefined {
  return typeof window === "undefined" ||
    typeof window.addEventListener !== "function" ||
    typeof window.dispatchEvent !== "function"
    ? undefined
    : window;
}

function notify(host: Window): void {
  // State cancels pending generation and clears old choices synchronously.
  // This event never changes microphone, voice or model-download permissions.
  host.dispatchEvent(new Event(policyEvent));
}

function installStorageBridge(host: Window): void {
  if (storageBridges.has(host)) return;
  storageBridges.add(host);
  host.addEventListener("storage", (event: StorageEvent) => {
    if (event.key !== cloudSentenceStorageKey && event.key !== null) return;
    // Cancel even for a queued revocation followed by a newer allowance.
    // Request-time checks read the current stored value, not this event value.
    notify(host);
  });
}

/** A missing preference retains a previously enabled online policy. The
 * explicit-only check requires a separate sentence-text allowance even then.
 * Malformed, unreadable or unsuccessfully saved preferences always fail closed. */
export function cloudSentencePermission(explicitOnly = false): boolean {
  const host = browserHost();
  if (!host) return !explicitOnly && !isLocalProcessingOnly();
  installStorageBridge(host);
  if (failedHosts.has(host)) return false;
  try {
    const value = host.localStorage.getItem(cloudSentenceStorageKey);
    if (value === null) return !explicitOnly && !isLocalProcessingOnly();
    return value === "allowed";
  } catch {
    return false;
  }
}

/** Called only for an explicit caregiver permission change. Server policy and
 * the selected provider's text-sharing consent remain separate requirements. */
export function setCloudSentencePermission(value: boolean): void {
  const host = browserHost();
  if (!host) throw new Error("Sentence sharing permission could not be saved.");
  installStorageBridge(host);
  // Close the current-tab permission before attempting persistence so even a
  // failed revocation cannot leave the previous stored allowance effective.
  failedHosts.add(host);
  try {
    if (typeof value !== "boolean")
      throw new Error("Choose whether sentence text sharing is allowed.");
    host.localStorage.setItem(
      cloudSentenceStorageKey,
      value ? "allowed" : "blocked",
    );
    failedHosts.delete(host);
  } catch (error) {
    notify(host);
    throw error;
  }
  notify(host);
}

export function subscribeCloudSentencePermission(
  listener: () => void,
): () => void {
  const host = browserHost();
  if (!host) return () => {};
  installStorageBridge(host);
  host.addEventListener(policyEvent, listener);
  return () => host.removeEventListener(policyEvent, listener);
}
