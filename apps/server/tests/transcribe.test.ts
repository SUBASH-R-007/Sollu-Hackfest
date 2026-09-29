import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { ServerConfig } from "../src/config";
import { transcribeAudio } from "../src/providers/transcribe";

const config: ServerConfig = {
  allowCloudAI: true,
  secret: "fictional-transcribe-test-secret-at-least-32-bytes",
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
const audio = Buffer.from("fictional-audio-bytes");
const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function multipart(fields: Record<string, string>, type = "audio/webm") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append("file", new Blob([audio], { type }), "speech.webm");
  const request = new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: form,
  });
  return {
    payload: Buffer.from(await request.arrayBuffer()),
    contentType: request.headers.get("content-type")!,
  };
}
async function setup(overrides: Partial<ServerConfig> = {}) {
  const app = await createApp({ ...config, ...overrides });
  apps.push(app);
  const { token } = (
    await app.inject({
      method: "POST",
      url: "/api/device/register",
      payload: {},
    })
  ).json<{ token: string }>();
  return { app, authorization: `Bearer ${token}` };
}
async function saveKey(
  app: Awaited<ReturnType<typeof createApp>>,
  authorization: string,
) {
  await app.inject({
    method: "POST",
    url: "/api/llm/settings",
    headers: { authorization },
    payload: {
      provider: "openai",
      cloudConsent: true,
      apiKey: "fictional-key",
    },
  });
}
async function send(
  app: Awaited<ReturnType<typeof createApp>>,
  authorization: string,
  fields: Record<string, string>,
  type?: string,
) {
  const body = await multipart(fields, type);
  return app.inject({
    method: "POST",
    url: "/api/transcribe",
    headers: { authorization, "content-type": body.contentType },
    payload: body.payload,
  });
}

describe("transcription adapter", () => {
  it("sends one bounded multipart request to the fixed OpenAI endpoint", async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const form = init.body as FormData;
      expect(form.get("model")).toBe("gpt-4o-transcribe");
      expect(form.get("language")).toBe("ta");
      expect(form.get("response_format")).toBe("json");
      expect((form.get("file") as File).type).toBe("audio/webm");
      expect(init.redirect).toBe("error");
      return Response.json({ text: "  தண்ணி வேணும்  " });
    });
    vi.stubGlobal("fetch", fetch);
    const text = await transcribeAudio({
      allowCloudAI: true,
      apiKey: "fictional-key",
      model: "gpt-4o-transcribe",
      audio,
      mimeType: "audio/webm",
      language: "ta",
      timeoutMs: 1000,
    });
    expect(text).toBe("தண்ணி வேணும்");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.anything(),
    );
  });
  it("fails closed without cloud permission, a key, or audio", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const base = {
      apiKey: "fictional-key",
      model: "gpt-4o-transcribe",
      audio,
      mimeType: "audio/webm" as const,
      language: "en" as const,
      timeoutMs: 1000,
    };
    await expect(
      transcribeAudio({ ...base, allowCloudAI: false }),
    ).rejects.toThrow();
    await expect(
      transcribeAudio({ ...base, allowCloudAI: true, apiKey: undefined }),
    ).rejects.toThrow();
    await expect(
      transcribeAudio({ ...base, allowCloudAI: true, audio: Buffer.alloc(0) }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("transcription route", () => {
  it("reports availability honestly", async () => {
    const blocked = await setup({ allowCloudAI: false });
    expect(
      (
        await blocked.app.inject({
          url: "/api/transcribe/status",
          headers: { authorization: blocked.authorization },
        })
      ).json(),
    ).toMatchObject({ available: false, reason: "server-policy" });
    const open = await setup();
    const status = () =>
      open.app.inject({
        url: "/api/transcribe/status",
        headers: { authorization: open.authorization },
      });
    expect((await status()).json()).toMatchObject({
      available: false,
      reason: "no-key",
    });
    await saveKey(open.app, open.authorization);
    expect((await status()).json()).toMatchObject({ available: true });
  });
  it("never uploads audio when blocked, local-only, keyless or unsupported", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const blocked = await setup({ allowCloudAI: false });
    expect(
      (
        await send(blocked.app, blocked.authorization, {
          lang: "ta",
          localOnly: "false",
        })
      ).statusCode,
    ).toBe(403);
    const open = await setup();
    expect(
      (await send(open.app, open.authorization, { lang: "ta" })).statusCode,
    ).toBe(403);
    expect(
      (
        await send(open.app, open.authorization, {
          lang: "ta",
          localOnly: "false",
        })
      ).statusCode,
    ).toBe(503);
    await saveKey(open.app, open.authorization);
    expect(
      (
        await send(
          open.app,
          open.authorization,
          { lang: "ta", localOnly: "false" },
          "text/plain",
        )
      ).statusCode,
    ).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns the transcript and an honest failure without provider details", async () => {
    const open = await setup();
    await saveKey(open.app, open.authorization);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ text: "I want water" })),
    );
    const ok = await send(open.app, open.authorization, {
      lang: "en",
      localOnly: "false",
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({
      text: "I want water",
      provider: "openai",
      model: "gpt-4o-transcribe",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("provider secret detail", { status: 500 }),
      ),
    );
    const failed = await send(open.app, open.authorization, {
      lang: "en",
      localOnly: "false",
    });
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain("secret");
  });
});
