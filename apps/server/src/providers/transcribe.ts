import { z } from "zod";
import { assertProviderAllowed, validateModel } from "../config.js";
import { boundedJson } from "./cloud.js";

/** Default high-accuracy speech-to-text model; override with OPENAI_TRANSCRIBE_MODEL. */
export const defaultTranscribeModel = "gpt-4o-transcribe";
/** OpenAI's documented upload limit is 25 MB; clips here are far smaller. */
export const maxTranscribeBytes = 25 * 1024 * 1024;
export const transcribeMimeTypes = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
] as const;
const extensions: Record<(typeof transcribeMimeTypes)[number], string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

export type TranscribeOptions = {
  allowCloudAI?: boolean;
  apiKey?: string;
  model: string;
  audio: Buffer;
  mimeType: (typeof transcribeMimeTypes)[number];
  language: "ta" | "en";
  timeoutMs: number;
  signal?: AbortSignal;
};

/**
 * One stateless transcription request. The audio buffer lives only in memory
 * for this call (never written, logged or cached) and no provider history is
 * kept by this app. Provider retention terms still apply (docs/PROVIDERS.md).
 */
export async function transcribeAudio(
  options: TranscribeOptions,
): Promise<string> {
  assertProviderAllowed("openai", options.allowCloudAI);
  validateModel("openai", options.model);
  if (!options.apiKey || !/^[\x21-\x7e]{1,4096}$/.test(options.apiKey))
    throw new Error("Transcription key is not configured");
  if (
    options.audio.byteLength === 0 ||
    options.audio.byteLength > maxTranscribeBytes
  )
    throw new Error("Audio size is outside the supported range");
  const signal = AbortSignal.any([
    AbortSignal.timeout(Math.max(1, Math.min(60_000, options.timeoutMs))),
    ...(options.signal ? [options.signal] : []),
  ]);
  signal.throwIfAborted();
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(options.audio)], { type: options.mimeType }),
    `speech.${extensions[options.mimeType]}`,
  );
  form.append("model", options.model);
  // ISO-639-1 hint; improves accuracy for Tamil and English speech.
  form.append("language", options.language);
  form.append("response_format", "json");
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}` },
      body: form,
      signal,
      redirect: "error",
    },
  );
  const data = await boundedJson(response);
  signal.throwIfAborted();
  return z
    .object({ text: z.string().max(5000) })
    .parse(data)
    .text.trim();
}
