import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowedDeviceVoice,
  getSpeechRecognitionMode,
  persistLocalProcessingPreference,
  requireModelDownloadPermission,
  setLocalProcessingOnly,
} from "./browserPolicy";
import {
  cloudSentencePermission,
  cloudSentenceStorageKey,
  setCloudSentencePermission,
  subscribeCloudSentencePermission,
} from "./sentencePolicy";

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

describe("independent sentence text sharing permission", () => {
  it("defaults to blocked under local protection and preserves legacy online permission", () => {
    expect(cloudSentencePermission()).toBe(false);
    setLocalProcessingOnly(false);
    expect(cloudSentencePermission()).toBe(true);
    expect(cloudSentencePermission(true)).toBe(false);
    setLocalProcessingOnly(true);
    browserStorage();
    expect(cloudSentencePermission()).toBe(false);
    persistLocalProcessingPreference(false);
    expect(cloudSentencePermission()).toBe(true);
    expect(cloudSentencePermission(true)).toBe(false);
  });

  it("permits sentence text independently while all local media protections stay on", () => {
    const { data } = browserStorage();
    setCloudSentencePermission(true);
    expect(data.get(cloudSentenceStorageKey)).toBe("allowed");
    expect(cloudSentencePermission()).toBe(true);
    expect(cloudSentencePermission(true)).toBe(true);
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(allowedDeviceVoice({ localService: false })).toBe(false);
    expect(() => requireModelDownloadPermission()).toThrow("blocks");
    expect([...data.keys()]).toEqual([cloudSentenceStorageKey]);
  });

  it("explicitly blocks cloud text even when the older media policy is online", () => {
    const { data } = browserStorage();
    persistLocalProcessingPreference(false);
    setCloudSentencePermission(false);
    expect(data.get(cloudSentenceStorageKey)).toBe("blocked");
    expect(cloudSentencePermission()).toBe(false);
    expect(cloudSentencePermission(true)).toBe(false);
  });

  it("notifies synchronously for every explicit change without stopping the microphone", () => {
    const { host } = browserStorage();
    const observed: boolean[] = [];
    const stopped = vi.fn();
    host.addEventListener("sollu:stop", stopped);
    const unsubscribe = subscribeCloudSentencePermission(() => {
      observed.push(cloudSentencePermission());
    });
    setCloudSentencePermission(true);
    setCloudSentencePermission(false);
    setCloudSentencePermission(false);
    expect(observed).toEqual([true, false, false]);
    expect(stopped).not.toHaveBeenCalled();
    unsubscribe();
    setCloudSentencePermission(true);
    expect(observed).toEqual([true, false, false]);
  });

  it("fails closed for malformed stored preferences even in legacy online mode", () => {
    const { data } = browserStorage();
    persistLocalProcessingPreference(false);
    for (const invalid of ["", "true", "online", "ALLOWED", "null"]) {
      data.set(cloudSentenceStorageKey, invalid);
      expect(cloudSentencePermission()).toBe(false);
    }
  });

  it("fails closed when permission storage cannot be read", () => {
    const { host } = browserStorage();
    setCloudSentencePermission(true);
    host.localStorage.getItem = () => {
      throw new Error("storage unavailable");
    };
    expect(cloudSentencePermission()).toBe(false);
    expect(cloudSentencePermission(true)).toBe(false);
  });

  it("revokes and notifies synchronously if a permission write fails", () => {
    const { host, data } = browserStorage();
    setCloudSentencePermission(true);
    const observed: boolean[] = [];
    subscribeCloudSentencePermission(() => {
      observed.push(cloudSentencePermission());
    });
    host.localStorage.setItem = () => {
      throw new Error("storage unavailable");
    };
    expect(() => setCloudSentencePermission(false)).toThrow(
      "storage unavailable",
    );
    expect(data.get(cloudSentenceStorageKey)).toBe("allowed");
    expect(cloudSentencePermission()).toBe(false);
    expect(observed).toEqual([false]);
    expect(() => setCloudSentencePermission(true)).toThrow(
      "storage unavailable",
    );
    expect(cloudSentencePermission()).toBe(false);
    expect(observed).toEqual([false, false]);
  });

  it("keeps a failed write revoked until a successful explicit choice", () => {
    const { host } = browserStorage();
    setCloudSentencePermission(true);
    expect(() =>
      setCloudSentencePermission("allowed" as unknown as boolean),
    ).toThrow("Choose whether");
    expect(cloudSentencePermission()).toBe(false);
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: cloudSentenceStorageKey,
        newValue: "allowed",
      }),
    );
    expect(cloudSentencePermission()).toBe(false);
    setCloudSentencePermission(true);
    expect(cloudSentencePermission()).toBe(true);
  });

  it("notifies across tabs once and checks current storage before events arrive", () => {
    const { host, data } = browserStorage();
    setCloudSentencePermission(true);
    const listener = vi.fn();
    const unsubscribe = subscribeCloudSentencePermission(listener);
    cloudSentencePermission();
    cloudSentencePermission();
    data.set(cloudSentenceStorageKey, "blocked");
    expect(cloudSentencePermission()).toBe(false);
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: cloudSentenceStorageKey,
        newValue: "blocked",
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "unrelated",
        newValue: "anything",
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
    // An older queued revocation must still invalidate drafts.
    data.set(cloudSentenceStorageKey, "allowed");
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: cloudSentenceStorageKey,
        newValue: "blocked",
      }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
    expect(cloudSentencePermission()).toBe(true);
    data.clear();
    host.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    expect(listener).toHaveBeenCalledTimes(3);
    expect(cloudSentencePermission()).toBe(false);
    unsubscribe();
  });
});
