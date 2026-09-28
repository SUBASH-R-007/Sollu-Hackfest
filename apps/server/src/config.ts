import { randomBytes } from "node:crypto";

export const llmProviders = [
  "mock",
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "ollama",
] as const;
export type LlmProvider = (typeof llmProviders)[number];
export type CloudProvider = Exclude<LlmProvider, "mock" | "ollama">;
export const defaultModels: Record<LlmProvider, string> = {
  mock: "catalog-v2",
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.5-flash",
  groq: "openai/gpt-oss-20b",
  ollama: "gemma3:4b",
};
export const isCloudProvider = (
  provider: LlmProvider,
): provider is CloudProvider => provider !== "mock" && provider !== "ollama";

export function validateLocalOllamaUrl(value: string): URL {
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "OLLAMA_URL must be a local loopback address without credentials",
    );
  return url;
}
export function validateModel(provider: LlmProvider, model: string): string {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,119}$/.test(model) ||
    model.includes("..") ||
    model.includes("://")
  )
    throw new Error("Invalid model ID");
  if (provider === "ollama" && /cloud/i.test(model))
    throw new Error(
      "Cloud Ollama models are disabled; choose a downloaded local model",
    );
  return model;
}

export type ServerConfig = {
  secret: string;
  port: number;
  host: string;
  origin: string;
  intentProvider: LlmProvider;
  llmModel?: string;
  apiKey?: string;
  apiKeys?: Partial<Record<CloudProvider, string>>;
  revision?: number;
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
  const envProvider = process.env.LLM_PROVIDER ?? "mock";
  const intentProvider: LlmProvider =
    process.env.MOCK_PROVIDERS === "1"
      ? "mock"
      : llmProviders.includes(envProvider as LlmProvider)
        ? (envProvider as LlmProvider)
        : "mock";
  const accessCode = process.env.ACCESS_CODE ?? "";
  if (production && !accessCode)
    throw new Error("Set ACCESS_CODE for a shared production server");
  const ollamaUrl =
    process.env.OLLAMA_BASE_URL ??
    process.env.OLLAMA_URL ??
    "http://127.0.0.1:11434";
  validateLocalOllamaUrl(ollamaUrl);
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma3:4b";
  validateModel("ollama", ollamaModel);
  const timeout = Number(process.env.LLM_TIMEOUT_MS ?? 8000);
  return {
    secret: process.env.SERVER_SECRET || randomBytes(48).toString("base64url"),
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? "127.0.0.1",
    origin: process.env.PUBLIC_ORIGIN ?? "http://localhost:5173",
    intentProvider,
    llmModel: validateModel(
      intentProvider,
      intentProvider === "ollama"
        ? ollamaModel
        : intentProvider === "mock"
          ? defaultModels.mock
          : process.env.LLM_MODEL || defaultModels[intentProvider],
    ),
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      groq: process.env.GROQ_API_KEY,
    },
    ollamaUrl,
    ollamaModel,
    timeoutMs: Math.max(
      1000,
      Math.min(Number.isFinite(timeout) ? Math.floor(timeout) : 8000, 30000),
    ),
    accessCode,
    logging: true,
    production,
    webRoot: process.env.WEB_ROOT,
  };
}
