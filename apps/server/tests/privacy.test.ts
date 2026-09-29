import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextPacketSchema } from "@sollu/shared";
import { createApp } from "../src/app";
import { configFromEnv, type ServerConfig } from "../src/config";
import { selectIntent } from "../src/lib/intent";
import {
  generateStructured,
  type StructuredOptions,
} from "../src/providers/cloud";
import { ollamaIntent } from "../src/providers/ollama";
import { ProviderSettingsStore } from "../src/providers/providerSettings";

const config: ServerConfig = {
  secret: "fictional-local-only-test-secret-at-least-32-bytes",
  port: 0,
  host: "127.0.0.1",
  origin: "http://localhost:5173",
  intentProvider: "mock",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "test-local",
  timeoutMs: 1000,
  accessCode: "",
  logging: false,
  production: false,
};
const context = ContextPacketSchema.parse({
  fragment: { modality: "text", raw: "water" },
  outputLang: "en",
});
const options: StructuredOptions = {
  model: "test-model",
  apiKey: "fictional-fixture-key",
  timeoutMs: 1000,
  system: "Return JSON.",
  user: "Synthetic fixture only.",
  schema: { type: "object" },
};
const clouds = ["openai", "anthropic", "gemini", "groq"] as const;
const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup(overrides: Partial<ServerConfig> = {}) {
  const app = await createApp({ ...config, ...overrides });
  apps.push(app);
  const device = (
    await app.inject({
      method: "POST",
      url: "/api/device/register",
      payload: {},
    })
  ).json<{ token: string }>();
  return { app, headers: { authorization: `Bearer ${device.token}` } };
}

