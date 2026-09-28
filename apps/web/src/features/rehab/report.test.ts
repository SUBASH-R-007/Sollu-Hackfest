import { describe as suite, expect, it } from "vitest";
import { AttemptSchema } from "@sollu/shared";
import {
  createDefaultPlan,
  createDefaultProfile,
  type PracticeRecord,
} from "./model";
import {
  buildReport,
  communicationSummary,
  describe,
  MAX_REPORT_BYTES,
  parseReport,
  proportion,
  reportCsv,
  weeklyReport,
  type TherapyReport,
} from "./report";

const at = new Date(2026, 8, 28, 12).getTime();
const practice = (extra: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: "practice-1",
  patientId: "local-patient",
  createdAt: at,
  kind: "sentence",
  language: "en",
  communicationMethod: "natural_speech",
  target: "I need water",
  transcript: "I need",
  transcriptSource: "manual",
  transcriptReviewed: true,
  confirmedMissedWords: ["water", "water", "unrelated"],
  responseSeconds: null,
  recordingSeconds: null,
  fatigueBefore: 2,
  fatigueAfter: 4,
  effort: null,
  selfUnderstanding: "yes",
  partnerUnderstanding: "unknown",
  aacCompleted: null,
  mediaIds: ["clip-1"],
  daypart: "afternoon",
  place: "home",
  notes: "private note",
  ...extra,
});
const report = (
  extra: Partial<Parameters<typeof buildReport>[0]> = {},
): TherapyReport =>
  buildReport({
    profile: {
      ...createDefaultProfile(at),
      displayName: "Private Name",
      goals: ["Family conversation"],
      clinicianInstructions: "Private instructions",
    },
    plan: createDefaultPlan(at),
    sessions: [practice()],
    reviews: [
      {
        id: "review-1",
        patientId: "local-patient",
        practiceId: "practice-1",
        reviewer: "Clinician A",
        reviewedAt: at,
        understanding: "partly",
        notes: "Private review",
      },
    ],
    attempts: [],
    corrections: [
      {
        id: "correction-1",
        heard: "wa",
        means: "water",
        count: 2,
        confirmed: true,
        lastAt: at,
        lang: "en",
      },
    ],
    participant: "P-001",
    from: "2026-09-01",
    to: "2026-09-30",
    includeContent: true,
    ...extra,
  });
const row = (
  extra: Partial<TherapyReport["communication"][number]> = {},
): TherapyReport["communication"][number] => ({
  at,
  spoken: true,
  outcome: "unconfirmed",
  taps: 4,
  seconds: 8,
  excluded: false,
  ...extra,
});

