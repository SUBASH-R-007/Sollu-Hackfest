import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import {
  generateStructured,
  type StructuredOptions,
} from "../src/providers/cloud";
import {
  ProviderSettingsStore,
  providerSessionTtlMs,
} from "../src/providers/providerSettings";
import {
  defaultModels,
  type LlmProvider,
  type ServerConfig,
} from "../src/config";

const config: ServerConfig = {
  // Explicit fixture opt-in exercises retained cloud adapters; production defaults are tested separately.
  allowCloudAI: true,
  secret: "fictional-server-test-secret-at-least-32-bytes",
  port: 0,
  host: "127.0.0.1",
  origin: "http://localhost:5173",
  intentProvider: "mock",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "test-local",
  timeoutMs: 8000,
  accessCode: "",
  logging: false,
  production: false,
};
const options: StructuredOptions = {
  allowCloudAI: true,
  model: "test-model",
  apiKey: "fictional-test-key",
  timeoutMs: 1000,
  system: "Return valid JSON.",
  user: "Synthetic test only.",
  schema: {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  },
};
const envelopes = {
  openai: {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: '{"ok":true}' }],
      },
    ],
  },
  anthropic: {
    stop_reason: "end_turn",
    content: [{ type: "text", text: '{"ok":true}' }],
  },
  gemini: {
    candidates: [
      { finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } },
    ],
  },
  groq: {
    choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }],
  },
  ollama: {
    done: true,
    done_reason: "stop",
    message: { content: '{"ok":true}' },
  },
};
const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("bounded provider adapters", () => {
  it.each([
    ["openai", "https://api.openai.com/v1/responses", "Authorization"],
    ["anthropic", "https://api.anthropic.com/v1/messages", "x-api-key"],
    [
      "gemini",
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent",
      "x-goog-api-key",
    ],
    [
      "groq",
      "https://api.groq.com/openai/v1/chat/completions",
      "Authorization",
    ],
    ["ollama", "http://127.0.0.1:11434/api/chat", undefined],
  ] as const)(
    "uses %s's official request and parses structured output",
    async (provider, endpoint, header) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(Response.json(envelopes[provider]));
      vi.stubGlobal("fetch", fetch);
      expect(await generateStructured(provider, options)).toEqual({ ok: true });
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(endpoint);
      expect(url).not.toContain(options.apiKey);
      expect(init.redirect).toBe("error");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      if (header)
        expect((init.headers as Record<string, string>)[header]).toContain(
          options.apiKey,
        );
      else expect(init.headers).not.toHaveProperty("Authorization");
      const body = JSON.parse(init.body as string);
      if (provider === "openai") {
        expect(body.store).toBe(false);
        expect(body.text.format.schema).toEqual(options.schema);
        expect(body.text.format.strict).toBe(true);
      }
      if (provider === "anthropic")
        expect(body.output_config.format.type).toBe("json_schema");
      if (provider === "gemini") {
        expect(body.store).toBe(false);
        expect(body.generationConfig.responseJsonSchema).toEqual(
          options.schema,
        );
      }
      if (provider === "groq")
        expect(body.response_format.json_schema.strict).toBe(true);
      if (provider === "ollama") {
        expect(body.format).toEqual(options.schema);
        expect(body.stream).toBe(false);
      }
    },
  );
  it("removes Anthropic's unsupported wire bounds while retaining structural schema", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(envelopes.anthropic));
    vi.stubGlobal("fetch", fetch);
    await generateStructured("anthropic", {
      ...options,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { type: "string", maxLength: 90 },
          items: {
            type: "array",
            maxItems: 3,
            items: { type: "number", minimum: 1 },
          },
        },
      },
    });
    expect(
      JSON.parse(fetch.mock.calls[0][1].body).output_config.format.schema
        .properties,
    ).toEqual({
      value: { type: "string" },
      items: { type: "array", items: { type: "number" } },
    });
  });
  it("rejects unavailable keys without making a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      generateStructured("openai", { ...options, apiKey: undefined }),
    ).rejects.toThrow("key is not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "http://example.com",
    "http://127.0.0.1@example.com",
    "http://localhost?key=hidden",
  ])("rejects unsafe local endpoint %s", async (ollamaUrl) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      generateStructured("ollama", { ...options, ollamaUrl }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cloud Ollama models", async () => {
    await expect(
      generateStructured("ollama", { ...options, model: "gpt-oss:cloud" }),
    ).rejects.toThrow("Cloud Ollama");
  });
  it("does not return provider error bodies or API keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "secret-patient-data fictional-test-key" },
            { status: 429 },
          ),
        ),
    );
    await expect(generateStructured("openai", options)).rejects.toThrow(
      "Language provider request failed",
    );
  });
  it("bounds actual streamed response bytes even without a content length", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("x".repeat(100_000))),
    );
    await expect(generateStructured("openai", options)).rejects.toThrow(
      "too large",
    );
  });
  it.each([
    ["openai", { ...envelopes.openai, status: "incomplete" }],
    ["anthropic", { ...envelopes.anthropic, stop_reason: "max_tokens" }],
    [
      "gemini",
      {
        candidates: [
          { ...envelopes.gemini.candidates[0], finishReason: "MAX_TOKENS" },
        ],
      },
    ],
    [
      "groq",
      { choices: [{ ...envelopes.groq.choices[0], finish_reason: "length" }] },
    ],
    ["ollama", { ...envelopes.ollama, done_reason: "length" }],
  ] as const)("rejects incomplete %s output", async (provider, envelope) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(envelope)));
    await expect(generateStructured(provider, options)).rejects.toThrow();
  });
  it("honors cancellation before network work", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      generateStructured("openai", { ...options, signal: AbortSignal.abort() }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("bounds stalled network calls with an abort signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener(
              "abort",
              () => reject(new Error("cancelled")),
              { once: true },
            );
          }),
      ),
    );
    await expect(
      generateStructured("openai", { ...options, timeoutMs: 20 }),
    ).rejects.toThrow("cancelled");
  });
});

