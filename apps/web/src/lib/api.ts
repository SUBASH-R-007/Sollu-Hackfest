import {
  CandidateSchema,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";
import { getKV, setKV, type Settings } from "../db";
import { inferenceContext } from "./context";
import { cloudSentencePermission } from "../features/privacy/sentencePolicy";
import { cloudTranscriptionPermission } from "../features/privacy/transcriptionPolicy";
type Device = { deviceId: string; token: string };
let devicePromise: Promise<Device> | undefined;
async function register(): Promise<Device> {
  const stored = await getKV<Device>("device");
  if (stored) return stored;
  const res = await fetch("/api/device/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessCode: (await getKV<string>("accessCode")) ?? "",
    }),
  });
  if (!res.ok)
    throw new Error(
      res.status === 401
        ? "Enter the server access code in Settings."
        : "The local server is unavailable.",
    );
  const device = (await res.json()) as Device;
  await setKV("device", device);
  return device;
}
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method = "POST",
  retry = true,
): Promise<T> {
  devicePromise ??= register().catch((e) => {
    devicePromise = undefined;
    throw e;
  });
  const device = await devicePromise;
  signal?.throwIfAborted();
  // Registration can yield while another tab revokes sharing permission.
  // Recheck at the actual dispatch boundary, never weaken the request flag.
  if (
    path === "llm/settings" &&
    method === "POST" &&
    body &&
    typeof body === "object"
  ) {
    const update = body as { provider?: string; removeKey?: boolean };
    if (
      ["openai", "anthropic", "gemini", "groq"].includes(
        update.provider ?? "",
      ) &&
      !update.removeKey &&
      !cloudSentencePermission()
    )
      throw new Error(
        "Allow cloud sentence APIs in Sentence engine settings before saving a cloud provider.",
      );
  }
  const guardedBody =
    (path === "intent" || path === "llm/test") &&
    body &&
    typeof body === "object"
      ? {
          ...body,
          localOnly:
            (body as { localOnly?: unknown }).localOnly !== false ||
            !cloudSentencePermission(),
        }
      : body;
  const res = await fetch(`/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${device.token}`,
    },
    body: guardedBody === undefined ? undefined : JSON.stringify(guardedBody),
    signal,
  });
  if (res.status === 401 && retry) {
    devicePromise = undefined;
    await setKV("device", null);
    return api(path, body, signal, method, false);
  }
  if (!res.ok)
    throw new Error(
      res.status === 429
        ? "A little pause — please try again."
        : res.status === 503
          ? "The sentence service is unavailable. Use My phrases or Topics."
          : "This action could not finish. Please try again.",
    );
  return (await res.json()) as T;
}
export type SentenceEngine =
  "mock" | "openai" | "anthropic" | "gemini" | "groq" | "ollama";
/** Why the AI engine could not answer (from status codes, never provider text). */
export type EngineFailureDetail =
  | "timeout"
  | "key"
  | "model"
  | "quota"
  | "provider"
  | "network"
  | "invalid-output";
export type EngineFailure =
  | "unavailable"
  | "unverified"
  | "device-permission"
  | "engine-reset"
  | "clarify";
const engines: readonly string[] = [
  "mock",
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "ollama",
];
const engineHintKey = "sentence-engine-hint";
let engineHint: SentenceEngine | undefined;
const engineHintLoaded = getKV<string>(engineHintKey)
  .then((value) => {
    if (engineHint === undefined && engines.includes(value ?? ""))
      engineHint = value as SentenceEngine;
  })
  .catch(() => {});
/** The engine a caregiver last chose explicitly on this device. The server
 * keeps selections in memory, so this detects a silent reset after restart. */
export async function selectedSentenceEngine(): Promise<
  SentenceEngine | undefined
> {
  await engineHintLoaded;
  return engineHint;
}
export function rememberSentenceEngine(provider: string) {
  if (!engines.includes(provider)) return;
  engineHint = provider as SentenceEngine;
  void setKV(engineHintKey, provider).catch(() => {});
}
export const getIntent = async (
  context: ContextPacket,
  settings: Settings,
  signal?: AbortSignal,
) => {
  const result = await api<{
    candidates: Candidate[];
    model: string;
    latencyMs: number;
    mock?: boolean;
    fallback?: boolean;
    failure?: EngineFailure;
    failureDetail?: EngineFailureDetail;
    timeoutMs?: number;
    requestedProvider?: string;
  }>(
    "intent",
    {
      context: inferenceContext(context, settings),
      localOnly:
        !cloudSentencePermission() ||
        (settings.localProcessingOnly !== false &&
          !cloudSentencePermission(true)),
      preparedAlternatives: settings.mixPreparedWithAi === true,
    },
    signal,
  );
  if (
    !Array.isArray(result.candidates) ||
    result.candidates.length > 3 ||
    typeof result.model !== "string" ||
    !Number.isFinite(result.latencyMs)
  )
    throw new Error("Invalid sentence response");
  return {
    ...result,
    candidates: result.candidates.map((c) => CandidateSchema.parse(c)),
  };
};
export async function health(): Promise<{
  mode?: string;
  providers?: unknown;
  mock?: boolean;
}> {
  const res = await fetch("/api/health");
  return res.json();
}

export function transcriptionStatus() {
  return api<{ available: boolean; reason?: string; model: string }>(
    "transcribe/status",
    undefined,
    undefined,
    "GET",
  );
}
/**
 * Sends one finished recording for high-accuracy transcription. Permission is
 * rechecked at dispatch, because it can be revoked while the person records.
 */
export async function transcribeRecording(
  audio: Blob,
  lang: "ta" | "en",
  signal?: AbortSignal,
): Promise<string> {
  const blocked = () =>
    new Error(
      "High-accuracy transcription is off on this device. Use on-device speech or type.",
    );
  if (!cloudTranscriptionPermission()) throw blocked();
  devicePromise ??= register().catch((e) => {
    devicePromise = undefined;
    throw e;
  });
  const device = await devicePromise;
  signal?.throwIfAborted();
  if (!cloudTranscriptionPermission()) throw blocked();
  const form = new FormData();
  form.append("lang", lang);
  form.append("localOnly", "false");
  form.append("file", audio, "speech.webm");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${device.token}` },
    body: form,
    signal,
  });
  if (res.status === 401) {
    devicePromise = undefined;
    await setKV("device", null);
    throw new Error("Please try again.");
  }
  if (!res.ok)
    throw new Error(
      res.status === 403
        ? "High-accuracy transcription is blocked by privacy settings."
        : res.status === 429
          ? "A little pause — please try again."
          : "High-accuracy transcription is unavailable. Use on-device speech or type.",
    );
  const data = (await res.json()) as { text?: unknown };
  if (typeof data.text !== "string" || data.text.length > 5000)
    throw new Error("Invalid transcription response");
  return data.text;
}
