import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowedDeviceVoice,
  isLocalProcessingOnly,
  prepareBrowserRecognition,
  requireModelDownloadPermission,
  setLocalProcessingOnly,
  persistLocalProcessingPreference,
  readLocalProcessingPreference,
  localProcessingStorageKey,
  localProcessingPreferenceVersion,
  subscribeLocalProcessingPolicy,
  getSpeechRecognitionMode,
} from "./browserPolicy";
import {
  recognitionPreferenceStorageKey,
  setRecognitionPreference,
} from "./recognitionPreference";

afterEach(() => {
  vi.unstubAllGlobals();
  setLocalProcessingOnly(true);
});

function browserStorage() {
  const data = new Map<string, string>();
  const host = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    },
  });
  vi.stubGlobal("window", host);
  return { host, data };
}

describe("local browser processing boundary", () => {
  it("defaults to local voices and blocks external model downloads", () => {
    expect(isLocalProcessingOnly()).toBe(true);
    expect(allowedDeviceVoice({ localService: true })).toBe(true);
    expect(allowedDeviceVoice({ localService: false })).toBe(false);
    expect(() => requireModelDownloadPermission()).toThrow("blocks");
  });
  it("never starts a legacy recognizer in local mode", () => {
    const start = vi.fn();
    class Legacy {
      start = start;
    }
    expect(() => prepareBrowserRecognition(Legacy)).toThrow("on-device");
    expect(start).not.toHaveBeenCalled();
  });
  it("sets local processing before the caller can start a supported recognizer", () => {
    class Local {
      processLocally = false;
      start = vi.fn();
    }
    const recognizer = prepareBrowserRecognition(Local);
    expect(recognizer.processLocally).toBe(true);
    expect(recognizer.start).not.toHaveBeenCalled();
  });
  it("rejects a recognizer that fails to honor the local setting", () => {
    class Broken {
      get processLocally() {
        return false;
      }
      set processLocally(_value: boolean) {
        /* Unsupported browser shim. */
      }
    }
    expect(() => prepareBrowserRecognition(Broken)).toThrow("could not enable");
  });
  it("requires an explicit recognition selection in addition to an online policy", () => {
    browserStorage();
    persistLocalProcessingPreference(false);
    class Legacy {
      start = vi.fn();
    }
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(() => prepareBrowserRecognition(Legacy)).toThrow("on-device");
    setRecognitionPreference("browser");
    expect(prepareBrowserRecognition(Legacy)).toBeInstanceOf(Legacy);
    expect(allowedDeviceVoice({ localService: false })).toBe(true);
    expect(() => requireModelDownloadPermission()).not.toThrow();
    setLocalProcessingOnly(true);
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(() => prepareBrowserRecognition(Legacy)).toThrow();
  });
  it("sets the chosen local mode even when online browser services are allowed", () => {
    browserStorage();
    persistLocalProcessingPreference(false);
    setRecognitionPreference("local");
    class Recognizer {
      processLocally = false;
    }
    expect(prepareBrowserRecognition(Recognizer).processLocally).toBe(true);
    expect(allowedDeviceVoice({ localService: false })).toBe(true);
    expect(() => requireModelDownloadPermission()).not.toThrow();
  });
  it("explicitly selects online processing only with both permissions", () => {
    browserStorage();
    persistLocalProcessingPreference(false);
    setRecognitionPreference("browser");
    class Recognizer {
      processLocally = true;
      start = vi.fn();
    }
    const recognition = prepareBrowserRecognition(Recognizer);
    expect(recognition.processLocally).toBe(false);
    expect(recognition.start).not.toHaveBeenCalled();
  });
  it("fails rather than claim online recognition when that mode is rejected", () => {
    browserStorage();
    persistLocalProcessingPreference(false);
    setRecognitionPreference("browser");
    class Broken {
      get processLocally() {
        return true;
      }
      set processLocally(_value: boolean) {
        /* Browser rejected the requested mode. */
      }
    }
    expect(() => prepareBrowserRecognition(Broken)).toThrow(
      "could not enable online",
    );
  });
  it("a stored online selection cannot bypass the local-only privacy master", () => {
    browserStorage();
    setRecognitionPreference("browser");
    class Recognizer {
      processLocally = false;
    }
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(prepareBrowserRecognition(Recognizer).processLocally).toBe(true);
    expect(allowedDeviceVoice({ localService: false })).toBe(false);
    expect(() => requireModelDownloadPermission()).toThrow("blocks");
  });
  it("reads recognition revocation synchronously before a storage event arrives", () => {
    const { data } = browserStorage();
    persistLocalProcessingPreference(false);
    setRecognitionPreference("browser");
    expect(getSpeechRecognitionMode()).toBe("browser");
    data.set(recognitionPreferenceStorageKey, "local:another-tab");
    class Legacy {
      start = vi.fn();
    }
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(() => prepareBrowserRecognition(Legacy)).toThrow("on-device");
  });
  it("requires persisted browser permission as well as an in-memory allowance", () => {
    const { data } = browserStorage();
    setLocalProcessingOnly(false);
    expect(isLocalProcessingOnly()).toBe(true);
    persistLocalProcessingPreference(false);
    expect(isLocalProcessingOnly()).toBe(false);
    // A second tab's protection write is effective before its storage event runs.
    data.set(localProcessingStorageKey, "local:other-tab");
    expect(allowedDeviceVoice({ localService: false })).toBe(false);
    expect(() => requireModelDownloadPermission()).toThrow("blocks");
    class Legacy {
      start = vi.fn();
    }
    expect(() => prepareBrowserRecognition(Legacy)).toThrow("on-device");
  });
  it("fails closed when browser storage is unreadable or permission cannot be persisted", () => {
    const { host } = browserStorage();
    host.localStorage.getItem = () => {
      throw new Error("unavailable");
    };
    host.localStorage.setItem = () => {
      throw new Error("unavailable");
    };
    setLocalProcessingOnly(false);
    expect(readLocalProcessingPreference()).toBe(true);
    expect(isLocalProcessingOnly()).toBe(true);
    expect(() => persistLocalProcessingPreference(false)).toThrow(
      "unavailable",
    );
    expect(isLocalProcessingOnly()).toBe(true);
  });
  it("observes protection, permission and storage clearing across tabs, then unsubscribes", () => {
    const { host, data } = browserStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeLocalProcessingPolicy(listener);
    data.set(localProcessingStorageKey, "online");
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: localProcessingStorageKey,
        newValue: "online",
      }),
    );
    expect(listener).toHaveBeenLastCalledWith(false, "storage");
    data.clear();
    host.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    expect(listener).toHaveBeenLastCalledWith(true, "storage");
    unsubscribe();
    listener.mockClear();
    host.dispatchEvent(
      Object.assign(new Event("storage"), { key: localProcessingStorageKey }),
    );
    expect(listener).not.toHaveBeenCalled();
  });
  it("assigns a fresh revocation version so delayed relaxations can detect a newer decision", () => {
    browserStorage();
    persistLocalProcessingPreference(true);
    const first = localProcessingPreferenceVersion();
    persistLocalProcessingPreference(true);
    expect(localProcessingPreferenceVersion()).not.toBe(first);
    expect(readLocalProcessingPreference()).toBe(true);
  });
  it("does not miss an earlier revocation when queued storage events follow a quick re-enable", () => {
    const { host, data } = browserStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeLocalProcessingPolicy(listener);
    data.set(localProcessingStorageKey, "online");
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: localProcessingStorageKey,
        newValue: "local:earlier-revocation",
      }),
    );
    expect(listener).toHaveBeenLastCalledWith(true, "storage");
    unsubscribe();
  });
});
