import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readRecognitionPreference,
  recognitionPreferenceStorageKey,
  setRecognitionPreference,
  subscribeRecognitionPreference,
  type RecognitionMode,
} from "./recognitionPreference";

afterEach(() => vi.unstubAllGlobals());

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

describe("separate speech recognition preference", () => {
  it("defaults to local without a browser or explicit stored online selection", () => {
    expect(readRecognitionPreference()).toBe("local");
    const { data } = browserStorage();
    expect(readRecognitionPreference()).toBe("local");
    for (const invalid of ["", "online", "google", "true", "BROWSER", "null"]) {
      data.set(recognitionPreferenceStorageKey, invalid);
      expect(readRecognitionPreference()).toBe("local");
    }
  });

  it("persists only a mode token and notifies after explicit selection", () => {
    const { host, data } = browserStorage();
    const listener = vi.fn();
    const stopped = vi.fn();
    host.addEventListener("sollu:stop", stopped);
    const unsubscribe = subscribeRecognitionPreference(listener);
    setRecognitionPreference("browser");
    expect(data.get(recognitionPreferenceStorageKey)).toBe("browser");
    expect(readRecognitionPreference()).toBe("browser");
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    setRecognitionPreference("local");
    const first = data.get(recognitionPreferenceStorageKey);
    expect(first).toMatch(/^local:/u);
    expect(readRecognitionPreference()).toBe("local");
    setRecognitionPreference("local");
    expect(data.get(recognitionPreferenceStorageKey)).not.toBe(first);
    expect(stopped).toHaveBeenCalledTimes(3);
    unsubscribe();
    listener.mockClear();
    setRecognitionPreference("local");
    expect(listener).not.toHaveBeenCalled();
  });

  it("aborts cross-tab changes even with no mounted settings subscriber", () => {
    const { host, data } = browserStorage();
    const stopped = vi.fn();
    host.addEventListener("sollu:stop", stopped);
    readRecognitionPreference();
    readRecognitionPreference();
    data.set(recognitionPreferenceStorageKey, "local:another-tab");
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: recognitionPreferenceStorageKey,
        newValue: "local:another-tab",
      }),
    );
    expect(stopped).toHaveBeenCalledTimes(1);
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "unrelated",
        newValue: "anything",
      }),
    );
    expect(stopped).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers on storage clearing and an earlier queued revocation", () => {
    const { host, data } = browserStorage();
    const listener = vi.fn();
    const stopped = vi.fn();
    host.addEventListener("sollu:stop", stopped);
    const unsubscribe = subscribeRecognitionPreference(listener);
    data.set(recognitionPreferenceStorageKey, "browser");
    host.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: recognitionPreferenceStorageKey,
        newValue: "local:earlier-revocation",
      }),
    );
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    data.clear();
    host.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    expect(stopped).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(readRecognitionPreference()).toBe("local");
    unsubscribe();
  });

  it("fails closed when stored permission cannot be read", () => {
    const { host } = browserStorage();
    setRecognitionPreference("browser");
    host.localStorage.getItem = () => {
      throw new Error("storage unavailable");
    };
    expect(readRecognitionPreference()).toBe("local");
  });

  it("revokes in the current tab even when local permission cannot be persisted", () => {
    const { host, data } = browserStorage();
    setRecognitionPreference("browser");
    const listener = vi.fn();
    const stopped = vi.fn();
    host.addEventListener("sollu:stop", stopped);
    const unsubscribe = subscribeRecognitionPreference(listener);
    host.localStorage.setItem = () => {
      throw new Error("storage unavailable");
    };
    expect(() => setRecognitionPreference("local")).toThrow(
      "storage unavailable",
    );
    expect(data.get(recognitionPreferenceStorageKey)).toBe("browser");
    expect(readRecognitionPreference()).toBe("local");
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("never grants online permission if that write fails", () => {
    const { host } = browserStorage();
    host.localStorage.setItem = () => {
      throw new Error("storage unavailable");
    };
    expect(() => setRecognitionPreference("browser")).toThrow(
      "storage unavailable",
    );
    expect(readRecognitionPreference()).toBe("local");
  });

  it("rejects malformed mode values and allows recovery only by a successful choice", () => {
    browserStorage();
    setRecognitionPreference("browser");
    expect(() => setRecognitionPreference("online" as RecognitionMode)).toThrow(
      "supported",
    );
    expect(readRecognitionPreference()).toBe("local");
    setRecognitionPreference("local");
    expect(readRecognitionPreference()).toBe("local");
    setRecognitionPreference("browser");
    expect(readRecognitionPreference()).toBe("browser");
  });
});
