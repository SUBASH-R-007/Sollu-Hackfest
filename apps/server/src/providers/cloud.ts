import { z } from "zod";
import {
  validateLocalOllamaUrl,
  validateModel,
  type LlmProvider,
} from "../config.js";

export type StructuredOptions = {
  model: string;
  apiKey?: string;
  ollamaUrl?: string;
  timeoutMs: number;
  signal?: AbortSignal;
  system: string;
  user: string;
  schema: Record<string, unknown>;
};
const maxResponseBytes = 96 * 1024;
const text = z.string().min(1).max(32_000);

// Anthropic rejects numeric/string bounds in raw schemas. Local validation remains mandatory.
function anthropicSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(anthropicSchema);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, child]) =>
          ![
            "minimum",
            "maximum",
            "multipleOf",
            "minLength",
            "maxLength",
            "maxItems",
          ].includes(key) &&
          !(key === "minItems" && child !== 0 && child !== 1),
      )
      .map(([key, child]) => [key, anthropicSchema(child)]),
  );
}
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Language provider request failed");
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > maxResponseBytes || !response.body) {
    await response.body?.cancel();
    throw new Error("Language provider response unavailable");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maxResponseBytes) {
        await reader.cancel();
        throw new Error("Language provider response too large");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

/** Stateless request: no provider history IDs, content logging, automatic retries or audio. */
export async function generateStructured(
  provider: Exclude<LlmProvider, "mock">,
  options: StructuredOptions,
): Promise<unknown> {
  validateModel(provider, options.model);
  if (
    provider !== "ollama" &&
    (!options.apiKey || !/^[\x21-\x7e]{1,4096}$/.test(options.apiKey))
  )
    throw new Error("Language provider key is not configured");
  const timeoutMs = Math.max(
    1,
    Math.min(30_000, Math.floor(options.timeoutMs)),
  );
  const signal = AbortSignal.any([
    AbortSignal.timeout(timeoutMs),
    ...(options.signal ? [options.signal] : []),
  ]);
  signal.throwIfAborted();
  let url: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: Record<string, unknown>;
  const messages = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ];
  if (provider === "openai") {
    url = "https://api.openai.com/v1/responses";
    headers.Authorization = `Bearer ${options.apiKey}`;
    body = {
      model: options.model,
      store: false,
      instructions: options.system,
      input: options.user,
      max_output_tokens: 2048,
      text: {
        format: {
          type: "json_schema",
          name: "sollu_response",
          strict: true,
          schema: options.schema,
        },
      },
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = options.apiKey!;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: options.model,
      max_tokens: 2048,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
      output_config: {
        format: {
          type: "json_schema",
          schema: anthropicSchema(options.schema),
        },
      },
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent`;
    headers["x-goog-api-key"] = options.apiKey!;
    body = {
      store: false,
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.user }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseJsonSchema: options.schema,
        ...(options.model.startsWith("gemini-2.5-flash")
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    };
  } else if (provider === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    headers.Authorization = `Bearer ${options.apiKey}`;
    body = {
      model: options.model,
      messages,
      stream: false,
      max_completion_tokens: 2048,
      ...(options.model.startsWith("openai/gpt-oss-")
        ? { reasoning_effort: "low" }
        : {}),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sollu_response",
          strict: true,
          schema: options.schema,
        },
      },
    };
  } else {
    url = new URL(
      "/api/chat",
      validateLocalOllamaUrl(options.ollamaUrl ?? "http://127.0.0.1:11434"),
    ).toString();
    body = {
      model: options.model,
      messages,
      stream: false,
      think: false,
      format: options.schema,
      options: { temperature: 0, num_predict: 2048 },
    };
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    signal,
    redirect: "error",
    body: JSON.stringify(body),
  });
  const data = await boundedJson(response);
  signal.throwIfAborted();
  let json: string;
  if (provider === "openai") {
    const parsed = z
      .object({
        status: z.literal("completed"),
        output: z.array(
          z.object({
            type: z.string(),
            content: z
              .array(
                z.object({ type: z.string(), text: z.string().optional() }),
              )
              .optional(),
          }),
        ),
      })
      .parse(data);
    const parts = parsed.output.flatMap((item) =>
      item.type === "message" ? (item.content ?? []) : [],
    );
    if (parts.some((part) => part.type === "refusal"))
      throw new Error("Language provider declined");
    json = text.parse(
      parts
        .filter((part) => part.type === "output_text")
        .map((part) => part.text ?? "")
        .join(""),
    );
  } else if (provider === "anthropic") {
    const parsed = z
      .object({
        stop_reason: z.literal("end_turn"),
        content: z.array(
          z.object({ type: z.string(), text: z.string().optional() }),
        ),
      })
      .parse(data);
    json = text.parse(
      parsed.content
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join(""),
    );
  } else if (provider === "gemini") {
    const parsed = z
      .object({
        candidates: z
          .array(
            z.object({
              finishReason: z.literal("STOP"),
              content: z.object({
                parts: z.array(
                  z.object({
                    text: z.string().optional(),
                    thought: z.boolean().optional(),
                  }),
                ),
              }),
            }),
          )
          .min(1),
      })
      .parse(data);
    json = text.parse(
      parsed.candidates[0].content.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join(""),
    );
  } else if (provider === "groq") {
    const parsed = z
      .object({
        choices: z
          .array(
            z.object({
              finish_reason: z.literal("stop"),
              message: z.object({
                content: text,
                refusal: z.string().nullable().optional(),
              }),
            }),
          )
          .min(1),
      })
      .parse(data);
    if (parsed.choices[0].message.refusal)
      throw new Error("Language provider declined");
    json = parsed.choices[0].message.content;
  } else {
    const parsed = z
      .object({
        done: z.literal(true),
        done_reason: z.literal("stop").optional(),
        message: z.object({ content: text }),
      })
      .parse(data);
    json = parsed.message.content;
  }
  return JSON.parse(json) as unknown;
}
