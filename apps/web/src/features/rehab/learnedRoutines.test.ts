import { describe, expect, it } from "vitest";
import { getVocabularyCandidate, type Attempt } from "@sollu/shared";
import { defaultSettings } from "../../db";
import { buildContext, inferenceContext, timeBucket } from "../../lib/context";
import {
  confirmLearnedRoutine,
  suggestLearnedRoutines,
} from "./learnedRoutines";

const now = new Date(2026, 8, 28, 12).getTime();
function choice(day: number, overrides: Partial<Attempt> = {}): Attempt {
  const startedAt = new Date(2026, 8, day, 8, 10).getTime();
  const candidate = getVocabularyCandidate("daily.coffee", "en")!;
  return {
    id: `attempt-${day}`,
    startedAt,
    endedAt: startedAt + 10000,
    outcome: "spoken",
    modality: "text",
    fragmentRaw: "coffee",
    sttRetries: 0,
    outputLang: "en",
    place: "home",
    timeBucket: "morning",
    demoClock: false,
    rounds: [
      {
        round: 1,
        source: "local",
        latencyMs: 0,
        candidates: [candidate],
        chosenIndex: 0,
        noneOfThese: false,
        usualShown: false,
        usualChosen: false,
      },
    ],
    chosenText: candidate.text,
    chosenIntent: candidate.intent,
    taps: 3,
    offline: false,
    demoCached: false,
    communicationOutcome: "understood",
    ...overrides,
  };
}
const records = () => [choice(21), choice(23), choice(25)];
function suggestion() {
  return suggestLearnedRoutines(records(), [], now)[0]!;
}

