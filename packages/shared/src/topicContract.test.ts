import { describe, expect, it } from "vitest";
import { applyCandidatePolicy } from "./candidatePolicy";
import { getMockCandidates } from "./mock";
import {
  catalogFitsExplicitContext,
  resolveGeneratedSentences,
  type GeneratedSentence,
} from "./modelGrounding";
import { requiresPredefinedCommunication } from "./predefinedCommunication";
import { ContextPacketSchema, type ContextPacket } from "./schemas";
import { explicitTopicTerms, withoutTopicParents } from "./topicFragment";
import { getVocabularyCandidate } from "./vocabulary";

// Fictional contacts mirroring the web defaults (ids priya, karthik, meena, rao).
const people = [
  { name: "Priya", relation: "daughter-in-law", aliases: ["ப்ரியா"] },
  { name: "Karthik", relation: "son", aliases: ["கார்த்திக்"] },
  { name: "Meena", relation: "daughter", aliases: ["மீனா"] },
  { name: "Dr. Rao", relation: "doctor", aliases: ["Rao"] },
];
const topic = (
  raw: string,
  topicPath: string[],
  outputLang: "ta" | "en",
  extra: Partial<ContextPacket> = {},
) =>
  ContextPacketSchema.parse({
    fragment: { modality: "topic", raw, topicPath },
    outputLang,
    people,
    ...extra,
  });
/** Mirrors apps/web state.tsx generate() for the free engine. */
const free = (c: ContextPacket) =>
  applyCandidatePolicy(getMockCandidates(c), c).candidates;

type Leaf = [raw: string, path: string[], intentId: string];
const leaves: Leaf[] = [
  ["idli", ["food", "idli"], "daily.idli"],
  ["dosa", ["food", "dosa"], "daily.dosa"],
  ["rasam", ["food", "rasam"], "daily.rasam"],
  ["rice", ["food", "rice"], "daily.rice"],
  ["water", ["drink", "water"], "daily.water"],
  ["coffee", ["drink", "coffee"], "daily.coffee"],
  ["tea", ["drink", "tea"], "daily.tea"],
  ["milk", ["drink", "milk"], "daily.milk"],
  ["Priya", ["people", "priya"], "person.call"],
  ["Karthik", ["people", "karthik"], "person.call"],
  ["Meena", ["people", "meena"], "person.call"],
  ["Dr. Rao", ["people", "rao"], "person.call"],
  ...(
    [
      "happy",
      "sad",
      "worried",
      "scared",
      "angry",
      "lonely",
      "tired",
      "bored",
      "confused",
      "calm",
    ] as const
  ).map((f): Leaf => [f, ["feelings", f], `feeling.${f}`]),
  ["tv", ["tv_phone", "tv"], "daily.tv"],
  ["phone", ["tv_phone", "phone"], "daily.phone"],
  ["music", ["tv_phone", "music"], "daily.music"],
  ["outside", ["go_out", "outside"], "daily.outside"],
  ["home", ["go_out", "home"], "daily.home"],
  ["pray", ["prayer", "pray"], "daily.pray"],
  ["medicine", ["medicine"], "medicine.request"],
  ["toilet", ["toilet"], "daily.toilet"],
  ["rest", ["rest"], "daily.rest"],
];

describe("topic tap contract: every leaf yields a grounded catalog card (free engine)", () => {
  for (const [raw, path, intentId] of leaves)
    for (const lang of ["ta", "en"] as const)
      it(`${path.join("/")} (${lang}) → ${intentId}`, () => {
        const c = topic(raw, path, lang);
        const shown = free(c);
        expect(shown.length).toBeGreaterThan(0);
        expect(shown.length).toBeLessThanOrEqual(3);
        expect(shown[0]!.intentId).toBe(intentId);
        for (const item of shown) {
          expect(/\p{Script=Tamil}/u.test(item.text)).toBe(lang === "ta");
          expect(item.lang).toBe(lang);
        }
        expect(new Set(shown.map((item) => item.text)).size).toBe(shown.length);
        if (path[0] === "people")
          for (const item of shown) expect(item.subject).toBe(raw);
        // Only Medicine is a health topic here; the others may use a generator.
        expect(requiresPredefinedCommunication(c)).toBe(path[0] === "medicine");
      });

  it("keeps the tapped item: tv is TV (not phone), home is home, pray is prayer", () => {
    for (const lang of ["ta", "en"] as const) {
      expect(free(topic("tv", ["tv_phone", "tv"], lang))).toHaveLength(1);
      expect(
        free(topic("tv", ["tv_phone", "tv"], lang)).map((c) => c.intentId),
      ).toEqual(["daily.tv"]);
      expect(
        free(topic("phone", ["tv_phone", "phone"], lang)).map(
          (c) => c.intentId,
        ),
      ).toEqual(["daily.phone"]);
      expect(
        free(topic("home", ["go_out", "home"], lang)).map((c) => c.intentId),
      ).toEqual(["daily.home"]);
    }
  });

  it("also accepts an older client that prefixed the category id to raw", () => {
    for (const [raw, path, id] of [
      ["food idli", ["food", "idli"], "daily.idli"],
      ["drink water", ["drink", "water"], "daily.water"],
      ["tv_phone tv", ["tv_phone", "tv"], "daily.tv"],
      ["go_out home", ["go_out", "home"], "daily.home"],
    ] as const)
      expect(free(topic(raw, [...path], "en"))[0]?.intentId).toBe(id);
  });
});

