import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ContextPacketSchema,
  type ContextPacket,
  type GeneratedSentence,
} from "@sollu/shared";
import { createApp } from "../src/app";
import { selectIntent } from "../src/lib/intent";
import type { ServerConfig } from "../src/config";
import type { generateStructured } from "../src/providers/cloud";

const config: ServerConfig = {
  allowCloudAI: true,
  secret: "fictional-ai-only-test-secret-at-least-32-bytes",
  port: 0,
  host: "127.0.0.1",
  origin: "http://localhost:5173",
  intentProvider: "openai",
  llmModel: "test-model",
  apiKey: "fictional-test-key",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "test-local",
  timeoutMs: 1000,
  accessCode: "",
  logging: false,
  production: false,
};
const context = (raw: string): ContextPacket =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang: "en",
  });
const water = (c: ContextPacket): GeneratedSentence => ({
  text: "I would like some water.",
  gloss_en: "I would like some water.",
  speechAct: "request",
  polarity: "positive",
  side: "none",
  evidence: [
    { path: "fragment.raw", quote: c.fragment.raw, translation_en: "" },
  ],
});
const adapter = (value: unknown) =>
  vi.fn(async () => value) as unknown as typeof generateStructured;
const aiOnly = { preparedAlternatives: false };

describe("AI-only sentence engine", () => {
  it("reports an unavailable engine instead of substituting vocabulary", async () => {
    const failing = vi.fn(async () => {
      throw new Error("provider down");
    }) as unknown as typeof generateStructured;
    const c = context("water");
    const mixed = await selectIntent(c, config, undefined, undefined, failing);
    expect(mixed.candidates.length).toBeGreaterThan(0);
    const strict = await selectIntent(
      c,
      config,
      undefined,
      undefined,
      failing,
      aiOnly,
    );
    expect(strict).toMatchObject({
      candidates: [],
      fallback: true,
      failure: "unavailable",
    });
  });

  it("reports unverifiable model output instead of substituting vocabulary", async () => {
    const c = context("water");
    const invalid = {
      candidates: [
        {
          ...water(c),
          evidence: [
            { path: "fragment.raw", quote: "coffee", translation_en: "" },
          ],
        },
      ],
      clarification: false,
    };
    const strict = await selectIntent(
      c,
      config,
      undefined,
      undefined,
      adapter(invalid),
      aiOnly,
    );
    expect(strict).toMatchObject({ candidates: [], failure: "unverified" });
  });

  it("never mixes prepared phrases into valid model suggestions", async () => {
    const c = context("water");
    const strict = await selectIntent(
      c,
      config,
      undefined,
      undefined,
      adapter({ candidates: [water(c)], clarification: false }),
      aiOnly,
    );
    expect(strict.candidates.length).toBeGreaterThan(0);
    expect(strict.candidates.every((item) => item.source === "model")).toBe(
      true,
    );
    expect(strict.model).not.toContain("prepared");
  });

  it("keeps health and help wording on prepared communication", async () => {
    const generator = adapter({ candidates: [], clarification: true });
    const result = await selectIntent(
      context("pain"),
      config,
      undefined,
      undefined,
      generator,
      aiOnly,
    );
    expect(result.model).toBe("predefined-health-help");
    expect(generator).not.toHaveBeenCalled();
  });
});

const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("intent route in AI-only mode", () => {
  it("tells a device its blocked cloud choice was not asked", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const app = await createApp({ ...config, intentProvider: "mock" });
    apps.push(app);
    const { token } = (
      await app.inject({
        method: "POST",
        url: "/api/device/register",
        payload: {},
      })
    ).json<{ token: string }>();
    const headers = { authorization: `Bearer ${token}` };
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
    const body = {
      context: {
        fragment: { modality: "text", raw: "water" },
        outputLang: "en",
      },
      localOnly: true,
    };
    const strict = (
      await app.inject({
        method: "POST",
        url: "/api/intent",
        headers,
        payload: { ...body, preparedAlternatives: false },
      })
    ).json();
    expect(strict).toMatchObject({
      candidates: [],
      failure: "device-permission",
      requestedProvider: "openai",
      mock: false,
    });
    // Older clients that omit the flag keep the previous mixed behaviour.
    const legacy = (
      await app.inject({
        method: "POST",
        url: "/api/intent",
        headers,
        payload: body,
      })
    ).json();
    expect(legacy.candidates.length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("engine failure reasons", () => {
  it("classify provider problems from status codes and errors only", async () => {
    const { engineFailureDetail } = await import("../src/lib/intent");
    const { ProviderRequestError } = await import("../src/providers/cloud");
    expect(engineFailureDetail(new ProviderRequestError(401))).toBe("key");
    expect(engineFailureDetail(new ProviderRequestError(404))).toBe("model");
    expect(engineFailureDetail(new ProviderRequestError(429))).toBe("quota");
    expect(engineFailureDetail(new ProviderRequestError(503))).toBe("provider");
    expect(engineFailureDetail(new ProviderRequestError(400))).toBe(
      "invalid-output",
    );
    expect(engineFailureDetail(new Error("Provider timeout"))).toBe("timeout");
    expect(
      engineFailureDetail(new DOMException("timed out", "TimeoutError")),
    ).toBe("timeout");
    expect(engineFailureDetail(new TypeError("fetch failed"))).toBe("network");
  });
  it("reports a timeout with the time the engine was given", async () => {
    const slow = vi.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof generateStructured;
    const result = await selectIntent(
      context("water"),
      { ...config, timeoutMs: 50 },
      undefined,
      undefined,
      slow,
      aiOnly,
    );
    expect(result).toMatchObject({
      candidates: [],
      failure: "unavailable",
      failureDetail: "timeout",
    });
  });
});
