import { z } from "zod";

export const LOCAL_PATIENT_ID = "local-patient" as const;
export const CONDITION_IDS = [
  "aphasia",
  "dysarthria",
  "als",
  "laryngectomy",
  "parkinsons",
  "other",
] as const;
export const COMMUNICATION_METHODS = [
  "natural_speech",
  "aac",
  "electrolarynx",
  "tep",
  "esophageal",
  "mixed",
] as const;
export const PRACTICE_KINDS = ["word", "sentence", "script", "aac"] as const;
export const UNDERSTANDING_OPTIONS = [
  "yes",
  "partly",
  "no",
  "unknown",
] as const;
export type Condition = (typeof CONDITION_IDS)[number];
export type CommunicationMethod = (typeof COMMUNICATION_METHODS)[number];
export type PracticeKind = (typeof PRACTICE_KINDS)[number];
export type Understanding = (typeof UNDERSTANDING_OPTIONS)[number];
export type Daypart = "morning" | "afternoon" | "evening" | "night";

const boundedText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) =>
        ![...value].some(
          (char) =>
            char.charCodeAt(0) < 32 &&
            ![9, 10, 13].includes(char.charCodeAt(0)),
        ),
      "Remove control characters.",
    );
const identifier = boundedText(100, 1);
const timestamp = z.number().finite().nonnegative();
export const MAX_MEASURED_SECONDS = 24 * 60 * 60;
const seconds = z.number().finite().min(0).max(MAX_MEASURED_SECONDS).nullable();

/**
 * Elapsed time in seconds for a practice measure. Anything that cannot be a
 * valid measurement (negative, non-finite or beyond 24 hours, for example a
 * practice left open overnight) is missing, never zero or clamped.
 */
export function measuredSeconds(elapsedMs: number): number | null {
  const value = elapsedMs / 1000;
  return Number.isFinite(value) && value >= 0 && value <= MAX_MEASURED_SECONDS
    ? value
    : null;
}

export const MAX_PLAN_LINES = 20;
/** Friendly limits for the plan editor, checked before schema validation. */
export function planTextProblem(
  goals: string[],
  targets: string[],
): string | null {
  if (goals.length > MAX_PLAN_LINES)
    return `Keep participation goals to ${MAX_PLAN_LINES} lines or fewer (${goals.length} entered).`;
  if (goals.some((goal) => goal.length > 160))
    return "Keep each participation goal to 160 characters or fewer.";
  if (targets.length > MAX_PLAN_LINES)
    return `Keep personal practice targets to ${MAX_PLAN_LINES} lines or fewer (${targets.length} entered).`;
  if (targets.some((target) => target.length > 300))
    return "Keep each personal practice target to 300 characters or fewer.";
  return null;
}

/** Caregiver-readable message: the first validation issue, never raw JSON. */
export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  return error instanceof Error && error.message ? error.message : fallback;
}
const rating = z.number().int().min(0).max(10).nullable();
const understanding = z.enum(UNDERSTANDING_OPTIONS);
const communicationMethod = z.enum(COMMUNICATION_METHODS);

export const rehabProfileSchema = z.object({
  id: z.literal(LOCAL_PATIENT_ID),
  displayName: boundedText(80),
  condition: z.enum(CONDITION_IDS),
  language: z.enum(["en", "ta"]),
  communicationMethod,
  goals: z.array(boundedText(160, 1)).max(20),
  clinicianInstructions: boundedText(3000),
  weeklyTarget: z.number().int().min(1).max(21),
  practiceMinutes: z.number().int().min(1).max(15),
  fatigueLimit: z.number().int().min(1).max(10),
  updatedAt: timestamp,
});
export type RehabProfile = z.infer<typeof rehabProfileSchema>;

export const rehabPlanSchema = z
  .object({
    id: identifier,
    patientId: identifier,
    exerciseIds: z.array(identifier).max(30),
    customTargets: z.array(boundedText(300, 1)).max(20),
    updatedAt: timestamp,
  })
  .superRefine((plan, context) => {
    if (new Set(plan.exerciseIds).size !== plan.exerciseIds.length)
      context.addIssue({
        code: "custom",
        message: "Choose each exercise once.",
        path: ["exerciseIds"],
      });
    const normalized = plan.customTargets.map((target) =>
      target.normalize("NFKC").toLocaleLowerCase(),
    );
    if (new Set(normalized).size !== normalized.length)
      context.addIssue({
        code: "custom",
        message: "Keep custom practice targets distinct.",
        path: ["customTargets"],
      });
  });
export type RehabPlan = z.infer<typeof rehabPlanSchema>;

