import {
  applyCandidatePolicy,
  getMockCandidates,
  type Candidate,
  type ContextPacket,
} from "@sollu/shared";
import { ollamaIntent, resolveSelectionResult } from "../providers/ollama.js";
import type { ServerConfig } from "../config.js";

export async function selectIntent(
  context: ContextPacket,
  config: ServerConfig,
  signal?: AbortSignal,
  provider = ollamaIntent,
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
  };
}
