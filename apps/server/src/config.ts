import { randomBytes } from "node:crypto";

export type ServerConfig = {
  secret: string;
  port: number;
  host: string;
  origin: string;
  intentProvider: "mock" | "ollama";
  ollamaUrl: string;
  ollamaModel: string;
  timeoutMs: number;
  accessCode: string;
  logging: boolean;
  production: boolean;
  webRoot?: string;
};
export function configFromEnv(): ServerConfig {
  const production = process.env.NODE_ENV === "production";
  if (
    production &&
    (!process.env.SERVER_SECRET ||
      Buffer.byteLength(process.env.SERVER_SECRET) < 32)
  )
    throw new Error(
      "Set SERVER_SECRET to at least 32 random bytes for production",
    );
  const intentProvider =
    process.env.MOCK_PROVIDERS === "1"
      ? "mock"
      : process.env.LLM_PROVIDER === "ollama"
        ? "ollama"
        : "mock";
  const accessCode = process.env.ACCESS_CODE ?? "";
  if (production && !accessCode)
    throw new Error("Set ACCESS_CODE for a shared production server");
  const ollamaUrl =
    process.env.OLLAMA_BASE_URL ??
    process.env.OLLAMA_URL ??
    "http://127.0.0.1:11434";
  const url = new URL(ollamaUrl);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("OLLAMA_URL must be a local loopback address");
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma3:4b";
  if (/cloud|[:/]latest-cloud/i.test(ollamaModel))
    throw new Error(
      "Cloud Ollama models are disabled; choose a downloaded local model",
    );
  return {
    secret: process.env.SERVER_SECRET || randomBytes(48).toString("base64url"),
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? "127.0.0.1",
    origin: process.env.PUBLIC_ORIGIN ?? "http://localhost:5173",
    intentProvider,
    ollamaUrl,
    ollamaModel,
    timeoutMs: Math.max(
      1000,
      Math.min(Number(process.env.LLM_TIMEOUT_MS ?? 8000), 30000),
    ),
    accessCode,
    logging: true,
    production,
    webRoot: process.env.WEB_ROOT,
  };
}