suite("rehabilitation report honesty and safe transfer", () => {
  it("omits names, transcript, goals, correction text and reviewer details by default export option", () => {
    const output = report({ includeContent: false });
    const text = JSON.stringify(output);
    for (const secret of [
      "Private Name",
      "Family conversation",
      "Private instructions",
      "Private review",
      "Clinician A",
      "I need water",
      '"wa"',
    ])
      expect(text).not.toContain(secret);
    expect(output.sessions[0].textMatch).toBe(66.7);
    expect(output.sessions[0].reviews).toEqual([
      { at, understanding: "partly" },
    ]);
    expect(output.evidenceManifest).toEqual([
      { practiceId: "practice-1", mediaId: "clip-1" },
    ]);
    expect(text).not.toContain("blob");
  });

  it("does not score unreviewed recognition, unreviewed manual text, AAC or missing transcripts", () => {
    for (const extra of [
      { transcriptReviewed: false },
      { kind: "aac" as const },
      { transcript: "" },
      { transcriptSource: "none" as const },
    ]) {
      expect(
        report({ sessions: [practice(extra)] }).sessions[0].textMatch,
      ).toBeNull();
    }
  });

  it("only exports distinct explicitly marked target words, independent of transcript scoring", () => {
    expect(report().sessions[0].missedWords).toEqual(["water"]);
    expect(
      report({ sessions: [practice({ transcriptReviewed: false })] })
        .sessions[0].missedWords,
    ).toEqual(["water"]);
  });

  it("uses explicit understanding denominator, excludes demonstrations and retains missing times", () => {
    const result = communicationSummary([
      row({ outcome: "understood" }),
      row({ outcome: "needs_repair", seconds: null }),
      row(),
      row({ outcome: "intended" }),
      row({ outcome: "declined" }),
      row({ outcome: "understood", excluded: true }),
    ]);
    expect(result).toMatchObject({
      eligible: 5,
      excluded: 1,
      assessed: 2,
      understood: 1,
      rate: 0.5,
      unassessed: 3,
    });
    expect(result.seconds).toMatchObject({ n: 4, median: 8 });
    expect(communicationSummary([row()]).rate).toBeNull();
  });

  it("tracks demonstration exclusion without labelling ordinary offline use as demo", () => {
    const base = AttemptSchema.parse({
      id: "a",
      startedAt: at,
      modality: "text",
      fragmentRaw: "water",
      outputLang: "en",
      place: "home",
      timeBucket: "afternoon",
      demoClock: false,
      rounds: [],
      taps: 2,
      offline: true,
      demoCached: false,
      outcome: "spoken",
      communicationOutcome: "understood",
    });
    const data = report({
      attempts: [
        base,
        { ...base, id: "b", demoClock: true },
        { ...base, id: "c", demoCached: true },
      ],
    });
    expect(data.communication.map((r) => r.excluded)).toEqual([
      false,
      true,
      true,
    ]);
    expect(data.communication[0].seconds).toBeNull();
    expect(communicationSummary(data.communication).understood).toBe(1);
  });

  it("provides missingness-aware quantiles and bounded descriptive Wilson intervals", () => {
    expect(describe([null, 2, 4, 6, 8])).toEqual({
      n: 4,
      median: 5,
      q1: 3.5,
      q3: 6.5,
    });
    expect(describe([null]).median).toBeNull();
    expect(proportion(0, 0)).toEqual({ rate: null, ci95: null });
    expect(proportion(0, 4).ci95![0]).toBeGreaterThanOrEqual(0);
    expect(proportion(4, 4).ci95![1]).toBeLessThanOrEqual(1);
  });

  it("retains zero-practice weeks and does not substitute zeros for missing scores", () => {
    const weeks = weeklyReport(report());
    expect(weeks.length).toBe(5);
    expect(
      weeks
        .slice(0, -1)
        .every((w) => w.count === 0 && w.textMatch.median === null),
    ).toBe(true);
    expect(weeks.at(-1)).toMatchObject({
      count: 1,
      activeDays: 1,
      fatigue: { n: 1, median: 2 },
    });
  });

  it("round trips snapshots while stripping unknown trust, URLs, tokens and executable metadata", () => {
    const input = {
      ...report(),
      authenticated: true,
      signatures: ["fake"],
      remoteMedia: "https://untrusted.invalid/media",
      profile: { ...report().profile, pinHash: "secret" },
    };
    const parsed = parseReport(JSON.stringify(input));
    expect(parsed).not.toHaveProperty("authenticated");
    expect(parsed).not.toHaveProperty("remoteMedia");
    expect(parsed.profile).not.toHaveProperty("pinHash");
    expect(parseReport(JSON.stringify(parsed))).toEqual(parsed);
  });

  it("rejects malformed, oversized, duplicate, non-finite, impossible-date and inverted reports", () => {
    expect(() => parseReport("{")).toThrow(/valid/);
    expect(() => parseReport("x".repeat(MAX_REPORT_BYTES + 1))).toThrow(
      /limit/,
    );
    const good = report();
    for (const invalid of [
      { ...good, version: 99 },
      { ...good, sessions: [good.sessions[0], good.sessions[0]] },
      { ...good, sessions: [{ ...good.sessions[0], textMatch: 101 }] },
      { ...good, sessions: [{ ...good.sessions[0], responseSeconds: -1 }] },
      { ...good, from: "2026-09-31" },
      { ...good, from: "2026-10-01" },
      { ...good, from: "2024-01-01" },
      { ...good, contentIncluded: false },
      { ...good, rangeStart: good.rangeEnd },
      { ...good, sessions: [{ ...good.sessions[0], at: good.rangeEnd + 1 }] },
      {
        ...good,
        sessions: [{ ...good.sessions[0], transcriptReviewed: false }],
      },
      { ...good, sessions: [{ ...good.sessions[0], kind: "aac" }] },
      { ...good, sessions: [{ ...good.sessions[0], textMatch: 100 }] },
    ])
      expect(() => parseReport(JSON.stringify(invalid))).toThrow();
  });

  it("escapes CSV formulas and embedded quotes in user-entered fields", () => {
    const csv = reportCsv(
      report({
        participant: '=IMPORTXML("x")',
        sessions: [
          practice({
            target: " @SUM(A1)",
            notes: 'a "quoted" note\nwith a line break',
          }),
        ],
      }),
    );
    expect(csv).toContain('" \'=IMPORTXML(""x"")"');
    expect(csv).toContain('" \' @SUM(A1)"');
    expect(csv).toContain('a ""quoted"" note');
  });
});
