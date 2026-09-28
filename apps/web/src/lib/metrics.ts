import type { Attempt } from "@sollu/shared";
import { COMMUNICATION_LOG_INTERPRETATION } from "../features/rehab/reportScope";
export function median(values: number[]): number {
  const n = [...values].sort((a, b) => a - b);
  return n.length
    ? n.length % 2
      ? n[Math.floor(n.length / 2)]
      : (n[n.length / 2 - 1] + n[n.length / 2]) / 2
    : 0;
}
export function isStruggle(a: Attempt) {
  return (
    a.rounds.some((r) => r.noneOfThese) ||
    a.sttRetries > 0 ||
    a.outcome !== "spoken" ||
    (a.timeToSpeechMs ?? 0) > 30000
  );
}
export function metrics(attempts: Attempt[]) {
  const spoken = attempts.filter((a) => a.outcome === "spoken");
  const measuredSeconds = spoken
    .map((a) => a.timeToSpeechMs)
    .filter(
      (value): value is number =>
        value !== undefined && Number.isFinite(value) && value >= 0,
    )
    .map((value) => value / 1000);
  return {
    total: attempts.length,
    spoken: spoken.length,
    struggles: attempts.filter(isStruggle).length,
    none: attempts.reduce(
      (n, a) => n + a.rounds.filter((r) => r.noneOfThese).length,
      0,
    ),
    // Legacy API name: this is audio-start frequency, never clinical success.
    success: attempts.length ? spoken.length / attempts.length : 0,
    medianTaps: median(spoken.map((a) => a.taps)),
    medianSeconds: measuredSeconds.length ? median(measuredSeconds) : null,
    measuredTimeCount: measuredSeconds.length,
    missingTimeCount: spoken.length - measuredSeconds.length,
    firstRound: spoken.length
      ? spoken.filter((a) => a.rounds[0]?.chosenIndex !== undefined).length /
        spoken.length
      : 0,
  };
}
const escapeCell = (v: unknown) =>
  `"${String(v ?? "")
    .replace(/^[\s]*[=+@-]/u, " '$&")
    .replaceAll('"', '""')}"`;
export function attemptsCsv(attempts: Attempt[], study = true): string {
  const keys = [
    "record_type",
    "participant",
    "date",
    "input",
    "language",
    "outcome",
    "taps",
    "seconds",
    "none_count",
    "demo",
    "cached",
    "communication_outcome",
    "partner_understanding",
    "report_title",
    "intended_use",
    "validation_limitations",
    "timing_definitions",
    "outcome_definitions",
    "coverage_limitations",
  ];
  const scope = Object.values(COMMUNICATION_LOG_INTERPRETATION);
  const rows = attempts.map((a) => [
    "communication_attempt",
    "participant-001",
    new Date(a.startedAt).toISOString(),
    study ? "" : a.fragmentRaw,
    a.outputLang,
    a.outcome,
    a.taps,
    a.timeToSpeechMs === undefined ? "" : a.timeToSpeechMs / 1000,
    a.rounds.filter((r) => r.noneOfThese).length,
    a.demoClock,
    a.demoCached,
    a.communicationOutcome ?? "unconfirmed",
    study ? "" : (a.partnerUnderstanding ?? ""),
    ...scope.map(() => ""),
  ]);
  const metadata = [
    "report_metadata",
    ...Array.from({ length: keys.length - scope.length - 1 }, () => ""),
    ...scope,
  ];
  return (
    "\uFEFF" +
    [keys, metadata, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n")
  );
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