export const practiceRecordSchema = z
  .object({
    id: identifier,
    patientId: identifier,
    createdAt: timestamp,
    kind: z.enum(PRACTICE_KINDS),
    language: z.enum(["en", "ta"]),
    communicationMethod,
    target: boundedText(500, 1),
    transcript: boundedText(1000),
    rawTranscript: boundedText(1000).optional(),
    transcriptSource: z.enum(["none", "manual", "browser"]),
    transcriptReviewed: z.boolean(),
    confirmedMissedWords: z.array(boundedText(80, 1)).max(80),
    responseSeconds: seconds,
    recordingSeconds: seconds,
    fatigueBefore: rating,
    fatigueAfter: rating,
    effort: rating,
    selfUnderstanding: understanding,
    partnerUnderstanding: understanding,
    aacCompleted: z.boolean().nullable(),
    mediaIds: z.array(identifier).max(2),
    daypart: z.enum(["morning", "afternoon", "evening", "night"]),
    place: boundedText(80),
    notes: boundedText(2000),
  })
  .superRefine((practice, context) => {
    if (practice.transcriptSource === "none" && practice.transcript.trim())
      context.addIssue({
        code: "custom",
        message: "Select how the transcript was entered.",
        path: ["transcriptSource"],
      });
    if (new Set(practice.mediaIds).size !== practice.mediaIds.length)
      context.addIssue({
        code: "custom",
        message: "Evidence references must be distinct.",
        path: ["mediaIds"],
      });
  });
export type PracticeRecord = z.infer<typeof practiceRecordSchema>;

export const reviewRecordSchema = z.object({
  id: identifier,
  practiceId: identifier,
  patientId: identifier,
  reviewer: boundedText(100, 1),
  reviewedAt: timestamp,
  understanding,
  notes: boundedText(3000),
});
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_MEDIA_BYTES = 250 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 120;
export interface MediaRecord {
  id: string;
  patientId: string;
  practiceId: string;
  createdAt: number;
  kind: "audio" | "video";
  mimeType: string;
  blob: Blob;
  durationSeconds: number;
  consentAt: number;
}
export const mediaMetadataSchema = z.object({
  id: identifier,
  patientId: identifier,
  practiceId: identifier,
  createdAt: timestamp,
  kind: z.enum(["audio", "video"]),
  mimeType: boundedText(120, 1),
  durationSeconds: z.number().finite().min(0).max(MAX_RECORDING_SECONDS),
  consentAt: timestamp,
});
export function validateMedia(value: MediaRecord): MediaRecord {
  const metadata = mediaMetadataSchema.parse(value);
  if (
    !(value.blob instanceof Blob) ||
    value.blob.size === 0 ||
    value.blob.size > MAX_MEDIA_BYTES
  )
    throw new Error("Keep each recording below 25 MB.");
  const mime = metadata.mimeType.split(";")[0].trim().toLowerCase();
  const allowed =
    metadata.kind === "video"
      ? ["video/webm", "video/mp4"]
      : ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"];
  if (
    !allowed.includes(mime) ||
    value.blob.type.split(";")[0].trim().toLowerCase() !== mime
  )
    throw new Error("Unsupported recording format.");
  if (metadata.consentAt > metadata.createdAt)
    throw new Error("Recording permission must precede the recording.");
  return { ...metadata, blob: value.blob };
}

