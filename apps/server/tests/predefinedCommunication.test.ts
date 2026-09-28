import { describe, expect, it, vi } from "vitest";
import {
  applyCandidatePolicy,
  ContextPacketSchema,
  getMockCandidates,
} from "@sollu/shared";
import { selectIntent } from "../src/lib/intent";
import type { ServerConfig } from "../src/config";
import type { generateStructured } from "../src/providers/cloud";
import { createApp } from "../src/app";

const config: ServerConfig = {
  allowCloudAI: true,
  secret: "fictional-test-secret-for-predefined-routing",
  port: 0,
  host: "127.0.0.1",
  origin: "http://localhost:5173",
  intentProvider: "openai",
  llmModel: "test-model",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "test-local",
  timeoutMs: 1000,
  accessCode: "",
  logging: false,
  production: false,
};
const context = (raw: string) =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw },
    outputLang: "en",
  });

describe("health/help communication bypass", () => {
  it("the signed API response identifies actual catalog execution even with cloud permission", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValue(new Error("Must not leave the server"));
    vi.stubGlobal("fetch", fetch);
    const app = await createApp(config);
    try {
      const device = (
        await app.inject({
          method: "POST",
          url: "/api/device/register",
          payload: {},
        })
      ).json<{ token: string }>();
      const headers = { authorization: `Bearer ${device.token}` };
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/llm/settings",
            headers,
            payload: {
              provider: "openai",
              cloudConsent: true,
              apiKey: "fictional-test-key",
            },
          })
        ).statusCode,
      ).toBe(200);
      const response = await app.inject({
        method: "POST",
        url: "/api/intent",
        headers,
        payload: { context: context("chest pain"), localOnly: false },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        provider: "catalog",
        configuredProvider: "openai",
        model: "predefined-health-help",
        fallback: false,
      });
      expect(body.candidates).toHaveLength(1);
      expect(body.candidates[0].sig).toBeTruthy();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
      vi.unstubAllGlobals();
    }
  });
  it.each(["openai", "anthropic", "gemini", "groq", "ollama", "mock"] as const)(
    "never calls %s for explicit health/help wording",
    async (intentProvider) => {
      const generator = vi
        .fn<typeof generateStructured>()
        .mockRejectedValue(new Error("Must not be called"));
      for (const raw of [
        "chest pain",
        "no chest pain",
        "chest pain yesterday",
        "left leg pain",
        "night tablet",
        "medicine FictionalRemedy",
        "take five tablets",
        "I already took my medicine",
        "help",
        "can't breathe",
      ]) {
        const c = context(raw),
          before = JSON.stringify(c);
        const result = await selectIntent(
          c,
          { ...config, intentProvider },
          undefined,
          undefined,
          generator,
        );
        expect(result.model).toBe("predefined-health-help");
        expect(result.fallback).toBe(false);
        expect(result.candidates).toEqual(
          applyCandidatePolicy(getMockCandidates(c), c).candidates,
        );
        expect(JSON.stringify(c)).toBe(before);
      }
      expect(generator).not.toHaveBeenCalled();
    },
  );
  it("does not invoke the legacy selector or erase unsupported medical qualifiers", async () => {
    const selector = vi.fn().mockRejectedValue(new Error("Must not be called"));
    for (const raw of [
      "no chest pain",
      "chest pain yesterday",
      "maybe chest pain",
      "medicine FictionalRemedy",
      "double my dose",
      "pain in left and right leg",
    ]) {
      const result = await selectIntent(
        context(raw),
        { ...config, intentProvider: "ollama" },
        undefined,
        selector,
      );
      expect(result.candidates).toEqual([]);
      expect(result.clarification).toBeTruthy();
    }
    expect(selector).not.toHaveBeenCalled();
  });
  it("retains authored chest-help and medicine sentences with no diagnosis or dosing instruction", async () => {
    const chest = await selectIntent(context("chest pain"), config);
    expect(chest.candidates.map((c) => c.text)).toEqual([
      "My chest hurts — I need help now.",
    ]);
    const medicine = await selectIntent(context("night tablet"), config);
    expect(medicine.candidates.length).toBeGreaterThan(0);
    expect(
      medicine.candidates.some((c) =>
        /time to take|diagnos|\bmg\b|dose/iu.test(c.text),
      ),
    ).toBe(false);
  });
  it("keeps a nonmedical model path and cancellation working", async () => {
    const generator = vi
      .fn<typeof generateStructured>()
      .mockResolvedValue({ candidates: [], clarification: true });
    await selectIntent(
      context("want visit sister garden tomorrow"),
      config,
      undefined,
      undefined,
      generator,
    );
    expect(generator).toHaveBeenCalledTimes(1);
    const controller = new AbortController();
    controller.abort();
    await expect(
      selectIntent(
        context("chest pain"),
        config,
        controller.signal,
        undefined,
        generator,
      ),
    ).rejects.toThrow("Cancelled");
    expect(generator).toHaveBeenCalledTimes(1);
  });
});
