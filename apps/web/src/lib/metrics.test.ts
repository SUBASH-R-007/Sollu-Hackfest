import { describe, expect, it } from "vitest";
import type { Attempt } from "@sollu/shared";
import { attemptsCsv, isStruggle, median, metrics } from "./metrics";
import { COMMUNICATION_LOG_INTERPRETATION } from "../features/rehab/reportScope";

const attempt = (id: string, patch: Partial<Attempt> = {}): Attempt => ({
  id,
  startedAt: Date.UTC(2026, 8, 27, 12),
  endedAt: Date.UTC(2026, 8, 27, 12, 0, 10),
  outcome: "spoken",
  modality: "text",
  fragmentRaw: "water",
  sttRetries: 0,
  outputLang: "en",
  place: "home",
  timeBucket: "midday",
  demoClock: false,
  rounds: [
    {
      round: 1,
      source: "mock",
      latencyMs: 5,
      candidates: [],
      chosenIndex: 0,
      noneOfThese: false,
      usualShown: false,
      usualChosen: false,
    },
  ],
  taps: 2,
  timeToSpeechMs: 10000,
  offline: false,
  demoCached: false,
  ...patch,
});
describe("communication metrics", () => {
  it("computes hand-checked medians without mutating the input", () => {
    const v = [9, 1, 3, 5];
    expect(median(v)).toBe(4);
    expect(v).toEqual([9, 1, 3, 5]);
    expect(median([9, 1, 3])).toBe(3);
    expect(median([])).toBe(0);
  });
  it("uses audio-start denominators and measures application flags separately", () => {
    const a = attempt("a");
    const b = attempt("b", {
      taps: 4,
      timeToSpeechMs: 20000,
      rounds: [
        { ...a.rounds[0], chosenIndex: undefined, noneOfThese: true },
        { ...a.rounds[0], round: 2, chosenIndex: 1 },
      ],
    });
    const c = attempt("c", {
      outcome: "abandoned",
      taps: 7,
      timeToSpeechMs: undefined,
      rounds: [],
    });
    const d = attempt("d", { taps: 8, timeToSpeechMs: 40000, sttRetries: 1 });
    expect(metrics([a, b, c, d])).toEqual({
      total: 4,
      spoken: 3,
      struggles: 3,
      none: 1,
      success: 0.75,
      medianTaps: 4,
      medianSeconds: 20,
      measuredTimeCount: 3,
      missingTimeCount: 0,
      firstRound: 2 / 3,
    });
    expect(isStruggle(a)).toBe(false);
    expect(isStruggle(b)).toBe(true);
    expect(isStruggle(attempt("exact", { timeToSpeechMs: 30000 }))).toBe(false);
    expect(isStruggle(attempt("over", { timeToSpeechMs: 30001 }))).toBe(true);
  });
  it("never substitutes zero for a missing audio-start time and preserves measured zero", () => {
    expect(
      metrics([
        attempt("measured", { timeToSpeechMs: 8000 }),
        attempt("missing", { timeToSpeechMs: undefined }),
        attempt("left", { outcome: "abandoned", timeToSpeechMs: 0 }),
      ]),
    ).toMatchObject({
      medianSeconds: 8,
      measuredTimeCount: 1,
      missingTimeCount: 1,
    });
    expect(
      metrics([attempt("missing", { timeToSpeechMs: undefined })]),
    ).toMatchObject({
      medianSeconds: null,
      measuredTimeCount: 0,
      missingTimeCount: 1,
    });
    expect(metrics([attempt("zero", { timeToSpeechMs: 0 })])).toMatchObject({
      medianSeconds: 0,
      measuredTimeCount: 1,
      missingTimeCount: 0,
    });
    expect(
      metrics([
        attempt("invalid", { timeToSpeechMs: Number.NaN }),
        attempt("negative", { timeToSpeechMs: -100 }),
      ]),
    ).toMatchObject({
      medianSeconds: null,
      measuredTimeCount: 0,
      missingTimeCount: 2,
    });
  });
  it("retains scope in empty CSV exports and separates metadata from observations", () => {
    const empty = attemptsCsv([]);
    expect(empty).toContain(COMMUNICATION_LOG_INTERPRETATION.purpose);
    expect(empty).toContain(COMMUNICATION_LOG_INTERPRETATION.timing);
    expect(empty).toContain('"report_metadata"');
    expect(empty).not.toContain('"communication_attempt"');
    expect(attemptsCsv([attempt("a")])).toContain(
      '"communication_attempt","participant-001"',
    );
    const rows = attemptsCsv([attempt("a")]).slice(1).split("\r\n");
    const widths = rows.map((row) => row.match(/"(?:[^"]|"")*"/g)?.length);
    expect(widths).toEqual(Array(rows.length).fill(widths[0]));
  });
  it("defaults CSV to study mode and protects spreadsheet formulas", () => {
    const sensitive = attempt("a", { fragmentRaw: '=HYPERLINK("private")' });
    const study = attemptsCsv([sensitive]);
    expect(study.startsWith("\uFEFF")).toBe(true);
    expect(study).not.toContain("HYPERLINK");
    expect(study).toContain("participant-001");
    const full = attemptsCsv([sensitive], false);
    expect(full).toContain('" \'=HYPERLINK(""private"")"');
    expect(
      attemptsCsv([attempt("space", { fragmentRaw: " \t=SUM(A1)" })], false),
    ).toContain("' \t=SUM(A1)");
    expect(
      attemptsCsv(
        [attempt("b", { fragmentRaw: 'line one\nline two, "quote"' })],
        false,
      ),
    ).toContain('"line one\nline two, ""quote"""');
  });
});