export interface Exercise {
  id: string;
  kind: PracticeKind;
  title: string;
  target: string;
  language: "en" | "ta";
  conditions: Condition[];
  instruction: string;
}
export const CONDITION_PROFILES: {
  id: Condition;
  label: string;
  focus: string;
  caution: string;
}[] = [
  {
    id: "aphasia",
    label: "Aphasia",
    focus:
      "Practise personally useful words, supported conversation and communication repair.",
    caution:
      "Use pictures, writing, pointing or AAC whenever they help. Language difficulty is not a measure of intelligence.",
  },
  {
    id: "dysarthria",
    label: "Dysarthria",
    focus:
      "Practise useful messages using the communication strategies agreed with your speech-language therapist.",
    caution:
      "Use a comfortable voice and pace. Exercises and goals depend on the cause and individual assessment.",
  },
  {
    id: "als",
    label: "ALS / motor neurone disease",
    focus:
      "Prioritise reliable communication, AAC access, partner support and personally useful message practice.",
    caution:
      "Conserve energy and stop when tired. This app does not prescribe strengthening or promise recovery of progressive speech changes.",
  },
  {
    id: "laryngectomy",
    label: "After laryngectomy",
    focus:
      "Practise useful messages with your chosen communication method and therapist's instructions.",
    caution:
      "Natural-voice exercises may not apply. Electrolarynx, TEP and oesophageal speech need specialist guidance; this app does not assess device function.",
  },
  {
    id: "parkinsons",
    label: "Parkinson's disease",
    focus:
      "Practise functional communication and AAC alternatives using your individual therapy plan.",
    caution:
      "Choose a manageable time and stop when fatigued. This app does not deliver or prescribe intensive loudness treatment.",
  },
  {
    id: "other",
    label: "Other communication needs",
    focus:
      "Choose meaningful communication goals and the speech, writing, gesture or AAC approach that works for you.",
    caution:
      "A speech-language therapist can help choose a suitable individual plan. Participation and successful communication matter.",
  },
];
const allConditions: Condition[] = [...CONDITION_IDS];
export const EXERCISES: Exercise[] = [
  {
    id: "word-water",
    kind: "word",
    title: "A useful word",
    target: "water",
    language: "en",
    conditions: allConditions,
    instruction:
      "Say, type or point to this word using your chosen method. Rest whenever you need.",
  },
  {
    id: "word-help",
    kind: "word",
    title: "Ask for help",
    target: "help",
    language: "en",
    conditions: allConditions,
    instruction:
      "Practise this useful word with a partner if you wish. There is no time limit.",
  },
  {
    id: "sentence-time",
    kind: "sentence",
    title: "Ask for time",
    target: "Please give me time.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Use your comfortable communication method. You can pause or switch to AAC.",
  },
  {
    id: "sentence-water",
    kind: "sentence",
    title: "Make a request",
    target: "I would like some water.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Practise communicating the request. This is a message task, not an instruction to drink.",
  },
  {
    id: "sentence-break",
    kind: "sentence",
    title: "Ask for a break",
    target: "I need a break.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Practise a short message at a comfortable pace. Stop whenever you want.",
  },
  {
    id: "script-repair",
    kind: "script",
    title: "Repair a conversation",
    target: "That is not what I meant. Let me try again.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Practise with a partner, or use this as an AAC message. Ask whether your meaning was understood.",
  },
  {
    id: "script-introduce",
    kind: "script",
    title: "Explain communication needs",
    target: "I communicate in my own way. Please listen and give me time.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Use speech, text, pointing or your communication aid. Success is getting your meaning across.",
  },
  {
    id: "aac-choice",
    kind: "aac",
    title: "Choose a message",
    target: "I would like to choose.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Find or type this message using your communication aid. Ask your partner to confirm your meaning.",
  },
  {
    id: "aac-repeat",
    kind: "aac",
    title: "Ask for repetition",
    target: "Please say that again.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Select or type this message. Practise with a partner if available; speech recording is optional.",
  },
  {
    id: "aac-yes-no",
    kind: "aac",
    title: "Confirm your meaning",
    target: "Please ask me a yes or no question.",
    language: "en",
    conditions: allConditions,
    instruction:
      "Practise directing your partner to a way you can respond comfortably.",
  },
  // Tamil counterparts (`<id>-ta`) of the starter library, in everyday spoken
  // Tamil. Pending native-speaker review (docs/LANGUAGE_REVIEW.md).
  {
    id: "word-water-ta",
    kind: "word",
    title: "பயனுள்ள சொல்",
    target: "தண்ணி",
    language: "ta",
    conditions: allConditions,
    instruction:
      "உங்களுக்கு வசதியான முறையில் சொல்லுங்கள், எழுதுங்கள் அல்லது சுட்டிக்காட்டுங்கள். தேவைப்படும்போது ஓய்வெடுங்கள்.",
  },
  {
    id: "word-help-ta",
    kind: "word",
    title: "உதவி கேளுங்கள்",
    target: "உதவி",
    language: "ta",
    conditions: allConditions,
    instruction:
      "விருப்பமானால் துணையுடன் பயிற்சி செய்யுங்கள். நேர வரம்பு இல்லை.",
  },
  {
    id: "sentence-time-ta",
    kind: "sentence",
    title: "நேரம் கேளுங்கள்",
    target: "கொஞ்சம் நேரம் குடுங்க.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "உங்களுக்கு வசதியான முறையைப் பயன்படுத்துங்கள். இடையில் நிறுத்தலாம் அல்லது AAC-க்கு மாறலாம்.",
  },
  {
    id: "sentence-water-ta",
    kind: "sentence",
    title: "ஒரு கோரிக்கை",
    target: "எனக்கு தண்ணி வேணும்.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "கோரிக்கையைச் சொல்லிப் பழகுங்கள். இது பேசும் பயிற்சி மட்டும்; குடிக்கச் சொல்லும் அறிவுரை அல்ல.",
  },
  {
    id: "sentence-break-ta",
    kind: "sentence",
    title: "ஓய்வு கேளுங்கள்",
    target: "எனக்கு கொஞ்சம் ஓய்வு வேணும்.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "உங்கள் வேகத்தில் சிறிய செய்தியைப் பழகுங்கள். எப்போது வேண்டுமானாலும் நிறுத்தலாம்.",
  },
  {
    id: "script-repair-ta",
    kind: "script",
    title: "உரையாடலைச் சரிசெய்யுங்கள்",
    target: "நான் சொல்ல வந்தது அது இல்ல. மறுபடி சொல்றேன்.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "துணையுடன் பழகுங்கள், அல்லது AAC செய்தியாகப் பயன்படுத்துங்கள். உங்கள் பொருள் புரிந்ததா என்று கேளுங்கள்.",
  },
  {
    id: "script-introduce-ta",
    kind: "script",
    title: "உங்கள் தேவையைச் சொல்லுங்கள்",
    target: "நான் என் வழியில பேசுவேன். கொஞ்சம் பொறுமையா கேளுங்க.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "பேச்சு, எழுத்து, சுட்டுதல் அல்லது உங்கள் உதவிக் கருவியைப் பயன்படுத்துங்கள். உங்கள் பொருள் புரிவதே வெற்றி.",
  },
  {
    id: "aac-choice-ta",
    kind: "aac",
    title: "ஒரு செய்தியைத் தேர்ந்தெடுங்கள்",
    target: "நான் தேர்ந்தெடுக்கணும்.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "உங்கள் உதவிக் கருவியில் இந்தச் செய்தியைத் தேடுங்கள் அல்லது எழுதுங்கள். உங்கள் பொருளைத் துணையிடம் உறுதிசெய்யுங்கள்.",
  },
  {
    id: "aac-repeat-ta",
    kind: "aac",
    title: "மீண்டும் சொல்லச் சொல்லுங்கள்",
    target: "மறுபடி சொல்லுங்க.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "இந்தச் செய்தியைத் தேர்ந்தெடுங்கள் அல்லது எழுதுங்கள். பேச்சுப் பதிவு விருப்பத்துக்குரியது.",
  },
  {
    id: "aac-yes-no-ta",
    kind: "aac",
    title: "உங்கள் பொருளை உறுதிசெய்யுங்கள்",
    target: "ஆமா இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க.",
    language: "ta",
    conditions: allConditions,
    instruction:
      "நீங்கள் வசதியாகப் பதில் சொல்லும் வழியைத் துணைக்குக் காட்டிப் பழகுங்கள்.",
  },
];

