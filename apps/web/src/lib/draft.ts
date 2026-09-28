import { z } from "zod";
import {
  AttemptSchema,
  CandidateSchema,
  ContextPacketSchema,
} from "@sollu/shared";
import type { Session } from "../state";

const StoredDraftSchema = z.object({
  attempt: AttemptSchema,
  context: ContextPacketSchema,
  candidates: z.array(CandidateSchema).max(3),
  chosen: CandidateSchema.optional(),
  model: z.string().max(200).optional(),
});
/** Restoring input never restores playback authority or stale suggested sentences. */
export function parseStoredDraft(
  value: unknown,
  now = Date.now(),
): Session | null {
  const p = StoredDraftSchema.safeParse(value);
  if (!p.success) return null;
  const { attempt, context } = p.data;
  if (
    attempt.endedAt !== undefined ||
    !Number.isFinite(attempt.startedAt) ||
    attempt.startedAt > now ||
    now - attempt.startedAt >= 86400000 ||
    attempt.rounds.length > 20 ||
    attempt.fragmentRaw.length > 500
  )
    return null;
  return {
    attempt,
    context,
    candidates: [],
    loading: false,
    error: "",
    model: "",
    audioStatus: "",
    source: "",
    delivery: "",
  };
}
