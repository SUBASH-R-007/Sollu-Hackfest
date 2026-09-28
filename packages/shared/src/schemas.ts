import { z } from "zod";

export const LangSchema = z.enum(["ta", "en"]);
export type Lang = z.infer<typeof LangSchema>;
export const ENABLED_LANGS: Lang[] = ["ta", "en"];
export const TopicIdSchema = z.enum([
  "medicine",
  "food",
  "drink",
  "toilet",
  "pain",
  "people",
  "feelings",
  "rest",
  "tv_phone",
  "prayer",
  "go_out",
]);
export type TopicId = z.infer<typeof TopicIdSchema>;
export const UrgencySchema = z.enum(["none", "elevated", "emergency"]);
export type Urgency = z.infer<typeof UrgencySchema>;
const short = z.string().trim().max(120);
const sentence = z.string().trim().min(1).max(500);
export const CandidateSchema = z.object({
  text: sentence,
  reading: z.string().trim().min(1).max(40),
  gloss_en: sentence,
  intent: z.string().trim().min(1).max(80),
  keyword: short,
  icon: z.string().max(24),
  urgency: UrgencySchema,
  sig: z.string().max(2048).optional(),
  lang: LangSchema.optional(),
  intentId: z.string().min(1).max(120).optional(),
  speechAct: z
    .enum(["request", "refuse", "question", "report", "repair", "social"])
    .optional(),
  polarity: z.enum(["positive", "negative", "uncertain"]).optional(),
  subject: short.optional(),
  objectId: short.optional(),
  bodyPart: short.optional(),
  side: z.enum(["left", "right"]).optional(),
  timeScope: z.enum(["now", "past", "future", "unspecified"]).optional(),
  requestedAttribute: short.optional(),
  evidenceRefs: z.array(z.string().max(160)).max(20).optional(),
  templateVersion: z.string().max(40).optional(),
  source: z
    .enum([
      "catalog",
      "template",
      "mock",
      "local",
      "memory",
      "personal",
      "cache",
    ])
    .optional(),
});
export type Candidate = z.infer<typeof CandidateSchema>;
export const FragmentSchema = z.object({
  modality: z.enum(["speech", "text", "topic", "camera"]),
  raw: z.string().max(500),
  sttAlternatives: z.array(short).max(5).optional(),
  topicPath: z.array(short).max(4).optional(),
  objectLabel: short.optional(),
  objectSource: z.enum(["personal", "coco", "llm"]).optional(),
});
export type Fragment = z.infer<typeof FragmentSchema>;
export const TimeBucketSchema = z.enum([
  "early_morning",
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
  "late_night",
]);
export type TimeBucket = z.infer<typeof TimeBucketSchema>;
const RoutineContextSchema = z.object({
  label: short,
  topic: TopicIdSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/),
  learned: z.boolean().optional(),
});
export const ContextPacketSchema = z.object({
  fragment: FragmentSchema,
  outputLang: LangSchema.default("ta"),
  lang: LangSchema.optional(),
  now: z
    .object({
      localTime: z.string().regex(/^\d{2}:\d{2}$/),
      weekday: z.number().int().min(0).max(6),
      timeBucket: TimeBucketSchema,
    })
    .optional(),
  place: z.enum(["home", "hospital", "clinic", "outside", "other"]).optional(),
  speaker: z
    .object({
      preferredName: short,
      gender: z.enum(["female", "male", "unspecified"]),
      dialectNote: short.optional(),
    })
    .optional(),
  addressee: z
    .object({
      id: short.optional(),
      name: short,
      relation: short,
      register: z.enum(["respectful", "familiar"]),
    })
    .optional(),
  inputLangHints: z.array(LangSchema).max(2).optional(),
  people: z
    .array(
      z.object({
        name: short,
        relation: short,
        aliases: z.array(short).max(10),
      }),
    )
    .max(10)
    .optional(),
  routine: z
    .object({
      dueNow: z.array(RoutineContextSchema).max(8),
      justPassed: z.array(RoutineContextSchema).max(8),
    })
    .optional(),
  partnerQuestion: z
    .object({
      text: sentence,
      lang: LangSchema,
      minutesAgo: z.number().min(0).max(5),
    })
    .optional(),
  recentTurns: z
    .array(
      z.object({
        speaker: z.enum(["person", "partner"]),
        text: sentence,
        minutesAgo: z.number().min(0).max(10),
      }),
    )
    .max(3)
    .optional(),
  vocabulary: z
    .array(z.object({ term: short, kind: short, meaning: short.optional() }))
    .max(20)
    .optional(),
  substitutions: z
    .array(
      z.object({
        heard: short,
        means: short,
        count: z.number().int().min(0),
        confirmed: z.boolean().optional(),
        lang: LangSchema.optional(),
        place: z
          .enum(["home", "hospital", "clinic", "outside", "other"])
          .optional(),
        addresseeId: short.optional(),
      }),
    )
    .max(10)
    .optional(),
  ownExamples: z
    .array(
      z.object({ fragment: short, sentence, timeBucket: TimeBucketSchema }),
    )
    .max(5)
    .optional(),
  round: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  exclude: z.array(sentence).max(9).default([]),
  rejectedMeaningKeys: z.array(z.string().max(800)).max(30).optional(),
});
export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export type ContextInput = z.input<typeof ContextPacketSchema>;
export const ConsentRecordSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum([
      "app_use",
      "voice_clone",
      "keep_samples",
      "cloud_vision",
      "study",
    ]),
    givenBy: z.enum([
      "self",
      "self_supported",
      "lawful_guardian",
      "voice_donor",
    ]),
    name: short.min(1),
    relation: short.optional(),
    helper: short.optional(),
    method: short.min(1),
    guardianReference: short.optional(),
    at: z.number().positive(),
    withdrawnAt: z.number().optional(),
  })
  .superRefine((v, c) => {
    if (v.givenBy === "lawful_guardian" && !v.guardianReference)
      c.addIssue({
        code: "custom",
        message: "Guardian verification reference required",
        path: ["guardianReference"],
      });
  });
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export const SignSourceSchema = z.enum([
  "candidate",
  "memory",
  "quick",
  "default",
  "template",
  "studio",
  "caregiver",
]);
export type SignSource = z.infer<typeof SignSourceSchema>;
export const SignRequestSchema = z.object({
  text: sentence,
  lang: LangSchema,
  source: SignSourceSchema,
  proofSig: z.string().max(2048).optional(),
});
export const TtsRequestSchema = z.object({
  text: sentence,
  lang: LangSchema,
  sig: z.string().min(1).max(2048),
  voiceGrant: z.string().max(2048).optional(),
  preview: z.boolean().optional(),
});
export const ProfileSchema = z.object({
  id: z.literal("me"),
  preferredName: short,
  speakerGender: z.enum(["female", "male", "unspecified"]),
  primaryLang: LangSchema,
  otherLangs: z.array(LangSchema),
  dialectNote: short.optional(),
  uiLang: LangSchema,
  dualLabels: z.boolean(),
  hand: z.enum(["left", "right"]),
  keepLeft: z.boolean(),
  textScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5)]),
  gridSize: z.union([z.literal(4), z.literal(6), z.literal(9)]),
  tapFilterMs: z.number().min(0).max(2000),
  twoStepConfirm: z.boolean(),
  previewEnabled: z.boolean(),
  volumeBoostDb: z.union([z.literal(0), z.literal(3), z.literal(6)]),
  prefetchAudio: z.enum(["all", "first", "none"]),
  showGloss: z.boolean(),
  cloudVisionConsent: z.boolean(),
  createdAt: z.number(),
});
export type Profile = z.infer<typeof ProfileSchema>;
export const ContactSchema = z.object({
  id: short,
  name: short,
  aliases: z.array(short),
  relation: short,
  register: z.enum(["respectful", "familiar"]),
  lang: LangSchema.optional(),
  phone: short.optional(),
  isCaregiver: z.boolean(),
});
export type Contact = z.infer<typeof ContactSchema>;
export const RoutineItemSchema = z.object({
  id: short,
  label: short,
  topic: TopicIdSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)),
  source: z.enum(["caregiver", "learned"]),
  confirmed: z.boolean(),
});
export type RoutineItem = z.infer<typeof RoutineItemSchema>;
export const VocabItemSchema = z.object({
  id: short,
  term: short,
  kind: z.enum([
    "person",
    "food",
    "drink",
    "medicine_nickname",
    "place",
    "object",
    "activity",
    "show",
    "other",
  ]),
  meaning: short.optional(),
  lang: LangSchema.optional(),
  source: z.enum(["caregiver", "suggested"]),
  confirmed: z.boolean(),
});
export type VocabItem = z.infer<typeof VocabItemSchema>;
export const AttemptRoundSchema = z.object({
  round: z.number(),
  source: z.enum(["llm", "template", "memory", "mock", "local"]),
  model: z.string().optional(),
  latencyMs: z.number(),
  candidates: z.array(CandidateSchema),
  chosenIndex: z.number().int().min(0).max(2).optional(),
  noneOfThese: z.boolean(),
  usualShown: z.boolean(),
  usualChosen: z.boolean(),
});
export const AttemptSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  outcome: z
    .enum(["spoken", "abandoned", "topics_fallback", "alerted"])
    .optional(),
  modality: FragmentSchema.shape.modality,
  fragmentRaw: z.string(),
  sttText: z.string().optional(),
  sttRetries: z.number().default(0),
  topicPath: z.array(z.string()).optional(),
  objectLabel: z.string().optional(),
  objectSource: FragmentSchema.shape.objectSource,
  addresseeRelation: z.string().optional(),
  addresseeId: short.optional(),
  outputLang: LangSchema,
  place: z.string(),
  timeBucket: TimeBucketSchema,
  demoClock: z.boolean(),
  rounds: z.array(AttemptRoundSchema),
  chosenText: z.string().optional(),
  chosenGloss: z.string().optional(),
  chosenIntent: z.string().optional(),
  chosenReading: z.string().optional(),
  partnerUnderstanding: sentence.optional(),
  taps: z.number(),
  timeToSpeechMs: z.number().optional(),
  firstAudioMs: z.number().optional(),
  offline: z.boolean(),
  demoCached: z.boolean(),
  communicationOutcome: z
    .enum(["intended", "understood", "needs_repair", "declined", "unconfirmed"])
    .optional(),
});
export type Attempt = z.infer<typeof AttemptSchema>;
export const MemoryEntrySchema = z.object({
  id: short,
  fragmentRaw: sentence,
  fragmentKey: short,
  reading: short,
  sentence,
  lang: LangSchema,
  addresseeId: short.optional(),
  timeBucket: TimeBucketSchema,
  placeLabel: short,
  count: z.number(),
  firstAt: z.number(),
  lastAt: z.number(),
  sig: z.string().optional(),
  confirmed: z.boolean().optional(),
  candidate: CandidateSchema.optional(),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export const WordSubstitutionSchema = z.object({
  id: short,
  heard: short,
  means: short,
  count: z.number(),
  lastAt: z.number(),
  confirmed: z.boolean().optional(),
  lang: LangSchema.optional(),
  place: z.enum(["home", "hospital", "clinic", "outside", "other"]).optional(),
  addresseeId: short.optional(),
});
export type WordSubstitution = z.infer<typeof WordSubstitutionSchema>;
export const RelayEnvelopeSchema = z
  .object({
    v: z.literal(1),
    iv: z
      .string()
      .regex(/^[A-Za-z0-9+/_=-]+$/)
      .max(32),
    ciphertext: z
      .string()
      .regex(/^[A-Za-z0-9+/_=-]+$/)
      .max(16000),
  })
  .strict();
export type RelayEnvelope = z.infer<typeof RelayEnvelopeSchema>;
