import type { Candidate, Lang, TopicId } from "./schemas";

export function candidate(
  text: string,
  gloss: string,
  intent: string,
  icon: string,
  reading = intent,
  urgency: Candidate["urgency"] = "none",
  keyword?: string,
): Candidate {
  return {
    text,
    gloss_en: gloss,
    intent,
    icon,
    reading: reading.slice(0, 40),
    urgency,
    keyword:
      keyword ??
      text
        .replace(/[.!?,—]/g, "")
        .split(/\s+/)
        .sort((a, b) => b.length - a.length)[0] ??
      text,
  };
}
export const quickPhrases: Record<
  Lang,
  Record<"help" | "yes" | "no" | "wait", Candidate>
> = {
  ta: {
    help: candidate(
      "உதவி வேணும்!",
      "I need help!",
      "request help",
      "🆘",
      "help",
      "emergency",
    ),
    yes: candidate("ஆமா", "Yes", "say yes", "👍"),
    no: candidate("இல்ல", "No", "say no", "✋"),
    wait: candidate(
      "கொஞ்சம் இருங்க",
      "Wait a moment, please",
      "ask to wait",
      "⏳",
    ),
  },
  en: {
    help: candidate(
      "I need help!",
      "I need help!",
      "request help",
      "🆘",
      "help",
      "emergency",
    ),
    yes: candidate("Yes", "Yes", "say yes", "👍"),
    no: candidate("No", "No", "say no", "✋"),
    wait: candidate(
      "Wait a moment, please",
      "Wait a moment, please",
      "ask to wait",
      "⏳",
    ),
  },
};
export const defaultPhrases: Record<Lang, Candidate[]> = {
  ta: [
    candidate(
      "பேச கொஞ்சம் நேரம் குடுங்க.",
      "Please give me time to speak.",
      "ask for time",
      "💬",
    ),
    candidate(
      "ஆமா, இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க.",
      "Please ask me yes-or-no questions.",
      "ask simple questions",
      "❓",
    ),
    candidate("நன்றி.", "Thank you.", "say thanks", "🙏"),
  ],
  en: [
    candidate(
      "Please give me time to speak.",
      "Please give me time to speak.",
      "ask for time",
      "💬",
    ),
    candidate(
      "Please ask me yes-or-no questions.",
      "Please ask me yes-or-no questions.",
      "ask simple questions",
      "❓",
    ),
    candidate("Thank you.", "Thank you.", "say thanks", "🙏"),
  ],
};
export const studioPhrases: Record<Lang, string[]> = {
  ta: ["வணக்கம், நான் பேசுறது கேக்குதா?"],
  en: ["Hello, can you hear me?"],
};
export const topics: { id: TopicId; icon: string; ta: string; en: string }[] = [
  { id: "medicine", icon: "💊", ta: "மாத்திரை", en: "Medicine" },
  { id: "food", icon: "🍛", ta: "சாப்பாடு", en: "Food" },
  { id: "drink", icon: "🥤", ta: "குடிக்க", en: "Drink" },
  { id: "toilet", icon: "🚻", ta: "பாத்ரூம்", en: "Toilet" },
  { id: "pain", icon: "🤕", ta: "வலி", en: "Pain" },
  { id: "people", icon: "👨‍👩‍👧", ta: "ஆட்கள்", en: "People" },
  { id: "feelings", icon: "😊", ta: "மனசு", en: "Feelings" },
  { id: "rest", icon: "🛏️", ta: "ஓய்வு", en: "Rest" },
  { id: "tv_phone", icon: "📺", ta: "டிவி / ஃபோன்", en: "TV & phone" },
  { id: "prayer", icon: "🙏", ta: "சாமி", en: "Prayer" },
  { id: "go_out", icon: "🚶", ta: "வெளியே", en: "Go out" },
];
export const painParts = [
  { id: "head", ta: "தலை", en: "head", paired: false },
  { id: "mouth", ta: "வாய் / பல்", en: "mouth", paired: false },
  { id: "throat", ta: "தொண்டை", en: "throat", paired: false },
  { id: "chest", ta: "நெஞ்சு", en: "chest", paired: false },
  { id: "stomach", ta: "வயிறு", en: "stomach", paired: false },
  { id: "back", ta: "முதுகு", en: "back", paired: false },
  { id: "eye", ta: "கண்", en: "eye", paired: true },
  { id: "ear", ta: "காது", en: "ear", paired: true },
  { id: "shoulder", ta: "தோள்", en: "shoulder", paired: true },
  { id: "arm", ta: "கை", en: "arm", paired: true },
  { id: "hip", ta: "இடுப்பு", en: "hip", paired: true },
  { id: "knee", ta: "முட்டி", en: "knee", paired: true },
  { id: "leg", ta: "கால்", en: "leg", paired: true },
  { id: "foot", ta: "பாதம்", en: "foot", paired: true },
] as const;
export function getPainCandidates(
  part: string,
  side: string | undefined,
  lang: Lang,
): Candidate[] {
  const p = painParts.find(
    (p) => p.id === part || p.ta === part || p.en === part,
  );
  if (!p) return [];
  if (p.paired && side !== "left" && side !== "right") return [];
  if (p.id === "chest")
    return [
      candidate(
        lang === "ta"
          ? "நெஞ்சு வலிக்குது, உடனே உதவி வேணும்."
          : "My chest hurts — I need help now.",
        "My chest hurts — I need help now.",
        "chest pain help",
        "🚨",
        "chest pain",
        "emergency",
      ),
      candidate(
        lang === "ta"
          ? "நெஞ்சு அடைக்குற மாதிரி இருக்கு."
          : "My chest feels tight.",
        "My chest feels tight.",
        "report chest tightness",
        "⚠️",
        "chest tightness",
        "emergency",
      ),
      candidate(
        lang === "ta"
          ? "மூச்சு விட கஷ்டமா இருக்கு."
          : "I'm finding it hard to breathe.",
        "I'm finding it hard to breathe.",
        "report breathing difficulty",
        "🫁",
        "breathing difficulty",
        "emergency",
      ),
    ];
  const name = [p.paired ? side : "", p.en].filter(Boolean).join(" ");
  const tamil = [p.paired ? (side === "left" ? "இடது" : "வலது") : "", p.ta]
    .filter(Boolean)
    .join(" ");
  return [
    candidate(
      lang === "ta"
        ? `${tamil} கொஞ்சம் வலிக்குது.`
        : `My ${name} hurts a little.`,
      `My ${name} hurts a little.`,
      "mild pain",
      "🤕",
      `${name} pain`,
      "none",
    ),
    candidate(
      lang === "ta" ? `${tamil} ரொம்ப வலிக்குது.` : `My ${name} hurts a lot.`,
      `My ${name} hurts a lot.`,
      "strong pain",
      "🤕",
      `${name} pain`,
      "elevated",
    ),
    candidate(
      lang === "ta"
        ? `${tamil} வலி தாங்க முடியல, உடனே உதவி வேணும்.`
        : `The pain in my ${name} is unbearable — I need help now.`,
      `The pain in my ${name} is unbearable — I need help now.`,
      "pain need help",
      "🆘",
      `${name} pain`,
      "elevated",
    ),
  ];
}
export function canonicalText(
  source: string,
  text: string,
  lang: Lang,
): boolean {
  const t = text.normalize("NFC");
  if (source === "quick")
    return Object.values(quickPhrases[lang]).some(
      (c) => c.text.normalize("NFC") === t,
    );
  if (source === "default")
    return defaultPhrases[lang].some((c) => c.text.normalize("NFC") === t);
  if (source === "studio") return studioPhrases[lang].includes(t);
  if (source === "template")
    return painParts.some((p) =>
      (p.paired ? ["left", "right"] : [""]).some((s) =>
        getPainCandidates(p.id, s, lang).some(
          (c) => c.text.normalize("NFC") === t,
        ),
      ),
    );
  return false;
}
export const numberWords: Record<Lang, string[]> = {
  en: [
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
    "hundred",
    "thousand",
    "million",
    "billion",
    "half",
    "quarter",
    "twice",
    "thrice",
    "double",
    "triple",
  ],
  ta: [
    "இரண்டு",
    "ரெண்டு",
    "மூன்று",
    "மூணு",
    "நான்கு",
    "நாலு",
    "ஐந்து",
    "அஞ்சு",
    "ஆறு",
    "ஏழு",
    "எட்டு",
    "ஒன்பது",
    "பத்து",
    "பதினொன்று",
    "பதினொண்ணு",
    "பன்னிரண்டு",
    "பனிரெண்டு",
    "பதின்மூன்று",
    "பதிமூணு",
    "பதினான்கு",
    "பதினைந்து",
    "பதினாறு",
    "பதினேழு",
    "பதினெட்டு",
    "பத்தொன்பது",
    "இருபது",
    "முப்பது",
    "நாற்பது",
    "ஐம்பது",
    "அறுபது",
    "எழுபது",
    "எண்பது",
    "தொண்ணூறு",
    "நூறு",
    "ஆயிரம்",
    "லட்சம்",
    "கோடி",
    "அரை",
  ],
};
