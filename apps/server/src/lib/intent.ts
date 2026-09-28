import {
  applyCandidatePolicy,
  getMockCandidates,
  generatedSentencesJsonSchema,
  resolveGeneratedSentences,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";
import { ollamaIntent, resolveSelectionResult } from "../providers/ollama.js";
import type { ServerConfig } from "../config.js";
import { generateStructured } from "../providers/cloud.js";
import { contextualPrompt } from "./contextualPrompt.js";

export async function selectIntent(
  context: ContextPacket,
  config: ServerConfig,
  signal?: AbortSignal,
  legacySelector?: typeof ollamaIntent,
  generator: typeof generateStructured = generateStructured,
) {
  // Retained solely for the independent catalog-selection regression/evaluation adapter.
  // Every active non-mock provider uses contextual generation below.
  if (legacySelector)
    return selectCatalogIntent(context, config, signal, legacySelector);
  if (signal?.aborted) throw new Error("Cancelled");
  const start = performance.now();
  const controlled = applyCandidatePolicy(getMockCandidates(context), context);
  if (config.intentProvider === "mock")
    return {
      candidates: controlled.candidates,
      model: "mock-deterministic-v2",
      clarification: controlled.clarification,
      validationDrops: controlled.dropped,
      latencyMs: Math.round(performance.now() - start),
      fallback: false,
    };
  const controller = new AbortController();
  const combined = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const prompt = contextualPrompt(context);
    const budget = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Provider timeout"));
      }, config.timeoutMs);
      onAbort = () => reject(new Error("Cancelled"));
      signal?.addEventListener("abort", onAbort, { once: true });
    });
    const raw = await Promise.race([
      generator(config.intentProvider, {
        model: config.llmModel ?? config.ollamaModel,
        apiKey: config.apiKey,
        ollamaUrl: config.ollamaUrl,
        timeoutMs: config.timeoutMs,
        signal: combined,
        ...prompt,
        schema: generatedSentencesJsonSchema,
      }),
      budget,
    ]);
    if (signal?.aborted) throw new Error("Cancelled");
    const generated = resolveGeneratedSentences(raw, context);
    const final = applyCandidatePolicy(generated.candidates, context, {
      serverGeneratedCandidates: generated.candidates,
    });
    const hasRejectedOutput =
      generated.reasons.length > 0 && final.candidates.length === 0;
    if (hasRejectedOutput)
      return {
        candidates: controlled.candidates,
        model: "catalog-v2 · model suggestions could not be verified",
        clarification: controlled.clarification,
        validationDrops:
          controlled.dropped + generated.reasons.length + final.dropped,
        latencyMs: Math.round(performance.now() - start),
        fallback: true,
      };
    return {
      candidates: final.candidates,
      model: `${config.intentProvider}:${config.llmModel ?? config.ollamaModel} · contextual suggestions`,
      clarification: final.clarification,
      validationDrops: generated.reasons.length + final.dropped,
      latencyMs: Math.round(performance.now() - start),
      fallback: false,
    };
  } catch {
    if (signal?.aborted) throw new Error("Cancelled");
    return {
      candidates: controlled.candidates,
      model: "catalog-v2 · model unavailable",
      clarification: controlled.clarification,
      validationDrops: controlled.dropped,
      latencyMs: Math.round(performance.now() - start),
      fallback: true,
    };
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

async function selectCatalogIntent(
  context: ContextPacket,
  config: ServerConfig,
  signal: AbortSignal | undefined,
  provider: typeof ollamaIntent,
) {
  const start = performance.now(),
    deadline = start + config.timeoutMs;
  const controlled = applyCandidatePolicy(getMockCandidates(context), context);
  let candidates = controlled.candidates,
    model = "mock-deterministic-v2",
    drops = controlled.dropped;
  let clarification = controlled.clarification;
  if (config.intentProvider === "ollama" && candidates.length) {
    const allowed = candidates;
    const options = () => ({
      url: config.ollamaUrl,
      model: config.ollamaModel,
      allowed,
      signal,
      timeoutMs: Math.max(1, Math.floor(deadline - performance.now())),
    });
    try {
      if (signal?.aborted) throw new Error("Cancelled");
      const raw = await provider(context, options());
      const selected = resolveSelectionResult(raw, allowed);
      candidates = selected.candidates;
      drops += selected.reasons.length;
      model = `ollama:${config.ollamaModel} · catalog selection`;
      if (
        selected.reasons.length &&
        deadline - performance.now() > 100 &&
        !signal?.aborted
      ) {
        try {
          const fixed = resolveSelectionResult(
            await provider(context, {
              ...options(),
              correction: { previous: raw, reasons: selected.reasons },
            }),
            allowed,
          );
          // Repair fills missing choices without discarding validated initial meanings.
          candidates = applyCandidatePolicy(
            [...candidates, ...fixed.candidates],
            context,
          ).candidates;
          drops += fixed.reasons.length;
        } catch {
          /* Retain the initial valid candidates. No patient content is logged. */
        }
      }
    } catch {
      if (signal?.aborted) throw new Error("Cancelled");
      // The catalog is already validated and useful without a language model.
      candidates = allowed;
      model = "catalog-v2 · local model unavailable";
    }
    const final = applyCandidatePolicy(candidates, context);
    candidates = final.candidates;
    clarification = final.clarification;
    drops += final.dropped;
  } else if (config.intentProvider === "ollama")
    model = "catalog-v2 · clarification";
  if (signal?.aborted) throw new Error("Cancelled");
  return {
    candidates: candidates as Candidate[],
    model,
    clarification,
    validationDrops: drops,
    latencyMs: Math.round(performance.now() - start),
    fallback: model.includes("unavailable"),
  };
}