describe("navigation ids are not explicit patient words", () => {
  it("drops category and contact ids but keeps the leaf and all pain terms", () => {
    const f = (raw: string, topicPath: string[]) => ({
      modality: "topic" as const,
      raw,
      topicPath,
    });
    expect(explicitTopicTerms(f("idli", ["food", "idli"]))).toEqual([]);
    expect(explicitTopicTerms(f("Karthik", ["people", "karthik"]))).toEqual([]);
    expect(explicitTopicTerms(f("", ["feelings", "worried"]))).toEqual([
      "worried",
    ]);
    expect(
      explicitTopicTerms(f("pain shoulder left", ["pain", "shoulder", "left"])),
    ).toEqual(["pain", "shoulder", "left"]);
    expect(explicitTopicTerms(f("medicine", ["medicine"]))).toEqual([
      "medicine",
    ]);
    expect(withoutTopicParents("food idli", f("", ["food", "idli"]))).toBe(
      "idli",
    );
    expect(withoutTopicParents("tv_phone tv", f("", ["tv_phone", "tv"]))).toBe(
      "tv",
    );
    // Text fragments are never rewritten.
    expect(
      withoutTopicParents("food idli", {
        modality: "text",
        raw: "food idli",
      }),
    ).toBe("food idli");
  });

  it("keeps catalog cards that previously failed as context_mismatch", () => {
    const idli = getVocabularyCandidate("daily.idli", "en")!;
    expect(
      catalogFitsExplicitContext(idli, topic("idli", ["food", "idli"], "en")),
    ).toBe(true);
    // A different leaf is still rejected.
    const dosa = getVocabularyCandidate("daily.dosa", "en")!;
    expect(
      catalogFitsExplicitContext(dosa, topic("idli", ["food", "idli"], "en")),
    ).toBe(false);
  });

  it("keeps pain side and body identity strict", () => {
    const c = topic("pain shoulder left", ["pain", "shoulder", "left"], "en");
    const shown = free(c);
    expect(shown.length).toBeGreaterThan(0);
    for (const item of shown) {
      expect(item.bodyPart).toBe("shoulder");
      expect(item.side).toBe("left");
    }
  });
});

const model = (
  text: string,
  gloss_en: string,
  path: string,
  quote: string,
  speechAct: GeneratedSentence["speechAct"] = "request",
): GeneratedSentence => ({
  text,
  gloss_en,
  speechAct,
  polarity: "positive",
  side: "none",
  evidence: [{ path, quote, translation_en: "" }],
});
/** Server validation, then the browser policy with signed server provenance. */
const throughPolicy = (c: ContextPacket, item: GeneratedSentence) => {
  const resolved = resolveGeneratedSentences(
    { candidates: [item], clarification: false },
    c,
  );
  const signed = resolved.candidates.map((x) => ({ ...x, sig: "test-sig" }));
  return {
    reasons: resolved.reasons.map((r) => r.code),
    shown: applyCandidatePolicy(signed, c, {
      serverGeneratedCandidates: signed,
    }).candidates.map((x) => x.text),
  };
};

