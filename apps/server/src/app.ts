import Fastify, { LogController, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { WebSocket } from "ws";
import { z, ZodError } from "zod";
import {
  ConsentRecordSchema,
  ContextPacketSchema,
  LangSchema,
  RelayEnvelopeSchema,
  SignRequestSchema,
  TtsRequestSchema,
  canonicalText,
} from "@sollu/shared";
import { Signer } from "./lib/signing.js";
import { selectIntent } from "./lib/intent.js";
import { VoiceRevocations } from "./lib/revocations.js";
import { mockWav } from "./providers/mock.js";
import {
  CloudAIBlockedError,
  isCloudProvider,
  type ServerConfig,
} from "./config.js";
import { ProviderSettingsStore } from "./providers/providerSettings.js";
import { generateStructured } from "./providers/cloud.js";
import {
  defaultTranscribeModel,
  transcribeAudio,
  transcribeMimeTypes,
} from "./providers/transcribe.js";

declare module "fastify" {
  interface FastifyRequest {
    deviceId?: string;
  }
}
const minute = 60_000;
const limited = (max: number, timeWindow = minute) => ({
  rateLimit: { max, timeWindow },
});
const safeEqual = (a: string, b: string) => {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function createApp(
  config: ServerConfig,
  logStream?: { write(message: string): void },
) {
  const signer = new Signer(config.secret);
  const providerSettings = new ProviderSettingsStore(config);
  const app = Fastify({
    bodyLimit: 64 * 1024,
    logger: config.logging
      ? {
          level: "info",
          stream: logStream,
          redact: [
            "req.headers.authorization",
            "req.body",
            "req.url",
            "res.headers",
            "err",
          ],
        }
      : false,
    logController: new LogController({ disableRequestLogging: true }),
    requestTimeout: 30_000,
  });
  app.decorateRequest("deviceId", "");
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof CloudAIBlockedError) {
      void reply
        .code(error.statusCode)
        .send({ error: error.message, code: error.code });
      return;
    }
    const status =
      error instanceof ZodError
        ? 400
        : ((error as { statusCode?: number }).statusCode ?? 500);
    const message =
      status === 400
        ? "Invalid request"
        : status === 401
          ? "Device authentication required"
          : status === 403
            ? "This capability is not valid for this request"
            : status === 413
              ? "Upload is too large"
              : status === 429
                ? "Too many requests"
                : status === 503
                  ? "Provider unavailable; use Topics or saved phrases"
                  : "Request failed";
    void reply
      .code(status)
      .send({ error: message, ...(status === 503 ? { fallback: true } : {}) });
  });
  await app.register(cors, {
    origin: config.origin,
    methods: ["GET", "POST", "DELETE"],
    credentials: false,
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 4096 },
  });
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const route = request.routeOptions.url ?? "";
    if (
      !route.startsWith("/api/") ||
      route === "/api/health" ||
      route === "/api/device/register" ||
      request.method === "OPTIONS"
    )
      return;
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    try {
      if (!token) throw new Error("Missing token");
      request.deviceId = signer.verifyDevice(token);
    } catch {
      throw new HttpError(401, "Invalid device token");
    }
  });
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: minute,
    keyGenerator: (request: FastifyRequest) => request.deviceId || request.ip,
    hook: "preHandler",
  });
  app.addHook("onResponse", async (request, reply) => {
    // Route templates only: never log URL query grants, payloads, names, text, or provider errors.
    app.log.info(
      {
        route: request.routeOptions.url ?? "unknown",
        status: reply.statusCode,
        latencyMs: Math.round(reply.elapsedTime),
      },
      "request",
    );
  });

  app.get("/api/health", async () => ({
    ok: true,
    mode: config.intentProvider === "ollama" ? "free-local" : "mock",
    providers: {
      intent: isCloudProvider(config.intentProvider)
        ? "mock"
        : config.intentProvider,
      stt: "mock",
      tts: "device (browser)",
      clone: "mock",
      vision: "on-device",
    },
    ownVoiceAvailable: false,
    capabilities: {
      localIntent: config.intentProvider === "ollama",
      paidProviders: config.allowCloudAI === true,
      encryptedRelay: true,
    },
    // `mode`/`providers.intent` describe the server default only. Each device
    // can choose its own engine in Sentence engine settings.
    intentSelection: "per-device",
    privacy: {
      mode: config.allowCloudAI === true ? "cloud-permitted" : "local-only",
      allowCloudAI: config.allowCloudAI === true,
    },
    note:
      config.allowCloudAI === true
        ? "Device speech and recorded phrases work without paid keys. Cloud sentence framing requires device settings and sharing permission. Mock cloning creates no real voice."
        : "Cloud sentence providers are blocked by server policy. Free vocabulary and loopback Ollama are available. Browser speech services have separate privacy settings. Mock cloning creates no real voice.",
  }));
  app.post("/api/device/register", { config: limited(10) }, async (request) => {
    const body = z
      .object({ accessCode: z.string().max(256).optional() })
      .parse(request.body ?? {});
    if (
      config.accessCode &&
      !safeEqual(body.accessCode ?? "", config.accessCode)
    )
      throw new HttpError(403, "Wrong access code");
    const deviceId = randomUUID();
    return { deviceId, token: signer.device(deviceId) };
  });
  app.get("/api/llm/settings", async (request) =>
    providerSettings.view(request.deviceId!),
  );
  app.post("/api/llm/settings", { config: limited(20) }, async (request) =>
    providerSettings.update(request.deviceId!, request.body),
  );
  app.post("/api/llm/test", { config: limited(5) }, async (request, reply) => {
    const input = z
      .object({ localOnly: z.boolean().default(true) })
      .strict()
      .parse(request.body ?? {});
    const selected = providerSettings.resolve(request.deviceId!, {
      localOnly: input.localOnly,
    });
    const start = performance.now();
    // A cloud choice blocked by this device's permission must not "pass" as
    // Free vocabulary.
    if (
      selected.requestedProvider &&
      selected.requestedProvider !== selected.intentProvider
    )
      return {
        ok: false,
        message:
          "Cloud sentences are off on this device, so the saved engine was not contacted. Allow cloud sentence APIs above, then test again.",
        provider: selected.requestedProvider,
        model: selected.llmModel,
        latencyMs: 0,
      };
    const controller = new AbortController();
    const cancelled = () => {
      if (!reply.raw.writableEnded) controller.abort();
    };
    request.raw.once("aborted", cancelled);
    reply.raw.once("close", cancelled);
    try {
      if (selected.intentProvider !== "mock") {
        const result = await generateStructured(selected.intentProvider, {
          allowCloudAI: selected.allowCloudAI === true,
          model: selected.llmModel!,
          apiKey: selected.apiKey,
          ollamaUrl: selected.ollamaUrl,
          timeoutMs: selected.timeoutMs,
          signal: controller.signal,
          system:
            'This is a synthetic connection test. Return the JSON object {"ok":true} only.',
          user: "Connection test. No patient data is included.",
          schema: {
            type: "object",
            properties: { ok: { type: "boolean", enum: [true] } },
            required: ["ok"],
            additionalProperties: false,
          },
        });
        z.object({ ok: z.literal(true) })
          .strict()
          .parse(result);
      }
      return {
        ok: true,
        message:
          selected.intentProvider === "mock"
            ? "Free vocabulary is ready. No external request was made."
            : "Connection passed with synthetic data. Sentence quality still needs patient review.",
        provider: selected.intentProvider,
        model: selected.llmModel,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch {
      return {
        ok: false,
        message:
          "Connection failed. Check the key, model, account limits and network, or use Free vocabulary.",
        provider: selected.intentProvider,
        model: selected.llmModel,
        latencyMs: Math.round(performance.now() - start),
      };
    } finally {
      request.raw.off("aborted", cancelled);
      reply.raw.off("close", cancelled);
    }
  });
  app.post("/api/intent", { config: limited(30) }, async (request, reply) => {
    const body = z
      .object({
        context: z.unknown(),
        localOnly: z.boolean().default(true),
        // Omitted by older clients: keep the previous mixed behaviour for them.
        preparedAlternatives: z.boolean().default(true),
      })
      .strict()
      .parse(request.body);
    const input = body.context as Record<string, unknown>;
    const context = ContextPacketSchema.parse(
      input && typeof input === "object"
        ? { ...input, outputLang: input.outputLang ?? input.lang }
        : input,
    );
    const controller = new AbortController();
    const cancelled = () => {
      if (!reply.raw.writableEnded) controller.abort();
    };
    request.raw.once("aborted", cancelled);
    reply.raw.once("close", cancelled);
    try {
      const selected = providerSettings.resolve(request.deviceId!, {
        localOnly: body.localOnly,
      });
      const requestedProvider =
        selected.requestedProvider ?? selected.intentProvider;
      const selectedResult = await selectIntent(
        context,
        selected,
        controller.signal,
        undefined,
        undefined,
        { preparedAlternatives: body.preparedAlternatives },
      );
      // AI-only mode: a device that chose a cloud engine but has since blocked
      // cloud text must not silently receive vocabulary phrases instead.
      const deviceBlocked =
        !body.preparedAlternatives &&
        requestedProvider !== selected.intentProvider &&
        selectedResult.model !== "predefined-health-help";
      const result = deviceBlocked
        ? {
            ...selectedResult,
            candidates: [],
            clarification: false,
            fallback: true,
            failure: "device-permission" as const,
          }
        : selectedResult;
      const candidates = result.candidates.map((c) => ({
        ...c,
        sig: signer.signText(
          request.deviceId!,
          context.outputLang,
          c.text,
          "candidate",
        ),
      }));
      return {
        candidates,
        model: result.model,
        provider:
          result.model === "predefined-health-help"
            ? "catalog"
            : selected.intentProvider,
        configuredProvider: selected.intentProvider,
        requestedProvider,
        mock: selected.intentProvider === "mock" && !deviceBlocked,
        fallback: "fallback" in result ? result.fallback : false,
        ...("failure" in result && result.failure
          ? { failure: result.failure }
          : {}),
        ...("failureDetail" in result && result.failureDetail
          ? { failureDetail: result.failureDetail }
          : {}),
        // Lets the notice say how long the engine was given.
        timeoutMs: selected.timeoutMs,
        revision: selected.revision,
        latencyMs: result.latencyMs,
        validationDrops: result.validationDrops,
        clarification: result.clarification,
      };
    } catch {
      return reply.code(503).send({
        fallback: true,
        error: "Intent unavailable. Use Topics or your saved phrases.",
      });
    } finally {
      request.raw.off("aborted", cancelled);
      reply.raw.off("close", cancelled);
    }
  });
  const caregiverCounts = new Map<string, { count: number; expires: number }>();
  app.post("/api/sign", { config: limited(60) }, async (request, reply) => {
    const body = SignRequestSchema.parse(request.body),
      deviceId = request.deviceId!;
    if (body.source === "candidate")
      throw new HttpError(
        403,
        "Candidates can only be signed by the intent engine",
      );
    if (body.source === "memory") {
      try {
        const proof = signer.verifyText(
          body.proofSig ?? "",
          deviceId,
          body.lang,
          body.text,
        );
        if (!["candidate", "memory"].includes(proof.s))
          throw new Error("Wrong proof source");
      } catch {
        throw new HttpError(403, "Memory needs a valid candidate proof");
      }
    } else if (body.source === "caregiver") {
      // Device possession is the owner capability; the local caregiver PIN is a UI lock, not remote authentication.
      const now = Date.now(),
        previous = caregiverCounts.get(deviceId);
      const entry =
        previous && previous.expires > now
          ? previous
          : { count: 0, expires: now + 86400_000 };
      if (entry.count >= 30) {
        reply.header("Retry-After", Math.ceil((entry.expires - now) / 1000));
        throw new HttpError(429, "Daily custom phrase limit reached");
      }
      entry.count++;
      caregiverCounts.set(deviceId, entry);
    } else if (!canonicalText(body.source, body.text, body.lang))
      throw new HttpError(403, "Text is not in the canonical list");
    return {
      sig: signer.signText(deviceId, body.lang, body.text, body.source),
    };
  });
  const deletedVoices = new VoiceRevocations(config.dataDir);
  app.post("/api/tts", { config: limited(90) }, async (request, reply) => {
    const body = TtsRequestSchema.parse(request.body);
    try {
      signer.verifyText(body.sig, request.deviceId!, body.lang, body.text);
      if (!body.preview) {
        const grant = signer.verifyVoice(
          body.voiceGrant ?? "",
          request.deviceId!,
        );
        if (deletedVoices.has(grant.voiceId)) throw new Error("Deleted voice");
      }
    } catch {
      throw new HttpError(403, "Invalid utterance or voice grant");
    }
    return reply
      .header("X-Sollu-Provider", "mock")
      .header("X-Sollu-Mock", "true")
      .header("X-Sollu-Audio", "silent-test-fixture")
      .type("audio/wav")
      .send(mockWav());
  });
  app.post(
    "/api/voice/clone",
    { config: limited(5, 3600_000) },
    async (request) => {
      const body = z
        .object({
          consent: ConsentRecordSchema,
          provider: z.literal("mock").default("mock"),
          languages: z.array(LangSchema).min(1).max(2).default(["ta", "en"]),
          mock: z.literal(true),
        })
        .strict()
        .parse(request.body);
      if (
        body.consent.kind !== "voice_clone" ||
        body.consent.withdrawnAt ||
        body.consent.at > Date.now() + 60_000
      )
        throw new HttpError(403, "Active voice-owner consent required");
      const voiceId = `mock-${randomUUID()}`;
      return {
        provider: "mock",
        voiceId,
        voiceGrant: signer.voice(request.deviceId!, voiceId),
        mock: true,
        notice:
          "Test capability only. No voice was cloned and no sample was uploaded.",
      };
    },
  );
  app.delete("/api/voice", { config: limited(10) }, async (request) => {
    const body = z
      .object({ voiceGrant: z.string().max(2048) })
      .parse(request.body);
    let grant;
    try {
      grant = signer.verifyVoice(body.voiceGrant, request.deviceId!);
    } catch {
      throw new HttpError(403, "Invalid voice grant");
    }
    deletedVoices.add(grant.voiceId, grant.expires * 1000);
    return { deleted: true, provider: "mock", mock: true };
  });
  // Flow page: optional high-accuracy transcription. Audio is sent to OpenAI
  // only when the server permits cloud AI, the device sent an explicit
  // non-local request after its own audio-sharing permission, and a key exists.
  // The upload is held in memory for this request only.
  app.get("/api/transcribe/status", async (request) => {
    const key = providerSettings.transcriptionKey(request.deviceId!);
    return {
      available: config.allowCloudAI === true && Boolean(key),
      reason:
        config.allowCloudAI !== true
          ? "server-policy"
          : key
            ? undefined
            : "no-key",
      provider: "openai",
      model: config.transcribeModel ?? defaultTranscribeModel,
    };
  });
  app.post(
    "/api/transcribe",
    { config: limited(20), bodyLimit: 6 * 1024 * 1024 },
    async (request, reply) => {
      if (!request.isMultipart())
        throw new HttpError(400, "Send audio as multipart form data");
      const fields: Record<string, string> = {};
      let audio: Buffer | undefined;
      let mimeType: (typeof transcribeMimeTypes)[number] | undefined;
      for await (const part of request.parts()) {
        if (part.type === "file") {
          const type = part.mimetype.split(";")[0].trim().toLowerCase();
          if (
            audio ||
            !(transcribeMimeTypes as readonly string[]).includes(type)
          ) {
            await part.toBuffer();
            throw new HttpError(415, "Audio format not supported");
          }
          mimeType = type as (typeof transcribeMimeTypes)[number];
          audio = await part.toBuffer();
        } else fields[part.fieldname] = String(part.value);
      }
      const input = z
        .object({
          lang: z.enum(["ta", "en"]),
          localOnly: z.enum(["true", "false"]).default("true"),
        })
        .parse(fields);
      if (config.allowCloudAI !== true) throw new CloudAIBlockedError();
      if (input.localOnly !== "false")
        throw new HttpError(403, "Cloud transcription is off on this device");
      const apiKey = providerSettings.transcriptionKey(request.deviceId!);
      if (!apiKey) throw new HttpError(503, "No transcription key");
      if (!audio || !mimeType) throw new HttpError(400, "Audio is required");
      const controller = new AbortController();
      const cancelled = () => {
        if (!reply.raw.writableEnded) controller.abort();
      };
      request.raw.once("aborted", cancelled);
      reply.raw.once("close", cancelled);
      const start = performance.now();
      const model = config.transcribeModel ?? defaultTranscribeModel;
      try {
        const text = await transcribeAudio({
          allowCloudAI: true,
          apiKey,
          model,
          audio,
          mimeType,
          language: input.lang,
          timeoutMs: 60_000,
          signal: controller.signal,
        });
        return {
          text,
          provider: "openai",
          model,
          latencyMs: Math.round(performance.now() - start),
        };
      } catch {
        return reply.code(503).send({
          error: "Transcription unavailable. Use on-device speech or type.",
        });
      } finally {
        audio = undefined;
        request.raw.off("aborted", cancelled);
        reply.raw.off("close", cancelled);
      }
    },
  );
  app.post(
    "/api/stt",
    { config: limited(30), bodyLimit: 5 * 1024 * 1024 },
    async (request, reply) => {
      let payload: unknown = request.body;
      if (request.isMultipart()) {
        const fields: Record<string, string> = {};
        for await (const part of request.parts()) {
          if (part.type === "file") {
            if (
              ![
                "audio/webm",
                "audio/mp4",
                "audio/wav",
                "audio/x-wav",
                "audio/mpeg",
                "audio/ogg",
              ].includes(part.mimetype)
            )
              throw new HttpError(415, "Audio format not supported");
            await part.toBuffer(); // Never persisted; fixtures still require an explicit selection.
          } else fields[part.fieldname] = String(part.value);
        }
        payload = fields;
      }
      const parsed = z
        .object({
          fixture: z.enum([
            "tablet",
            "water",
            "rasam",
            "table",
            "head",
            "chest",
            "coffee",
            "meena",
          ]),
          lang: LangSchema.default("ta"),
        })
        .safeParse(payload);
      if (!parsed.success)
        return reply.code(503).send({
          fallback: true,
          mock: true,
          error:
            "No speech provider configured. Use browser speech, Topics or Type. Demo fixtures must be explicitly selected.",
        });
      const phrases = {
        tablet: "tablet raathiri",
        water: "தண்ணி",
        rasam: "ரசம்",
        table: "table",
        head: "தலை வலி",
        chest: "நெஞ்சு",
        coffee: "coffee",
        meena: "meena ph",
      };
      return {
        text: phrases[parsed.data.fixture],
        lang: parsed.data.lang,
        alternatives: [],
        mock: true,
        provider: "mock",
        fixture: parsed.data.fixture,
      };
    },
  );
  app.post(
    "/api/media/extract",
    { config: limited(10, 3600_000) },
    async (_request, reply) =>
      reply.code(501).send({
        error:
          "Server video extraction is not enabled. Record a phrase in the local Voice Studio.",
      }),
  );
  app.post("/api/voice/isolate", async (_request, reply) =>
    reply.code(501).send({
      error: "Cloud voice isolation is not enabled in the no-key build.",
    }),
  );

  const rooms = new Map<
    string,
    Set<{ socket: WebSocket; role: "patient" | "care"; alive: boolean }>
  >();
  app.post("/api/relay/room", { config: limited(10) }, async () => {
    const roomId = randomUUID();
    return {
      roomId,
      roomGrant: signer.room(roomId, "patient"),
      careGrant: signer.room(roomId, "care"),
    };
  });
  const querySchema = z.object({
    r: z.string().uuid(),
    g: z.string().max(2048),
    role: z.enum(["patient", "care"]),
  });
  app.get(
    "/ws",
    {
      websocket: true,
      config: limited(10),
      preValidation: async (request) => {
        const query = querySchema.parse(request.query);
        try {
          signer.verifyRoom(query.g, query.r, query.role);
        } catch {
          throw new HttpError(403, "Invalid relay grant");
        }
        const sockets = rooms.get(query.r);
        if (
          sockets &&
          ((query.role === "patient" &&
            [...sockets].some((s) => s.role === "patient")) ||
            (query.role === "care" &&
              [...sockets].filter((s) => s.role === "care").length >= 5))
        )
          throw new HttpError(429, "Room is full");
      },
    },
    (socket, request) => {
      const query = querySchema.parse(request.query);
      const sockets =
        rooms.get(query.r) ??
        new Set<{
          socket: WebSocket;
          role: "patient" | "care";
          alive: boolean;
        }>();
      // Re-check seats now: two simultaneous upgrades can both pass preValidation.
      const taken = [...sockets].filter((s) => s.role === query.role).length;
      if (taken >= (query.role === "patient" ? 1 : 5)) {
        socket.close(1008, "Room is full");
        return;
      }
      const entry = { socket, role: query.role, alive: true };
      sockets.add(entry);
      rooms.set(query.r, sockets);
      let messageCount = 0,
        windowStart = Date.now();
      socket.on("pong", () => {
        entry.alive = true;
      });
      socket.on("message", (data, isBinary) => {
        if (Date.now() - windowStart > minute) {
          windowStart = Date.now();
          messageCount = 0;
        }
        if (++messageCount > 120) {
          socket.close(1008, "Message rate limit");
          return;
        }
        const bytes = Buffer.isBuffer(data)
          ? data
          : Array.isArray(data)
            ? Buffer.concat(data)
            : Buffer.from(data);
        if (isBinary || bytes.byteLength > 16 * 1024) {
          socket.close(1009, "Frame too large");
          return;
        }
        try {
          const envelope = RelayEnvelopeSchema.parse(
            JSON.parse(bytes.toString()),
          );
          if (
            Buffer.from(envelope.iv, "base64").length !== 12 ||
            Buffer.from(envelope.ciphertext, "base64").length < 16
          )
            throw new Error("Invalid ciphertext");
          const frame = JSON.stringify(envelope);
          // The transport attests origin by direction: care cannot send to care or masquerade as patient.
          for (const peer of sockets)
            if (
              peer !== entry &&
              peer.role !== entry.role &&
              peer.socket.readyState === 1
            )
              peer.socket.send(frame);
        } catch {
          socket.close(1008, "Invalid encrypted envelope");
        }
      });
      socket.on("close", () => {
        sockets.delete(entry);
        if (!sockets.size) rooms.delete(query.r);
      });
      socket.on("error", () => {
        /* Never log raw ws errors or query grants. */
      });
    },
  );
  const cleanup = setInterval(() => {
    const now = Date.now();
    providerSettings.prune();
    for (const [id, value] of caregiverCounts)
      if (value.expires < now) caregiverCounts.delete(id);
    deletedVoices.prune(now);
    for (const sockets of rooms.values())
      for (const entry of sockets) {
        if (!entry.alive) {
          entry.socket.terminate();
          continue;
        }
        entry.alive = false;
        entry.socket.ping();
      }
  }, 30_000);
  cleanup.unref();
  app.addHook("onClose", async () => {
    clearInterval(cleanup);
    providerSettings.clear();
    for (const sockets of rooms.values())
      for (const entry of sockets) entry.socket.terminate();
    rooms.clear();
  });
  if (config.webRoot) {
    await app.register(staticFiles, { root: config.webRoot, wildcard: false });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Not found" })
        : reply.sendFile("index.html"),
    );
  }
  await app.ready();
  return app;
}
