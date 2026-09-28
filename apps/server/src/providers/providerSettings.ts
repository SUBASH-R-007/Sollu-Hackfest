import { z } from "zod";
import {
  defaultModels,
  isCloudProvider,
  llmProviders,
  validateModel,
  type CloudProvider,
  type LlmProvider,
  type ServerConfig,
} from "../config.js";

export const providerSettingsUpdate = z
  .object({
    provider: z.enum(llmProviders),
    model: z.string().trim().min(1).max(120).optional(),
    timeoutMs: z.number().int().min(1000).max(30_000).optional(),
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .regex(/^[\x21-\x7e]+$/)
      .optional(),
    removeKey: z.boolean().optional(),
    cloudConsent: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      isCloudProvider(value.provider) &&
      !value.removeKey &&
      value.cloudConsent !== true
    )
      context.addIssue({
        code: "custom",
        message: "Cloud sharing permission is required",
      });
    if ((value.apiKey || value.removeKey) && !isCloudProvider(value.provider))
      context.addIssue({
        code: "custom",
        message: "This provider uses no API key",
      });
    if (value.apiKey && value.removeKey)
      context.addIssue({
        code: "custom",
        message: "Choose a new key or remove the saved key",
      });
    try {
      if (value.model) validateModel(value.provider, value.model);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid model ID" });
    }
  });
type SessionSettings = {
  provider: LlmProvider;
  model: string;
  timeoutMs: number;
  cloudConsent: boolean;
  revision: number;
  expiresAt: number;
  keys: Partial<Record<CloudProvider, string>>;
};
const labels: Record<LlmProvider, string> = {
  mock: "Free vocabulary",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
  groq: "Groq",
  ollama: "Ollama (local)",
};
export const providerSessionTtlMs = 12 * 60 * 60 * 1000;

/** Device-token ownership scopes credentials. The caregiver PIN is a local UI lock. */
export class ProviderSettingsStore {
  private readonly sessions = new Map<string, SessionSettings>();
  private revision = 0;
  constructor(
    private readonly config: ServerConfig,
    private readonly now = Date.now,
    private readonly maxSessions = 1000,
  ) {}
  private model(provider: LlmProvider) {
    return provider === this.config.intentProvider && this.config.llmModel
      ? this.config.llmModel
      : provider === "ollama"
        ? this.config.ollamaModel
        : defaultModels[provider];
  }
  private defaults(): SessionSettings {
    // Even an environment cloud default waits for this device's explicit sharing permission.
    const provider = isCloudProvider(this.config.intentProvider)
      ? "mock"
      : this.config.intentProvider;
    return {
      provider,
      model: this.model(provider),
      timeoutMs: this.config.timeoutMs,
      cloudConsent: false,
      revision: 0,
      expiresAt: 0,
      keys: {},
    };
  }
  private read(deviceId: string): SessionSettings {
    this.prune();
    const saved = this.sessions.get(deviceId);
    if (!saved) return this.defaults();
    saved.expiresAt = this.now() + providerSessionTtlMs;
    return saved;
  }
  private environmentKey(provider: CloudProvider) {
    return (
      this.config.apiKeys?.[provider] ??
      (provider === this.config.intentProvider ? this.config.apiKey : undefined)
    );
  }
  resolve(deviceId: string): ServerConfig {
    const state = this.read(deviceId);
    return {
      ...this.config,
      intentProvider: state.provider,
      llmModel: state.model,
      ollamaModel:
        state.provider === "ollama" ? state.model : this.config.ollamaModel,
      timeoutMs: state.timeoutMs,
      revision: state.revision,
      apiKey: isCloudProvider(state.provider)
        ? (state.keys[state.provider] ?? this.environmentKey(state.provider))
        : undefined,
    };
  }
  view(deviceId: string) {
    const state = this.read(deviceId);
    return {
      provider: state.provider,
      model: state.model,
      timeoutMs: state.timeoutMs,
      revision: state.revision,
      cloudConsent: state.cloudConsent,
      sessionExpiresAt: state.expiresAt || undefined,
      providers: llmProviders.map((id) => {
        const sessionKey = isCloudProvider(id) ? state.keys[id] : undefined;
        const environmentKey = isCloudProvider(id)
          ? this.environmentKey(id)
          : undefined;
        return {
          id,
          label: labels[id],
          defaultModel: this.model(id),
          requiresKey: isCloudProvider(id),
          keyConfigured: Boolean(sessionKey || environmentKey),
          keySource: sessionKey
            ? ("session" as const)
            : environmentKey
              ? ("environment" as const)
              : ("none" as const),
        };
      }),
    };
  }
  update(deviceId: string, input: unknown) {
    const update = providerSettingsUpdate.parse(input);
    const old = this.read(deviceId);
    const keys = { ...old.keys };
    if (isCloudProvider(update.provider)) {
      if (update.removeKey) delete keys[update.provider];
      if (update.apiKey) keys[update.provider] = update.apiKey;
    }
    if (
      !this.sessions.has(deviceId) &&
      this.sessions.size >= this.maxSessions
    ) {
      const oldest = [...this.sessions].sort(
        (a, b) => a[1].expiresAt - b[1].expiresAt,
      )[0];
      if (oldest) this.sessions.delete(oldest[0]);
    }
    this.sessions.set(deviceId, {
      provider: update.removeKey ? old.provider : update.provider,
      model: update.removeKey
        ? old.model
        : (update.model ??
          (old.provider === update.provider
            ? old.model
            : this.model(update.provider))),
      timeoutMs: update.removeKey
        ? old.timeoutMs
        : (update.timeoutMs ?? old.timeoutMs),
      cloudConsent: update.removeKey
        ? old.cloudConsent
        : isCloudProvider(update.provider) && update.cloudConsent === true,
      revision: ++this.revision,
      keys,
      expiresAt: this.now() + providerSessionTtlMs,
    });
    return this.view(deviceId);
  }
  prune() {
    const now = this.now();
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) this.sessions.delete(id);
  }
  clear() {
    this.sessions.clear();
  }
}