describe("device-scoped provider settings", () => {
  it("forgets an inactive key without activating cloud or granting consent", () => {
    const store = new ProviderSettingsStore(config);
    store.update("a", {
      provider: "openai",
      apiKey: "fixture",
      cloudConsent: true,
    });
    store.update("a", { provider: "mock", timeoutMs: 15000 });
    const view = store.update("a", {
      provider: "openai",
      removeKey: true,
      model: "ignored",
      timeoutMs: 1000,
    });
    expect(view.provider).toBe("mock");
    expect(view.cloudConsent).toBe(false);
    expect(view.timeoutMs).toBe(15000);
    expect(view.model).toBe(defaultModels.mock);
    expect(view.providers.find((p) => p.id === "openai")?.keyConfigured).toBe(
      false,
    );
  });
  it("never activates an environment cloud default without device permission", () => {
    const store = new ProviderSettingsStore({
      ...config,
      intentProvider: "openai",
      apiKeys: { openai: "environment-fixture" },
    });
    expect(store.resolve("a").intentProvider).toBe("mock");
    expect(
      store.view("a").providers.find((x) => x.id === "openai")?.keySource,
    ).toBe("environment");
    expect(() => store.update("a", { provider: "openai" })).toThrow();
    store.update("a", { provider: "openai", cloudConsent: true });
    expect(store.resolve("a").apiKey).toBe("environment-fixture");
  });
  it("isolates keys, redacts views, increments revisions and forgets only the selected session key", () => {
    const store = new ProviderSettingsStore({
      ...config,
      apiKeys: { openai: "environment-fixture" },
    });
    const first = store.update("a", {
      provider: "openai",
      apiKey: "session-fixture",
      cloudConsent: true,
    });
    expect(first.revision).toBeGreaterThan(0);
    expect(JSON.stringify(first)).not.toContain("session-fixture");
    expect(store.resolve("a").apiKey).toBe("session-fixture");
    expect(store.resolve("b").apiKey).toBeUndefined();
    const removed = store.update("a", {
      provider: "openai",
      removeKey: true,
      cloudConsent: true,
    });
    expect(removed.revision).toBeGreaterThan(first.revision);
    expect(store.resolve("a").apiKey).toBe("environment-fixture");
    store.update("a", { provider: "mock" });
    expect(store.view("a").cloudConsent).toBe(false);
  });
  it("expires keys and sharing permission, and bounds credential-bearing devices", () => {
    let now = 100;
    const store = new ProviderSettingsStore(config, () => now, 2);
    for (const device of ["a", "b", "c"]) {
      now++;
      store.update(device, {
        provider: "openai",
        apiKey: `fixture-${device}`,
        cloudConsent: true,
      });
    }
    expect(store.resolve("a").intentProvider).toBe("mock");
    now += providerSessionTtlMs + 1;
    expect(store.resolve("c").apiKey).toBeUndefined();
    expect(store.view("c").cloudConsent).toBe(false);
  });
  it.each([
    { provider: "mock", apiKey: "fixture" },
    { provider: "ollama", model: "model:cloud" },
    { provider: "openai", cloudConsent: true, apiKey: "key\nheader" },
    { provider: "mock", timeoutMs: 31_000 },
  ])("rejects invalid setting %#", (input) => {
    expect(() =>
      new ProviderSettingsStore(config).update("a", input),
    ).toThrow();
  });
  it("resets memory when the server store is discarded", () => {
    const store = new ProviderSettingsStore(config);
    store.update("a", {
      provider: "groq",
      apiKey: "fixture",
      cloudConsent: true,
    });
    store.clear();
    expect(store.view("a").provider).toBe("mock");
    expect(store.resolve("a").apiKey).toBeUndefined();
  });
});