describe("reviewed routine learning", () => {
  it("proposes a bounded pattern with dates, chosen-text evidence and observed weekdays", () => {
    const [item] = suggestLearnedRoutines(records(), [], now);
    expect(item).toMatchObject({
      label: "Coffee",
      topic: "drink",
      place: "home",
      time: "08:10",
      count: 3,
      dates: ["2026-09-21", "2026-09-23", "2026-09-25"],
      days: [1, 3, 5],
    });
    expect(item!.example).toBe(
      getVocabularyCandidate("daily.coffee", "en")!.text,
    );
    expect(item).not.toHaveProperty("probability");
    expect(item).not.toHaveProperty("confirmed");
  });
  it("does not confuse repeated taps or duplicate rows with distinct days", () => {
    expect(
      suggestLearnedRoutines(
        [choice(21), choice(21, { id: "second" }), choice(21, { id: "third" })],
        [],
        now,
      ),
    ).toEqual([]);
    expect(
      suggestLearnedRoutines(
        [choice(21), choice(23, { id: "attempt-21" }), choice(25)],
        [],
        now,
      ),
    ).toEqual([]);
    const all = [
      ...records(),
      choice(21, {
        id: "repeat",
        startedAt: new Date(2026, 8, 21, 8, 29).getTime(),
        endedAt: new Date(2026, 8, 21, 8, 29, 5).getTime(),
      }),
    ];
    expect(suggestLearnedRoutines(all, [], now)[0]).toMatchObject({
      time: "08:10",
      count: 4,
    });
  });
  it.each([
    { communicationOutcome: "intended" },
    { communicationOutcome: "unconfirmed" },
    { communicationOutcome: "needs_repair" },
    { outcome: "abandoned" },
    { demoClock: true },
    { demoCached: true },
    { chosenText: undefined },
    { place: "hospital" },
    { place: "clinic" },
    { fragmentRaw: "not coffee" },
    { fragmentRaw: "maybe coffee" },
    { fragmentRaw: "coffee after medication" },
    { endedAt: now + 1 },
    { endedAt: undefined },
  ] satisfies Partial<Attempt>[])(
    "rejects unconfirmed, simulated, clinical or uncertain records: %j",
    (patch) => {
      expect(
        suggestLearnedRoutines(
          records().map((row) => ({ ...row, ...patch })),
          [],
          now,
        ),
      ).toEqual([]);
    },
  );
  it("does not infer a routine from raw fragments or a fabricated selected sentence", () => {
    expect(
      suggestLearnedRoutines(
        records().map((row) => ({
          ...row,
          chosenText: "A medicine called coffee",
          chosenIntent: "daily.coffee",
        })),
        [],
        now,
      ),
    ).toEqual([]);
    expect(
      suggestLearnedRoutines(
        records().map((row) => ({
          ...row,
          chosenText: "I do not want coffee.",
        })),
        [],
        now,
      ),
    ).toEqual([]);
    expect(
      suggestLearnedRoutines(
        records().map((row) => ({
          ...row,
          chosenText: "Please bring coffee to the clinic at 9.",
        })),
        [],
        now,
      ),
    ).toEqual([]);
  });
  it("requires matching place, half-hour window and saved device daypart", () => {
    expect(
      suggestLearnedRoutines(
        [choice(21), choice(23), choice(25, { place: "outside" })],
        [],
        now,
      ),
    ).toEqual([]);
    expect(
      suggestLearnedRoutines(
        [
          choice(21),
          choice(23),
          choice(25, {
            startedAt: new Date(2026, 8, 25, 8, 40).getTime(),
            endedAt: new Date(2026, 8, 25, 8, 40, 5).getTime(),
          }),
        ],
        [],
        now,
      ),
    ).toEqual([]);
    expect(
      suggestLearnedRoutines(
        records().map((row) => ({ ...row, timeBucket: "night" })),
        [],
        now,
      ),
    ).toEqual([]);
  });
  it("uses only recent valid records and ignores corrupted stored values", () => {
    expect(
      suggestLearnedRoutines(records(), [], new Date(2027, 1, 1).getTime()),
    ).toEqual([]);
    expect(suggestLearnedRoutines(records(), [], Number.NaN)).toEqual([]);
    const malformed = [
      null,
      { id: "bad" },
      choice(21, { startedAt: Number.NaN }),
      ...records(),
    ] as unknown as Attempt[];
    expect(suggestLearnedRoutines(malformed, [], now)).toHaveLength(1);
  });
  it("rejects cached or contradicted candidate metadata", () => {
    for (const source of ["cache", "mock"] as const) {
      const modified = records().map((row) => ({
        ...row,
        rounds: row.rounds.map((round) => ({
          ...round,
          candidates: round.candidates.map((candidate) => ({
            ...candidate,
            source,
          })),
        })),
      }));
      expect(suggestLearnedRoutines(modified, [], now)).toEqual([]);
    }
    const modified = records().map((row) => ({
      ...row,
      rounds: row.rounds.map((round) => ({ ...round, model: "model CACHED" })),
    }));
    expect(suggestLearnedRoutines(modified, [], now)).toEqual([]);
  });
  it("accepts known Tamil choices without counting English and Tamil as duplicate options", () => {
    const tamil = getVocabularyCandidate("daily.coffee", "ta")!;
    const rows = [
      choice(21),
      choice(23, { chosenText: tamil.text, outputLang: "ta" }),
      choice(25),
    ];
    expect(suggestLearnedRoutines(rows, [], now)).toHaveLength(1);
  });
  it("requires review, validates the editable schedule and rejects duplicates", () => {
    const item = suggestion();
    const draft = {
      label: item.label,
      time: item.time,
      days: item.days,
      place: item.place,
    };
    expect(() => confirmLearnedRoutine(item, draft, false, [])).toThrow(
      /Review/,
    );
    expect(() =>
      confirmLearnedRoutine(item, { ...draft, days: [] }, true, []),
    ).toThrow(/weekday/);
    expect(() =>
      confirmLearnedRoutine(item, { ...draft, time: "25:00" }, true, []),
    ).toThrow(/valid time/);
    expect(() =>
      confirmLearnedRoutine(
        item,
        { ...draft, label: "Morning tablets" },
        true,
        [],
      ),
    ).toThrow(/non-clinical/);
    const saved = confirmLearnedRoutine(item, draft, true, []);
    expect(saved).toMatchObject({
      source: "learned",
      confirmed: true,
      isSample: false,
      topic: "drink",
    });
    expect(() => confirmLearnedRoutine(item, draft, true, [saved])).toThrow(
      /already saved/,
    );
    expect(() =>
      confirmLearnedRoutine(
        item,
        draft,
        true,
        Array.from({ length: 32 }, () => saved),
      ),
    ).toThrow(/Remove/);
    expect(suggestLearnedRoutines(records(), [saved], now)).toEqual([]);
  });
  it("learned clues obey existing sharing permissions and carry no raw evidence", () => {
    const item = suggestion();
    const routine = confirmLearnedRoutine(item, item, true, []);
    const at = new Date(2026, 8, 28, 8, 10).getTime();
    const settings = {
      ...defaultSettings,
      demo: false,
      routines: [routine],
      sharePersonalContext: false,
    };
    const context = buildContext(
      settings,
      { modality: "text", raw: "usual drink" },
      { now: at },
    );
    expect(context.routine?.dueNow[0]).toMatchObject({
      label: "Coffee",
      learned: true,
    });
    expect(inferenceContext(context, settings).routine).toBeUndefined();
    const shared = inferenceContext(context, {
      ...settings,
      sharePersonalContext: true,
    });
    expect(shared.routine?.dueNow[0]).toMatchObject({
      label: "Coffee",
      learned: true,
    });
    expect(JSON.stringify(shared)).not.toContain("2026-09-21");
    expect(JSON.stringify(shared)).not.toContain("attempt-");
    expect(timeBucket(new Date(at).getHours())).toBe("morning");
  });
});