describe("server cloud privacy policy", () => {
  it.each([undefined, "0", "true", "yes", "false"])(
    "ignores cloud defaults and environment keys when ALLOW_CLOUD_AI=%s",
    (value) => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("ALLOW_CLOUD_AI", value);
      vi.stubEnv("MOCK_PROVIDERS", "0");
      vi.stubEnv("LLM_PROVIDER", "openai");
      vi.stubEnv("OPENAI_API_KEY", "fictional-environment-fixture");
      vi.stubEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
      vi.stubEnv("OLLAMA_MODEL", "test-local");
      const result = configFromEnv();
      expect(result.allowCloudAI).toBe(false);
      expect(result.intentProvider).toBe("mock");
      expect(result.apiKeys).toEqual({});
    },
  );
  it("requires exact operator opt-in, then still waits for device consent", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ALLOW_CLOUD_AI", "1");
    vi.stubEnv("MOCK_PROVIDERS", "0");
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "fictional-environment-fixture");
    vi.stubEnv("LLM_MODEL", "test-model");
    vi.stubEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
    vi.stubEnv("OLLAMA_MODEL", "test-local");
    const result = configFromEnv();
    expect(result.allowCloudAI).toBe(true);
    expect(
      new ProviderSettingsStore(result).resolve("fixture").intentProvider,
    ).toBe("mock");
  });
  it.each(clouds)(
    "blocks %s at the adapter before fetch even with a key",
    async (provider) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      for (const allowCloudAI of [undefined, false]) {
        await expect(
          generateStructured(provider, { ...options, allowCloudAI }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "CLOUD_AI_DISABLED",
        });
      }
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(clouds)(
    "rejects forged %s selection and never tests or infers through cloud",
    async (provider) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const { app, headers } = await setup({
        intentProvider: provider,
        apiKeys: { [provider]: "fictional-environment-fixture" },
      });
      const selection = await app.inject({
        method: "POST",
        url: "/api/llm/settings",
        headers,
        payload: { provider, apiKey: "fictional-key", cloudConsent: true },
      });
      expect(selection.statusCode).toBe(403);
      expect(selection.json().code).toBe("CLOUD_AI_DISABLED");
      const saved = (
        await app.inject({ url: "/api/llm/settings", headers })
      ).json();
      expect(saved.policy).toEqual({ mode: "local-only", allowCloudAI: false });
      expect(saved.provider).toBe("mock");
      expect(
        saved.providers.find((row: { id: string }) => row.id === provider),
      ).toMatchObject({
        available: false,
        keyConfigured: false,
        keySource: "none",
      });
      const test = await app.inject({
        method: "POST",
        url: "/api/llm/test",
        headers,
        payload: {},
      });
      expect(test.json()).toMatchObject({ provider: "mock", ok: true });
      const inference = await app.inject({
        method: "POST",
        url: "/api/intent",
        headers,
        payload: { context, localOnly: false },
      });
      expect(inference.statusCode).toBe(200);
      expect(inference.json().provider).toBe("mock");
      expect(fetch).not.toHaveBeenCalled();
      expect(JSON.stringify(saved)).not.toContain("fictional");
    },
  );
  it("does not accept a browser-supplied policy override", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { app, headers } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/api/llm/settings",
      headers,
      payload: { provider: "openai", cloudConsent: true, allowCloudAI: true },
    });
    expect(response.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("revokes stale session keys, cloud permission and selection after policy restriction", () => {
    const mutableConfig = {
      ...config,
      allowCloudAI: true,
      apiKeys: { openai: "fictional-env" },
    };
    const store = new ProviderSettingsStore(mutableConfig);
    store.update("fixture", {
      provider: "openai",
      apiKey: "fictional-session",
      cloudConsent: true,
    });
    mutableConfig.allowCloudAI = false;
    expect(store.resolve("fixture")).toMatchObject({
      intentProvider: "mock",
      apiKeys: {},
      apiKey: undefined,
    });
    expect(store.view("fixture")).toMatchObject({
      cloudConsent: false,
      policy: { allowCloudAI: false },
    });
    mutableConfig.allowCloudAI = true;
    expect(store.resolve("fixture").intentProvider).toBe("mock");
    expect(
      store.view("fixture").providers.find((row) => row.id === "openai")
        ?.keySource,
    ).toBe("environment");
  });
  it("revokes dormant keys while preserving a local provider, and permits key removal", () => {
    const mutableConfig = { ...config, allowCloudAI: true };
    const store = new ProviderSettingsStore(mutableConfig);
    store.update("fixture", {
      provider: "openai",
      apiKey: "fictional-session",
      cloudConsent: true,
    });
    store.update("fixture", { provider: "ollama", model: "test-local" });
    mutableConfig.allowCloudAI = false;
    const result = store.update("fixture", {
      provider: "openai",
      removeKey: true,
    });
    expect(result.provider).toBe("ollama");
    expect(result.providers.some((row) => row.keyConfigured)).toBe(false);
  });
  it("protects the intent boundary even when given an injected cloud configuration or generator", async () => {
    const generator = vi.fn<typeof generateStructured>();
    const result = await selectIntent(
      context,
      {
        ...config,
        intentProvider: "openai",
        apiKey: "fictional-key",
      },
      undefined,
      undefined,
      generator,
    );
    expect(result.fallback).toBe(true);
    expect(result.model).toContain("cloud disabled");
    expect(generator).not.toHaveBeenCalled();
  });
  it.each([undefined, true])(
    "treats request localOnly=%s as local even on a cloud-enabled server",
    async (localOnly) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const { app, headers } = await setup({ allowCloudAI: true });
      await app.inject({
        method: "POST",
        url: "/api/llm/settings",
        headers,
        payload: {
          provider: "openai",
          cloudConsent: true,
          apiKey: "fictional-fixture",
        },
      });
      const response = await app.inject({
        method: "POST",
        url: "/api/intent",
        headers,
        payload: { context, localOnly },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().provider).toBe("mock");
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([{}, { localOnly: true }])(
    "keeps synthetic connection tests local for payload %j despite a saved cloud selection",
    async (payload) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const { app, headers } = await setup({ allowCloudAI: true });
      const saved = await app.inject({
        method: "POST",
        url: "/api/llm/settings",
        headers,
        payload: {
          provider: "openai",
          cloudConsent: true,
          apiKey: "fictional-fixture",
        },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json().provider).toBe("openai");
      const response = await app.inject({
        method: "POST",
        url: "/api/llm/test",
        headers,
        payload,
      });
      expect(response.statusCode).toBe(200);
      // The blocked cloud choice is reported honestly, never as a Free vocabulary pass.
      expect(response.json()).toMatchObject({ provider: "openai", ok: false });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("keeps loopback Ollama available and does not fail over to a cloud provider", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        done: true,
        done_reason: "stop",
        message: { content: '{"ok":true}' },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { app, headers } = await setup({
      apiKeys: { openai: "fictional-env" },
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm/settings",
          headers,
          payload: { provider: "ollama", model: "test-local" },
        })
      ).statusCode,
    ).toBe(200);
    const result = (
      await app.inject({
        method: "POST",
        url: "/api/llm/test",
        headers,
        payload: {},
      })
    ).json();
    expect(result).toMatchObject({ ok: true, provider: "ollama" });
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/chat");
    fetch.mockRejectedValue(new Error("offline"));
    const inference = await app.inject({
      method: "POST",
      url: "/api/intent",
      headers,
      payload: { context },
    });
    expect(inference.json().fallback).toBe(true);
    expect(
      fetch.mock.calls.every(
        ([url]) => url === "http://127.0.0.1:11434/api/chat",
      ),
    ).toBe(true);
  });
});

describe("legacy local selection egress", () => {
  it("rejects nonloopback endpoints and cloud-tagged models before fetching", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const input of [
      { url: "https://example.com", model: "test-local" },
      { url: "http://127.0.0.1:11434", model: "test:cloud" },
    ]) {
      await expect(
        ollamaIntent(context, { ...input, timeoutMs: 1000, allowed: [] }),
      ).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("disallows redirects for the legacy adapter as well", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: { content: '{"candidates":[]}' } }),
      );
    vi.stubGlobal("fetch", fetch);
    await ollamaIntent(context, {
      url: config.ollamaUrl,
      model: "test-local",
      timeoutMs: 1000,
      allowed: [],
    });
    expect(fetch.mock.calls[0][1].redirect).toBe("error");
  });
});