describe("careful model output for topic taps passes grounding and policy", () => {
  it.each([
    [
      "idli",
      ["food", "idli"],
      "en",
      model("I would like idli.", "I would like idli.", "fragment.raw", "idli"),
    ],
    [
      "idli",
      ["food", "idli"],
      "en",
      model(
        "I would like idli.",
        "I would like idli.",
        "fragment.topicPath.1",
        "idli",
      ),
    ],
    [
      "idli",
      ["food", "idli"],
      "ta",
      model("எனக்கு இட்லி வேணும்.", "I want idli.", "fragment.raw", "idli"),
    ],
    [
      "idli",
      ["food", "idli"],
      "ta",
      model(
        "எனக்கு இட்லி வேணும்.",
        "I want idli.",
        "fragment.topicPath.1",
        "idli",
      ),
    ],
    [
      "water",
      ["drink", "water"],
      "ta",
      model("எனக்கு தண்ணி வேணும்.", "I want water.", "fragment.raw", "water"),
    ],
    [
      "Karthik",
      ["people", "karthik"],
      "en",
      model(
        "I want to talk to Karthik.",
        "I want to talk to Karthik.",
        "fragment.raw",
        "Karthik",
      ),
    ],
    [
      "Karthik",
      ["people", "karthik"],
      "ta",
      model(
        "கார்த்திக்கிட்ட பேசணும்.",
        "I want to talk to Karthik.",
        "fragment.raw",
        "Karthik",
      ),
    ],
    [
      "Dr. Rao",
      ["people", "rao"],
      "en",
      model(
        "I want to call Dr. Rao.",
        "I want to call Dr. Rao.",
        "fragment.raw",
        "Dr. Rao",
      ),
    ],
    [
      "worried",
      ["feelings", "worried"],
      "en",
      model(
        "I feel worried.",
        "I feel worried.",
        "fragment.raw",
        "worried",
        "report",
      ),
    ],
    [
      "worried",
      ["feelings", "worried"],
      "ta",
      model(
        "எனக்கு கவலையா இருக்கு.",
        "I feel worried.",
        "fragment.topicPath.1",
        "worried",
        "report",
      ),
    ],
    [
      "tv",
      ["tv_phone", "tv"],
      "en",
      model(
        "Please turn on the TV.",
        "Please turn on the TV.",
        "fragment.raw",
        "tv",
      ),
    ],
    [
      "outside",
      ["go_out", "outside"],
      "en",
      model(
        "I want to go outside.",
        "I want to go outside.",
        "fragment.raw",
        "outside",
      ),
    ],
    [
      "pray",
      ["prayer", "pray"],
      "en",
      model(
        "I'd like some time to pray.",
        "I'd like some time to pray.",
        "fragment.raw",
        "pray",
      ),
    ],
    [
      "pray",
      ["prayer", "pray"],
      "ta",
      model(
        "பிரார்த்தனை பண்ண நேரம் வேணும்.",
        "I'd like some time to pray.",
        "fragment.topicPath.1",
        "pray",
      ),
    ],
  ] as const)("%s %j (%s) is shown", (raw, path, lang, item) => {
    const result = throughPolicy(topic(raw, [...path], lang), item);
    expect(result.reasons).toEqual([]);
    expect(result.shown).toEqual([item.text]);
  });

  it.each([
    // A different item, person or an invented quantity/event is still dropped.
    [
      "idli",
      ["food", "idli"],
      model("I would like dosa.", "I would like dosa.", "fragment.raw", "idli"),
    ],
    [
      "tv",
      ["tv_phone", "tv"],
      model(
        "Please bring my phone.",
        "Please bring my phone.",
        "fragment.raw",
        "tv",
      ),
    ],
    [
      "Karthik",
      ["people", "karthik"],
      model(
        "I want to talk to Priya.",
        "I want to talk to Priya.",
        "fragment.raw",
        "Karthik",
      ),
    ],
    [
      "Karthik",
      ["people", "karthik"],
      model(
        "Karthik visited yesterday.",
        "Karthik visited yesterday.",
        "fragment.raw",
        "Karthik",
        "report",
      ),
    ],
    [
      "Karthik",
      ["people", "karthik"],
      model(
        "I want to visit Karthik at the hospital.",
        "I want to visit Karthik at the hospital.",
        "fragment.raw",
        "Karthik",
      ),
    ],
    [
      "idli",
      ["food", "idli"],
      model(
        "I would like some food.",
        "I would like some food.",
        "fragment.topicPath.0",
        "food",
      ),
    ],
    [
      "idli",
      ["food", "idli"],
      model(
        "I would like two idlis.",
        "I would like two idlis.",
        "fragment.raw",
        "idli",
      ),
    ],
  ] as const)("%s %j drops an ungrounded model sentence", (raw, path, item) => {
    const result = throughPolicy(topic(raw, [...path], "en"), item);
    expect(result.reasons.length).toBe(1);
    expect(result.shown).toEqual([]);
  });
});
