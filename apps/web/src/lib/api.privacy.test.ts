import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextPacketSchema } from "@sollu/shared";
import type { Settings } from "../db";

const stored = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("../db", () => ({ getKV: stored.get, setKV: stored.set }));
const context = ContextPacketSchema.parse({
  fragment: { modality: "text", raw: "water" },
  outputLang: "en",
});
const settings = { localProcessingOnly: false } as Settings;
const response = () =>
  Response.json({ candidates: [], model: "fixture", latencyMs: 0 });

function browserPermission() {
  const values = new Map<string, string>();
  const host = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
  });
  vi.stubGlobal("window", host);
  return values;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  stored.get.mockReset();
  stored.set.mockReset();
});

describe("privacy at the actual sentence request boundary", () => {
  it("allows an explicit sentence exception without relaxing local media", async () => {
    browserPermission();
    stored.get.mockResolvedValue({ token: "fictional", deviceId: "fixture" });
    const fetch = vi.fn().mockImplementation(async () => response());
    vi.stubGlobal("fetch", fetch);
    const { setCloudSentencePermission } =
      await import("../features/privacy/sentencePolicy");
    const {
      isLocalProcessingOnly,
      allowedDeviceVoice,
      getSpeechRecognitionMode,
      requireModelDownloadPermission,
    } = await import("../features/privacy/browserPolicy");
    setCloudSentencePermission(true);
    const { getIntent } = await import("./api");
    await getIntent(context, { ...settings, localProcessingOnly: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body).localOnly).toBe(false);
    expect(isLocalProcessingOnly()).toBe(true);
    expect(allowedDeviceVoice({ localService: false })).toBe(false);
    expect(getSpeechRecognitionMode()).toBe("local");
    expect(() => requireModelDownloadPermission()).toThrow();
  });
  it("rechecks the separate sentence permission after registration yields", async () => {
    browserPermission();
    stored.get.mockResolvedValue(undefined);
    let registered!: (result: Response) => void;
    const fetch = vi.fn().mockImplementation(async (url: string) =>
      url === "/api/device/register"
        ? new Promise<Response>((resolve) => {
            registered = resolve;
          })
        : response(),
    );
    vi.stubGlobal("fetch", fetch);
    const { setCloudSentencePermission } =
      await import("../features/privacy/sentencePolicy");
    setCloudSentencePermission(true);
    const { getIntent } = await import("./api");
    const result = getIntent(context, {
      ...settings,
      localProcessingOnly: true,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    setCloudSentencePermission(false);
    registered(Response.json({ token: "fictional", deviceId: "fixture" }));
    await result;
    expect(JSON.parse(fetch.mock.calls[1][1].body).localOnly).toBe(true);
  });
  it("does not save cloud credentials when sentence permission has been revoked", async () => {
    browserPermission();
    stored.get.mockResolvedValue({ token: "fictional", deviceId: "fixture" });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./api");
    await expect(
      api("llm/settings", {
        provider: "openai",
        apiKey: "fictional-key",
        cloudConsent: true,
      }),
    ).rejects.toThrow("Allow cloud sentence APIs");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "never weakens localOnly=%s under the runtime policy",
    async (localOnly) => {
      stored.get.mockResolvedValue({ token: "fictional", deviceId: "fixture" });
      const fetch = vi.fn().mockImplementation(async () => response());
      vi.stubGlobal("fetch", fetch);
      const { setLocalProcessingOnly } =
        await import("../features/privacy/browserPolicy");
      setLocalProcessingOnly(true);
      const { getIntent } = await import("./api");
      await getIntent(context, { ...settings, localProcessingOnly: localOnly });
      expect(JSON.parse(fetch.mock.calls[0][1].body).localOnly).toBe(true);
    },
  );
  it("preserves an intentional online request only when runtime and caller both permit it", async () => {
    stored.get.mockResolvedValue({ token: "fictional", deviceId: "fixture" });
    const fetch = vi.fn().mockImplementation(async () => response());
    vi.stubGlobal("fetch", fetch);
    const { setLocalProcessingOnly } =
      await import("../features/privacy/browserPolicy");
    setLocalProcessingOnly(false);
    const { getIntent } = await import("./api");
    await getIntent(context, settings);
    expect(JSON.parse(fetch.mock.calls[0][1].body).localOnly).toBe(false);
    await getIntent(context, { ...settings, localProcessingOnly: true });
    expect(JSON.parse(fetch.mock.calls[1][1].body).localOnly).toBe(true);
  });
  it("rechecks after registration yields and permission is revoked", async () => {
    stored.get.mockResolvedValue(undefined);
    let registered!: (result: Response) => void;
    const fetch = vi.fn().mockImplementation(async (url: string) =>
      url === "/api/device/register"
        ? new Promise<Response>((resolve) => {
            registered = resolve;
          })
        : response(),
    );
    vi.stubGlobal("fetch", fetch);
    const { setLocalProcessingOnly } =
      await import("../features/privacy/browserPolicy");
    setLocalProcessingOnly(false);
    const { getIntent } = await import("./api");
    const result = getIntent(context, settings);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    setLocalProcessingOnly(true);
    registered(Response.json({ token: "fictional", deviceId: "fixture" }));
    await result;
    expect(JSON.parse(fetch.mock.calls[1][1].body).localOnly).toBe(true);
  });
  it("does not send health text if its request was cancelled while registering", async () => {
    stored.get.mockResolvedValue(undefined);
    let registered!: (result: Response) => void;
    const fetch = vi.fn().mockImplementation(
      async () =>
        new Promise<Response>((resolve) => {
          registered = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const { getIntent } = await import("./api");
    const controller = new AbortController();
    const result = getIntent(context, settings, controller.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    controller.abort();
    const rejection = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    registered(Response.json({ token: "fictional", deviceId: "fixture" }));
    await rejection;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
