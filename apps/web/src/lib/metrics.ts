import type { Attempt } from "@sollu/shared";
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
  return {
    total: attempts.length,
    spoken: spoken.length,
    struggles: attempts.filter(isStruggle).length,
    none: attempts.reduce(
      (n, a) => n + a.rounds.filter((r) => r.noneOfThese).length,
      0,
    ),
    success: attempts.length ? spoken.length / attempts.length : 0,
    medianTaps: median(spoken.map((a) => a.taps)),
    medianSeconds: median(spoken.map((a) => (a.timeToSpeechMs ?? 0) / 1000)),
    firstRound: spoken.length
      ? spoken.filter((a) => a.rounds[0]?.chosenIndex !== undefined).length /
        spoken.length
      : 0,
  };
}
const escapeCell = (v: unknown) =>
  `"${String(v ?? "")
    .replace(/^[=+@\-\t\r]/, " $&")
    .replaceAll('"', '""')}"`;
export function attemptsCsv(attempts: Attempt[], study = true): string {
  const keys = [
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
  ];
  const rows = attempts.map((a) => [
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
  ]);
  return (
    "\uFEFF" +
    [keys, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")
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