async function setup() {
  const app = await createApp(config);
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
describe("provider settings API", () => {
  it("uses the authenticated device's chosen provider for a signed contextual sentence", async () => {
    const { app, headers } = await setup();
    const raw = "want visit sister garden tomorrow";
    const generated = {
      candidates: [
        {
          text: "I want to visit my sister in the garden tomorrow.",
          gloss_en: "I want to visit my sister in the garden tomorrow.",
          speechAct: "request",
          polarity: "positive",
          side: "none",
          evidence: [{ path: "fragment.raw", quote: raw, translation_en: "" }],
        },
      ],
      clarification: false,
    };
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(generated) }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const saved = await app.inject({
      method: "POST",
      url: "/api/llm/settings",
      headers,
      payload: {
        provider: "openai",
        apiKey: "fictional-secret-key",
        cloudConsent: true,
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/intent",
      headers,
      payload: {
        localOnly: false,
        context: { fragment: { modality: "text", raw }, outputLang: "en" },
      },
    });
    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.provider).toBe("openai");
    expect(result.fallback).toBe(false);
    expect(result.revision).toBe(saved.json().revision);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].source).toBe("model");
    expect(result.candidates[0].sig).toBeTruthy();
    expect(result.candidates[0].text).toBe(generated.candidates[0].text);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response.body).not.toContain("fictional-secret-key");
  });
  it("authenticates settings and synthetic tests", async () => {
    const { app } = await setup();
    for (const [method, url] of [
      ["GET", "/api/llm/settings"],
      ["POST", "/api/llm/settings"],
      ["POST", "/api/llm/test"],
    ] as const)
      expect((await app.inject({ method, url })).statusCode).toBe(401);
  });
  it("saves without a paid call and never echoes a key", async () => {
    const { app, headers } = await setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await app.inject({
      method: "POST",
      url: "/api/llm/settings",
      headers,
      payload: {
        provider: "openai",
        apiKey: "fictional-secret-key",
        cloudConsent: true,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("fictional-secret-key");
    expect(response.json().model).toBe(defaultModels.openai);
    expect(fetch).not.toHaveBeenCalled();
    const second = (
      await app.inject({
        method: "POST",
        url: "/api/device/register",
        payload: {},
      })
    ).json<{ token: string }>();
    const other = await app.inject({
      url: "/api/llm/settings",
      headers: { authorization: `Bearer ${second.token}` },
    });
    expect(other.json().provider).toBe("mock");
    expect(
      other.json().providers.find((p: { id: LlmProvider }) => p.id === "openai")
        .keyConfigured,
    ).toBe(false);
  });
  it("tests saved settings only with synthetic content", async () => {
    const { app, headers } = await setup();
    const fetch = vi.fn().mockResolvedValue(Response.json(envelopes.openai));
    vi.stubGlobal("fetch", fetch);
    await app.inject({
      method: "POST",
      url: "/api/llm/settings",
      headers,
      payload: {
        provider: "openai",
        apiKey: "fictional-secret-key",
        cloudConsent: true,
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/llm/test",
      headers,
      payload: { localOnly: false },
    });
    expect(response.json().ok).toBe(true);
    expect(response.body).not.toContain("fictional-secret-key");
    expect(JSON.parse(fetch.mock.calls[0][1].body).input).toBe(
      "Connection test. No patient data is included.",
    );
  });
  it("returns an honest failure rather than a fallback success in connection tests", async () => {
    const { app, headers } = await setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await app.inject({
      method: "POST",
      url: "/api/llm/settings",
      headers,
      payload: { provider: "gemini", cloudConsent: true },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/llm/test",
      headers,
      payload: { localOnly: false },
    });
    expect(response.json().ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires sharing permission and supports the free connection check", async () => {
    const { app, headers } = await setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm/settings",
          headers,
          payload: { provider: "openai" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm/test",
          headers,
          payload: {},
        })
      ).json().ok,
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
