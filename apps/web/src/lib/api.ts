import {
  CandidateSchema,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";
import { getKV, setKV, type Settings } from "../db";
import { inferenceContext } from "./context";
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
  const res = await fetch(`/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${device.token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  }>("intent", { context: inferenceContext(context, settings) }, signal);
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