/** The planned exercise in the practice language: a plan saved with English
 * IDs still gives a Tamil profile its Tamil counterparts (and vice versa). */
export function exerciseInLanguage(
  id: string,
  language: "en" | "ta",
): Exercise | undefined {
  const base = id.endsWith("-ta") ? id.slice(0, -3) : id;
  const wanted = language === "ta" ? `${base}-ta` : base;
  return EXERCISES.find(
    (exercise) => exercise.id === wanted && exercise.language === language,
  );
}

export function createDefaultProfile(now = Date.now()): RehabProfile {
  return {
    id: LOCAL_PATIENT_ID,
    displayName: "",
    condition: "other",
    language: "en",
    communicationMethod: "mixed",
    goals: [],
    clinicianInstructions: "",
    weeklyTarget: 3,
    practiceMinutes: 3,
    fatigueLimit: 5,
    updatedAt: now,
  };
}
export function createDefaultPlan(now = Date.now()): RehabPlan {
  return {
    id: "local-plan",
    patientId: LOCAL_PATIENT_ID,
    exerciseIds: ["sentence-time", "sentence-break", "aac-choice"],
    customTargets: [],
    updatedAt: now,
  };
}
export function daypartAt(date = new Date()): Daypart {
  const hour = date.getHours();
  return hour >= 4 && hour < 11
    ? "morning"
    : hour >= 11 && hour < 17
      ? "afternoon"
      : hour >= 17 && hour < 20
        ? "evening"
        : "night";
}

export const RehabProfileSchema = rehabProfileSchema;
export const RehabPlanSchema = rehabPlanSchema;
export const PracticeRecordSchema = practiceRecordSchema;
export const ReviewRecordSchema = reviewRecordSchema;
export const MediaManifestSchema = mediaMetadataSchema;
