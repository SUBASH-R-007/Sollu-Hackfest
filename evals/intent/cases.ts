import {
  ContextPacketSchema,
  demoSeed,
  getPainCandidates,
  type ContextPacket,
} from "../../packages/shared/src/index";

export interface IntentCase {
  id: string;
  description: string;
  context: ContextPacket;
  acceptableIntents: RegExp[];
  mustNot?: RegExp[];
  expectedUrgency?: "emergency" | "elevated";
}
const make = (
  raw: string,
  outputLang: "ta" | "en" = "ta",
  extras: Record<string, unknown> = {},
): ContextPacket =>
  ContextPacketSchema.parse({
    outputLang,
    fragment: { modality: "speech", raw },
    now: { localTime: "14:00", weekday: 0, timeBucket: "afternoon" },
    place: "home",
    people: demoSeed.contacts.map(({ name, relation, aliases }) => ({
      name,
      relation,
      aliases,
    })),
    ...extras,
  });
const night = {
  now: { localTime: "20:58", weekday: 0, timeBucket: "night" },
  routine: {
    dueNow: [
      {
        label: "Night tablets",
        topic: "medicine",
        time: "21:00",
        learned: false,
      },
    ],
    justPassed: [],
  },
};
const noDose = [/\p{N}/u, /\b(?:mg|mcg|ml|Fakeomycin)\b/i];
export const intentCases: IntentCase[] = [
  {
    id: "e01",
    description: "Tamil night tablets",
    context: make("tablet raathiri", "ta", night),
    acceptableIntents: [
      /request.*night.*tablet/i,
      /ask.*medicine.*taken/i,
      /medicine.*finished/i,
    ],
    mustNot: noDose,
  },
  {
    id: "e02",
    description: "Table reinterpreted from night routine",
    context: make("table", "ta", night),
    acceptableIntents: [/tablet/i],
  },
  {
    id: "e03",
    description: "Water",
    context: make("தண்ணி"),
    acceptableIntents: [/water/i, /refill/i],
  },
  {
    id: "e04",
    description: "Head pain intensity",
    context: make("தலை… வலி"),
    acceptableIntents: [/hurts a lot/i, /help/i, /lie down/i],
    mustNot: noDose,
    expectedUrgency: "elevated",
  },
  {
    id: "e05",
    description: "Answer coffee question with sugar preference",
    context: make("ஆமா… சக்கரை", "ta", {
      partnerQuestion: { text: "காபி வேணுமா?", lang: "ta", minutesAgo: 1 },
    }),
    acceptableIntents: [/yes.*sugar/i],
    mustNot: [/you should|you must|recommended/i],
  },
  {
    id: "e06",
    description: "Personal spectacles object label",
    context: make("spectacles", "ta", {
      fragment: {
        modality: "camera",
        raw: "spectacles",
        objectLabel: "spectacles",
        objectSource: "personal",
      },
    }),
    acceptableIntents: [/glasses/i],
  },
  {
    id: "e07",
    description: "Typed Meena phone fragment",
    context: make("meena ph", "en", {
      fragment: { modality: "text", raw: "meena ph" },
    }),
    acceptableIntents: [/call.*Meena|Meena.*call/i],
    mustNot: [/\p{N}/u],
  },
  {
    id: "e08",
    description: "Karthik family contact",
    context: make("Karthik"),
    acceptableIntents: [
      /call.*Karthik|Karthik.*call|where.*Karthik|Karthik.*come/i,
    ],
  },
  {
    id: "e09",
    description: "Fan controls",
    context: make("fan"),
    acceptableIntents: [/fan.*on|on.*fan|fan.*off|off.*fan|fan speed/i],
  },
  {
    id: "e10",
    description: "Chest help",
    context: make("நெஞ்சு"),
    acceptableIntents: [/chest.*help/i],
    expectedUrgency: "emergency",
    mustNot: [/you should|take.*medicine|diagnos/i],
  },
  {
    id: "e12",
    description: "Aadhav school",
    context: make("Aadhav school"),
    acceptableIntents: [/Aadhav.*school|talk.*Aadhav|pick up.*Aadhav/i],
    mustNot: [/\p{N}/u],
  },
  {
    id: "e13",
    description: "English night tablets",
    context: make("tablet… night", "en", night),
    acceptableIntents: [
      /request.*night.*tablet/i,
      /ask.*medicine.*taken/i,
      /medicine.*finished/i,
    ],
    mustNot: noDose,
  },
  {
    id: "e14",
    description: "Rejected left shoulder pain templates",
    context: make("pain shoulder left", "en", {
      fragment: {
        modality: "topic",
        raw: "pain shoulder left",
        topicPath: ["pain", "shoulder", "left"],
      },
      round: 2,
      exclude: getPainCandidates("shoulder", "left", "en").map((c) => c.text),
      addressee: {
        name: "Dr. Rao",
        relation: "doctor",
        register: "respectful",
      },
    }),
    acceptableIntents: [/help.*move|pillow|support|pain relief/i],
    mustNot: noDose,
  },
];
