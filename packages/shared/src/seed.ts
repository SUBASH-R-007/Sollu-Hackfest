import type { Contact, Profile, RoutineItem, VocabItem } from "./schemas";

const allDays = [0, 1, 2, 3, 4, 5, 6];
export const demoSeed: {
  profile: Profile;
  contacts: Contact[];
  routine: RoutineItem[];
  vocabulary: VocabItem[];
  places: { id: string; label: string }[];
} = {
  profile: {
    id: "me",
    preferredName: "Amma",
    speakerGender: "female",
    primaryLang: "ta",
    otherLangs: ["en"],
    dialectNote: "Chennai Tamil",
    uiLang: "ta",
    dualLabels: true,
    hand: "left",
    keepLeft: true,
    textScale: 1,
    gridSize: 4,
    tapFilterMs: 400,
    twoStepConfirm: false,
    previewEnabled: true,
    volumeBoostDb: 0,
    prefetchAudio: "first",
    showGloss: true,
    cloudVisionConsent: false,
    createdAt: 0,
  },
  contacts: [
    {
      id: "karthik",
      name: "Karthik",
      aliases: ["கார்த்திக்", "Karthi"],
      relation: "son",
      register: "familiar",
      lang: "ta",
      isCaregiver: true,
    },
    {
      id: "priya",
      name: "Priya",
      aliases: ["ப்ரியா"],
      relation: "daughter-in-law",
      register: "respectful",
      lang: "ta",
      isCaregiver: true,
    },
    {
      id: "meena",
      name: "Meena",
      aliases: ["மீனா"],
      relation: "daughter (Bengaluru)",
      register: "familiar",
      lang: "ta",
      isCaregiver: false,
    },
    {
      id: "aadhav",
      name: "Aadhav",
      aliases: ["ஆதவ்"],
      relation: "grandson",
      register: "familiar",
      lang: "ta",
      isCaregiver: false,
    },
    {
      id: "anjali",
      name: "Nurse Anjali",
      aliases: ["Anjali", "அஞ்சலி"],
      relation: "home nurse",
      register: "respectful",
      lang: "ta",
      isCaregiver: false,
    },
    {
      id: "rao",
      name: "Dr. Rao",
      aliases: ["Rao", "ராவ்"],
      relation: "doctor",
      register: "respectful",
      lang: "en",
      isCaregiver: false,
    },
  ],
  routine: [
    ["coffee", "Morning coffee", "drink", "07:00"],
    ["morning-tablets", "Morning tablets", "medicine", "08:30"],
    ["lunch", "Lunch", "food", "13:00"],
    ["walk", "Evening walk", "go_out", "16:00"],
    ["prayer", "Evening lamp & prayer", "prayer", "18:30"],
    ["tv", "TV serial", "tv_phone", "19:30"],
    ["night-tablets", "Night tablets", "medicine", "21:00"],
    ["sleep", "Sleep", "rest", "21:30"],
  ].map(([id, label, topic, time]) => ({
    id: id!,
    label: label!,
    topic: topic as RoutineItem["topic"],
    time: time!,
    days: allDays,
    source: "caregiver",
    confirmed: true,
    isSample: true,
  })),
  vocabulary: [
    ["coffee", "filter coffee", "drink"],
    ["idli", "idli", "food"],
    ["rasam", "rasam rice", "food"],
    ["school", "Aadhav's school", "place"],
    ["chair", "balcony chair", "object"],
    ["serial", "TV serial", "show"],
  ].map(([id, term, kind]) => ({
    id: id!,
    term: term!,
    kind: kind as VocabItem["kind"],
    source: "caregiver",
    confirmed: true,
  })),
  places: [{ id: "home", label: "home" }],
};
export const DEMO_SEED = demoSeed;
