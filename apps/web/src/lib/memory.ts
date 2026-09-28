import type { Attempt, Candidate } from "@sollu/shared";
import { normalize } from "./context";

/** Approval belongs to the captured scene, never mutable settings at playback completion. */
export async function memoryIdentity(
  attempt: Attempt,
  candidate: Candidate,
): Promise<string> {
  const scene = JSON.stringify([
    attempt.outputLang,
    normalize(attempt.fragmentRaw),
    normalize(candidate.text),
    attempt.place,
    attempt.addresseeId ?? "",
    attempt.timeBucket,
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(scene),
  );
  return `memory:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
