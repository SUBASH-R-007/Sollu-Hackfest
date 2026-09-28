import Dexie, { type EntityTable } from "dexie";
import type {
  Attempt,
  Candidate,
  Contact,
  Lang,
  MemoryEntry,
  RoutineItem,
  WordSubstitution,
} from "@sollu/shared";

export interface Settings {
  name: string;
  lang: Lang;
  hand: "left" | "right";
  keepLeft: boolean;
  textScale: 1 | 1.25 | 1.5;
  highContrast: boolean;
  showGloss: boolean;
  twoStep: boolean;
  choiceCount: 1 | 2 | 3;
  tapFilterMs: number;
  pauseSeconds: number;
  speechRate: number;
  quietMode: boolean;
  speakerGender: "female" | "male" | "unspecified";
  dialectNote: string;
  sentenceStyle: "brief" | "natural" | "polite";
  sentenceLength: 8 | 12 | 18;
  shareRecentContext: boolean;
  sharePersonalContext: boolean;
  communicationPreferences: string;
  reducedMotion: boolean;
  preferredInput: "speech" | "type" | "topics" | "camera";
  stage: boolean;
  demo: boolean;
  demoTime: string;
  demoSetAt: number;
  addressee: string;
  place: "home" | "clinic" | "hospital" | "outside" | "other";
  pinHash: string;
  contacts: Contact[];
  routines: RoutineItem[];
  vocabulary: string[];
}
export interface Recording {
  id: string;
  text: string;
  lang: Lang;
  blob: Blob;
  consentId: string;
  createdAt: number;
}
export interface Phrase {
  id: string;
  candidate: Candidate;
  lang: Lang;
  pinned: boolean;
}
export interface Consent {
  id: string;
  name: string;
  at: number;
  scope: "recorded_phrases";
  givenBy: "self" | "self_supported" | "voice_donor";
}
export interface Pairing {
  roomId: string;
  grant: string;
  key: string;
  role: "patient" | "care";
  name: string;
  contactId: string;
}
export const db = new Dexie("sollu") as Dexie & {
  kv: EntityTable<{ key: string; value: unknown }, "key">;
  attempts: EntityTable<Attempt, "id">;
  recordings: EntityTable<Recording, "id">;
  phrases: EntityTable<Phrase, "id">;
  memories: EntityTable<MemoryEntry, "id">;
  substitutions: EntityTable<WordSubstitution, "id">;
  consents: EntityTable<Consent, "id">;
};
db.version(1).stores({
  kv: "key",
  attempts: "id,startedAt,outcome",
  recordings: "id,lang",
  phrases: "id,lang",
  memories: "id,lang,timeBucket",
  substitutions: "id",
  consents: "id",
});
export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}
export async function setKV(key: string, value: unknown) {
  await db.kv.put({ key, value });
}
export const defaultSettings: Settings = {
  name: "Amma",
  lang: "ta",
  hand: "left",
  keepLeft: true,
  textScale: 1,
  highContrast: false,
  showGloss: true,
  twoStep: false,
  choiceCount: 3,
  tapFilterMs: 400,
  pauseSeconds: 3,
  speechRate: 0.9,
  quietMode: false,
  speakerGender: "unspecified",
  dialectNote: "",
  sentenceStyle: "natural",
  sentenceLength: 12,
  shareRecentContext: false,
  sharePersonalContext: false,
  communicationPreferences: "",
  reducedMotion: false,
  preferredInput: "speech",
  stage: false,
  demo: true,
  demoTime: "20:58",
  demoSetAt: Date.now(),
  addressee: "priya",
  place: "home",
  pinHash: "",
  contacts: [
    {
      id: "priya",
      name: "Priya",
      relation: "daughter-in-law",
      aliases: ["ப்ரியா"],
      register: "respectful",
      lang: "ta",
      isCaregiver: true,
    },
    {
      id: "karthik",
      name: "Karthik",
      relation: "son",
      aliases: ["கார்த்திக்", "Karthi"],
      register: "familiar",
      lang: "ta",
      isCaregiver: true,
    },
    {
      id: "meena",
      name: "Meena",
      relation: "daughter",
      aliases: ["மீனா"],
      register: "familiar",
      lang: "ta",
      isCaregiver: false,
    },
    {
      id: "rao",
      name: "Dr. Rao",
      relation: "doctor",
      aliases: ["Rao"],
      register: "respectful",
      lang: "en",
      isCaregiver: false,
    },
  ],
  routines: [
    ["coffee", "Morning coffee", "drink", "07:00"],
    ["breakfast", "Morning tablets", "medicine", "08:30"],
    ["lunch", "Lunch", "food", "13:00"],
    ["walk", "Evening walk", "go_out", "16:00"],
    ["prayer", "Evening lamp & prayer", "prayer", "18:30"],
    ["tv", "TV serial", "tv_phone", "19:30"],
    ["tablets", "Night tablets", "medicine", "21:00"],
    ["sleep", "Sleep", "rest", "21:30"],
  ].map(([id, label, topic, time]) => ({
    id,
    label,
    topic,
    time,
    days: [0, 1, 2, 3, 4, 5, 6],
    source: "caregiver",
    confirmed: true,
  })) as RoutineItem[],
  vocabulary: [
    "filter coffee",
    "idli",
    "rasam rice",
    "Aadhav’s school",
    "balcony chair",
    "TV serial",
  ],
};
export async function hashPin(pin: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`sollu-local-pin:${pin}`),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const recordingId = (text: string, lang: Lang) =>
  `${lang}:${text.normalize("NFC").trim()}`;
