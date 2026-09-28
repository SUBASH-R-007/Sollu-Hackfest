import { describe, expect, it } from "vitest";
import {
  deriveContextSignals,
  modelEvidenceSources,
  ContextPacketSchema,
} from "./index";
import type { ContextPacket } from "./schemas";

const context = (extra: Partial<ContextPacket> = {}) =>
  ContextPacketSchema.parse({
    fragment: { modality: "text", raw: "want usual drink" },
    outputLang: "en",
    now: { localTime: "08:00", weekday: 1, timeBucket: "morning" },
    place: "home",
    routine: {
      dueNow: [
        {
          label: "Morning coffee",
          topic: "drink",
          time: "08:05",
          place: "home",
        },
        { label: "Garden walk", topic: "go_out", time: "08:00", place: "home" },
      ],
      justPassed: [],
    },
    ...extra,
  });

describe("context signal engine", () => {
  it.each([
    "Night tablets",
    "Scheduled medication",
    "FictionalRemedy",
    "இரவு மாத்திரை",
  ])(
    "does not accept a clinical or unfamiliar label merely because its topic says food: %s",
    (label) => {
      for (const raw of ["want food", "want usual food"]) {
        const c = context({
          fragment: { modality: "text", raw },
          routine: {
            dueNow: [{ label, topic: "food", time: "08:00" }],
            justPassed: [],
          },
        });
        expect(deriveContextSignals(c).routineResolution).toBe("none");
        expect(
          modelEvidenceSources(c)["routine.dueNow.0.label"],
        ).toBeUndefined();
      }
    },
  );

  it("requires known item spans inside mixed food labels without authorizing unknown suffixes", () => {
    const c = context({
      fragment: { modality: "text", raw: "want drink" },
      routine: {
        dueNow: [
          { label: "Coffee FictionalRemedy", topic: "drink", time: "08:00" },
        ],
        justPassed: [],
      },
    });
    const signal = deriveContextSignals(c).routines[0];
    expect(signal.mayResolveReference).toBe(true);
    expect(signal.referenceTerms.map((term) => term.toLowerCase())).toContain(
      "coffee",
    );
    expect(signal.referenceTerms).not.toContain("Coffee FictionalRemedy");
  });

  it.each(["Morning idli", "Rice", "Meal", "காலை இட்லி"])(
    "preserves known food and correctly timed full-label evidence: %s",
    (label) => {
      const c = context({
        fragment: { modality: "text", raw: "want food" },
        routine: {
          dueNow: [{ label, topic: "food", time: "08:00" }],
          justPassed: [],
        },
      });
      expect(deriveContextSignals(c).routineResolution).toBe("single");
      expect(deriveContextSignals(c).routines[0].referenceTerms).toContain(
        label,
      );
    },
  );
  it.each([
    "want usual drink tomorrow",
    "want usual drink yesterday",
    "want usual drink at 20:00",
    "want usual evening drink",
    "want usual drink at clinic",
  ])(
    "gives explicit patient time/place priority over a nearby routine: %s",
    (raw) => {
      const c = context({ fragment: { modality: "text", raw } });
      expect(deriveContextSignals(c).routines).toEqual([]);
      expect(
        Object.keys(modelEvidenceSources(c)).some((path) =>
          path.startsWith("routine."),
        ),
      ).toBe(false);
    },
  );

  it("does not use a stale selected place to resolve here when the person names another place", () => {
    const c = context({
      fragment: { modality: "text", raw: "need help here in clinic" },
    });
    expect(modelEvidenceSources(c).place).toBeUndefined();
  });

  it("allows a matching explicit morning but refuses a conflicting routine label", () => {
    const c = context({
      fragment: { modality: "text", raw: "want usual morning drink" },
    });
    expect(deriveContextSignals(c).routineResolution).toBe("single");
    const conflicting = {
      ...c,
      routine: {
        dueNow: [
          { label: "Evening coffee", topic: "drink" as const, time: "08:05" },
        ],
        justPassed: [],
      },
    };
    expect(deriveContextSignals(conflicting).routines).toEqual([]);
  });

  it.each(["drink", "want drink", "I would like a drink", "பானம் வேண்டும்"])(
    "resolves a narrowly generic drink category with one dominant routine: %s",
    (raw) => {
      const result = deriveContextSignals(
        context({ fragment: { modality: "text", raw } }),
      );
      expect(result.genericReference).toBe(true);
      expect(result.routineReference).toBe(false);
      expect(result.routineResolution).toBe("single");
      expect(result.routines[0].reasons).toContain("category_reference");
    },
  );

  it.each([
    "",
    "help",
    "water",
    "coffee",
    "want food and coffee",
    "want drink for Meena",
    "want drink tomorrow",
    "medicine",
  ])(
    "does not treat an explicit or unrelated fragment as a generic category: %s",
    (raw) => {
      expect(
        deriveContextSignals(context({ fragment: { modality: "text", raw } }))
          .genericReference,
      ).toBe(false);
    },
  );

  it("does not use grammar word overlap to rank an unrelated routine", () => {
    const c = context({
      fragment: { modality: "text", raw: "I want a drink" },
      routine: {
        dueNow: [
          { label: "Take a walk", topic: "go_out", time: "08:00" },
          { label: "Morning coffee", topic: "drink", time: "08:05" },
        ],
        justPassed: [],
      },
    });
    expect(
      deriveContextSignals(c).routines.map((routine) => routine.label),
    ).toEqual(["Morning coffee"]);
  });

  it("ranks relevant activity above a closer unrelated routine and preserves source paths", () => {
    const result = deriveContextSignals(context());
    expect(result.routineResolution).toBe("single");
    expect(result.routines).toHaveLength(1);
    expect(result.routines[0]).toMatchObject({
      path: "routine.dueNow.0",
      label: "Morning coffee",
      minutesAway: 5,
      mayResolveReference: true,
      reasons: ["nearby_time", "topic", "routine_reference", "matching_place"],
    });
    expect(modelEvidenceSources(context())["routine.dueNow.0.label"]).toBe(
      "Morning coffee",
    );
    expect(
      modelEvidenceSources(context())["routine.dueNow.0.time"],
    ).toBeUndefined();
  });

  it("uses the nearest matching time when there is a clear separation", () => {
    const result = deriveContextSignals(
      context({
        routine: {
          dueNow: [
            { label: "Morning coffee", topic: "drink", time: "08:00" },
            { label: "Tea break", topic: "drink", time: "09:20" },
          ],
          justPassed: [],
        },
      }),
    );
    expect(result.routineResolution).toBe("single");
    expect(result.routines[0].label).toBe("Morning coffee");
    expect(result.routines[1].mayResolveReference).toBe(false);
  });

  it("does not choose between equally plausible routines or expose either as evidence", () => {
    const c = context({
      routine: {
        dueNow: [
          { label: "Coffee", topic: "drink", time: "08:00" },
          { label: "Tea", topic: "drink", time: "08:05" },
        ],
        justPassed: [],
      },
    });
    expect(deriveContextSignals(c).routineResolution).toBe("ambiguous");
    expect(
      Object.keys(modelEvidenceSources(c)).some((path) =>
        path.startsWith("routine."),
      ),
    ).toBe(false);
  });

  it("deduplicates repeated routine meanings before checking ambiguity", () => {
    const c = context({
      routine: {
        dueNow: [
          { label: "Coffee", topic: "drink", time: "08:00" },
          { label: "Coffee", topic: "drink", time: "08:01" },
        ],
        justPassed: [],
      },
    });
    expect(deriveContextSignals(c).routineResolution).toBe("single");
    expect(deriveContextSignals(c).routines).toHaveLength(1);
  });

  it("handles midnight and ignores an out-of-window or wrong-place routine", () => {
    const c = context({
      now: { localTime: "23:55", weekday: 1, timeBucket: "late_night" },
      routine: {
        dueNow: [
          { label: "Warm water", topic: "drink", time: "00:05", place: "home" },
          { label: "Tea", topic: "drink", time: "23:55", place: "clinic" },
          { label: "Coffee", topic: "drink", time: "08:00" },
        ],
        justPassed: [],
      },
    });
    expect(deriveContextSignals(c).routines).toMatchObject([
      { label: "Warm water", minutesAway: 10 },
    ]);
  });

  it("accepts a bounded relative offset when exact local clock sharing is disabled", () => {
    const c = context({
      now: undefined,
      routine: {
        dueNow: [
          { label: "Coffee", topic: "drink", time: "08:00", minutesAway: 10 },
        ],
        justPassed: [],
      },
    });
    expect(deriveContextSignals(c).clock).toBeUndefined();
    expect(deriveContextSignals(c).routineResolution).toBe("single");
  });

  it("never guesses a time or place when no relevant context was shared", () => {
    const c = context({ now: undefined, place: undefined, routine: undefined });
    expect(deriveContextSignals(c)).toMatchObject({
      routines: [],
      routineResolution: "none",
    });
    expect(deriveContextSignals(c).clock).toBeUndefined();
    expect(deriveContextSignals(c).place).toBeUndefined();
    expect(modelEvidenceSources(c)).toEqual({
      "fragment.raw": "want usual drink",
    });
  });

  it.each(["water", "no water", "maybe water"])(
    "never expands an explicit fragment into a different routine: %s",
    (raw) => {
      const c = context({ fragment: { modality: "text", raw } });
      expect(
        deriveContextSignals(c).routines.some(
          (routine) => routine.mayResolveReference,
        ),
      ).toBe(false);
      expect(
        Object.keys(modelEvidenceSources(c)).some((path) =>
          path.startsWith("routine."),
        ),
      ).toBe(false);
    },
  );

  it("never makes a medical routine or symptom routine available as sentence evidence", () => {
    for (const topic of ["medicine", "pain"] as const) {
      const c = context({
        fragment: { modality: "text", raw: `usual ${topic}` },
        routine: {
          dueNow: [{ label: "Fictional tablets", topic, time: "08:00" }],
          justPassed: [],
        },
      });
      expect(deriveContextSignals(c).routines[0].mayResolveReference).toBe(
        false,
      );
      expect(modelEvidenceSources(c)).toEqual({
        "fragment.raw": `usual ${topic}`,
      });
    }
  });

  it("makes selected place available only to resolve an explicit here reference", () => {
    expect(modelEvidenceSources(context()).place).toBeUndefined();
    expect(
      modelEvidenceSources(
        context({ fragment: { modality: "text", raw: "need help here" } }),
      ).place,
    ).toBe("home");
    expect(
      modelEvidenceSources(
        context({ fragment: { modality: "text", raw: "இங்கே உதவி வேண்டும்" } }),
      ).place,
    ).toBe("home");
  });

  it.each(["want usual water", "no usual tea", "usual பால்"])(
    "does not substitute a different named drink using the routine: %s",
    (raw) => {
      const c = context({ fragment: { modality: "text", raw } });
      expect(deriveContextSignals(c).routines).toEqual([]);
      expect(
        Object.keys(modelEvidenceSources(c)).some((path) =>
          path.startsWith("routine."),
        ),
      ).toBe(false);
    },
  );

  it("bounds hints to three and never generates text from empty input", () => {
    const c = context({
      fragment: { modality: "text", raw: "usual" },
      routine: {
        dueNow: ["A", "B", "C", "D"].map((label) => ({
          label,
          topic: "drink" as const,
          time: "08:00",
        })),
        justPassed: [],
      },
    });
    expect(deriveContextSignals(c).routines).toHaveLength(3);
    expect(
      deriveContextSignals({ ...c, fragment: { modality: "text", raw: "" } })
        .routines,
    ).toEqual([]);
  });
});
