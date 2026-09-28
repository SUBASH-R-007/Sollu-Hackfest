import {
  applyCandidatePolicy,
  normalizeCandidateText,
  type ContextPacket,
  type CandidatePolicyOptions,
} from "@sollu/shared";

export const normalise = normalizeCandidateText;
/** Server and browser deliberately share the exact same post-merge policy. */
export function validateCandidates(
  input: unknown,
  context: ContextPacket,
  options: CandidatePolicyOptions = {},
) {
  return applyCandidatePolicy(input, context, options);
}
