import { candidate, getPainCandidates, painParts } from "./phrases";
import {
  ContextPacketSchema,
  type Candidate,
  type ContextInput,
} from "./schemas";

type Row = [
  ta: string,
  en: string,
  intent: string,
  icon: string,
  reading?: string,
  urgency?: Candidate["urgency"],
];
/** Deterministic rehearsal sentences. This is a labelled fixture engine, not an LLM. */
export function getMockCandidates(input: ContextInput): Candidate[] {
  const c = ContextPacketSchema.parse(input);
  const lang = c.lang ?? c.outputLang;
  const path = c.fragment.topicPath ?? [];
  const raw = [c.fragment.raw, c.fragment.objectLabel, ...path]
    .join(" ")
    .toLowerCase();
  const has = (r: RegExp) => r.test(raw);
  const night =
    has(/night|raathiri|ராத்திரி|ராத்/) ||
    (c.routine?.dueNow ?? []).some((r) => /night/i.test(r.label));
  let rows: Row[] = [];
  const painPart = painParts.find(
    (p) =>
      path.includes(p.id) ||
      raw.includes(p.ta) ||
      (c.fragment.modality === "topic" && raw.includes(p.en)),
  );
  if (has(/chest|நெஞ்சு/))
    return filtered(getPainCandidates("chest", "", lang), c.exclude);
  if ((path[0] === "pain" || has(/வலி|pain|hurts/)) && painPart) {
    const side =
      path.includes("left") || raw.includes("left")
        ? "left"
        : path.includes("right") || raw.includes("right")
          ? "right"
          : undefined;
    if (c.round === 1)
      return filtered(getPainCandidates(painPart.id, side, lang), c.exclude);
    const body = side
      ? `${side} ${painPart.id === "shoulder" ? "arm" : painPart.en}`
      : painPart.en;
    rows = [
      [
        "கையை அசைக்க கொஞ்சம் உதவி பண்ணுங்க.",
        `Please help me move my ${body}.`,
        "help moving arm",
        "🤲",
        `${body} pain`,
        "elevated",
      ],
      [
        "கைக்கு கீழ தலையணை வைங்க.",
        `Can you put a pillow under my ${body}?`,
        "ask for support",
        "🛏️",
        `${body} support`,
      ],
      [
        "வலிக்கு ஏதாவது உதவி கிடைக்குமா?",
        "Can I have some help with the pain?",
        "ask pain relief",
        "🤕",
        "pain relief",
        "elevated",
      ],
    ];
  } else if (has(/table\b/) && c.round > 1) {
    rows = [
      [
        "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
        "Where are my tablets? Please bring them.",
        "request tablets",
        "💊",
        "table → tablet",
      ],
      [
        "டிவி கேபிள் வேலை செய்யல.",
        "The TV cable isn't working.",
        "report cable problem",
        "📺",
        "table → cable",
      ],
      [
        "டேப்லெட்ல வீடியோ போட்டு குடுங்க.",
        "Please play a video on the tablet.",
        "request tablet video",
        "📱",
        "table → tablet device",
      ],
    ];
  } else if (
    has(/tablet|medicine|மாத்திரை|மருந்து/) ||
    (has(/table\b/) &&
      (night ||
        c.substitutions?.some((s) => s.heard.toLowerCase() === "table")))
  ) {
    const reading = has(/table\b/)
      ? "table → tablet"
      : night
        ? "night tablet"
        : "medicine";
    rows = night
      ? [
          [
            "ராத்திரி மாத்திரை போடணும், கொஞ்சம் எடுத்துட்டு வாங்க.",
            "It's time for my night tablets — can you bring them?",
            "request night tablets",
            "💊",
            reading,
          ],
          [
            "நான் ராத்திரி மாத்திரை போட்டேனா?",
            "Did I take my night tablets?",
            "ask if medicine taken",
            "❓",
            reading,
          ],
          [
            "ராத்திரி மாத்திரை தீர்ந்து போச்சு.",
            "My night tablets have run out.",
            "report medicine finished",
            "📦",
            reading,
          ],
        ]
      : [
          [
            "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
            "Please bring me my tablets.",
            "request tablets",
            "💊",
            reading,
          ],
          [
            "நான் மாத்திரை போட்டேனா?",
            "Did I take my tablets?",
            "ask if medicine taken",
            "❓",
            reading,
          ],
          [
            "மாத்திரை தீர்ந்து போச்சு.",
            "My tablets have run out.",
            "report medicine finished",
            "📦",
            reading,
          ],
        ];
  } else if (has(/table\b/)) {
    rows = [
      [
        "டேபிள துடைக்கணும்.",
        "Please clean the table.",
        "clean table",
        "🧽",
        "table",
      ],
      [
        "டேபிள் இங்க கொண்டு வாங்க.",
        "Please move the table here.",
        "move table",
        "🪑",
        "table",
      ],
      [
        "டேபிள் மேல என்ன இருக்கு?",
        "What's on the table?",
        "ask table contents",
        "❓",
        "table",
      ],
    ];
  } else if (
    has(/தண்ணி|தண்ணீர்|water|bottle|cup/) ||
    raw.trim() === "drink" ||
    (path[0] === "drink" && path.length === 1)
  ) {
    rows = [
      [
        "கொஞ்சம் தண்ணி குடுங்க.",
        "Please give me some water.",
        "request water",
        "💧",
        "water",
      ],
      [
        "தண்ணி பாட்டில் காலியா இருக்கு, நிரப்பி வைங்க.",
        "The water bottle is empty; please refill it.",
        "refill bottle",
        "🚰",
        "water",
      ],
      [
        "சுடு தண்ணி வேணும்.",
        "I want some warm water.",
        "want warm water",
        "♨️",
        "warm water",
      ],
    ];
  } else if (has(/rasam|ரசம்/)) {
    rows = [
      [
        "ரசம் சாதம் போதும்.",
        "Rasam rice is enough for me.",
        "choose rasam rice",
        "🍲",
        "rasam",
      ],
      [
        "கொஞ்சம் ரசம் மட்டும் குடிக்கணும்.",
        "I only want to drink some rasam.",
        "drink rasam",
        "🥣",
        "rasam",
      ],
      [
        "ரசம் வேணாம், வேற ஏதாவது குடுங்க.",
        "I don't want rasam; please give me something else.",
        "refuse rasam",
        "🙅",
        "rasam",
      ],
    ];
  } else if (
    has(/sugar|சக்கரை|சர்க்கரை/) &&
    /coffee|காபி/.test(c.partnerQuestion?.text ?? raw)
  ) {
    rows = [
      [
        "ஆமா, சக்கரை போட்டு காபி குடுங்க.",
        "Yes, please give me coffee with sugar.",
        "yes with sugar",
        "☕",
        "coffee sugar",
      ],
      [
        "ஆமா, சக்கரை கொஞ்சமா போடுங்க.",
        "Yes, with less sugar please.",
        "yes less sugar",
        "☕",
        "less sugar",
      ],
      [
        "ஆமா, சக்கரை இல்லாம குடுங்க.",
        "Yes, without sugar please.",
        "yes no sugar",
        "☕",
        "no sugar",
      ],
    ];
  } else if (has(/coffee|காபி|டீ|tea/)) {
    const tea = has(/டீ|tea/),
      ta = tea ? "டீ" : "காபி",
      en = tea ? "tea" : "coffee";
    rows = [
      [
        `கொஞ்சம் ${ta} குடுங்க.`,
        `Please give me some ${en}.`,
        `request ${en}`,
        "☕",
        en,
      ],
      [
        `${ta} ரொம்ப சூடா இருக்கு.`,
        `The ${en} is too hot.`,
        `${en} too hot`,
        "♨️",
        en,
      ],
      [`${ta} வேணாம்.`, `I do not want ${en}.`, `refuse ${en}`, "✋", en],
    ];
  } else if (has(/milk|பால்|juice|ஜூஸ்/)) {
    const juice = has(/juice|ஜூஸ்/),
      ta = juice ? "ஜூஸ்" : "பால்",
      en = juice ? "juice" : "milk";
    rows = [
      [
        `கொஞ்சம் ${ta} குடுங்க.`,
        `Please give me some ${en}.`,
        `request ${en}`,
        "🥛",
        en,
      ],
      [`${ta} வேணாம்.`, `I do not want ${en}.`, `refuse ${en}`, "✋", en],
      [
        `${ta} இன்னும் கொஞ்சம் வேணும்.`,
        `I would like some more ${en}.`,
        `more ${en}`,
        "🥛",
        en,
      ],
    ];
  } else if (has(/spectacles|glasses|கண்ணாடி/)) {
    rows = [
      [
        "என் கண்ணாடி எடுத்து குடுங்க.",
        "Please give me my glasses.",
        "request glasses",
        "👓",
        "glasses",
      ],
      [
        "என் கண்ணாடிய காணோம்.",
        "I can't find my glasses.",
        "find glasses",
        "🔎",
        "glasses",
      ],
      [
        "கண்ணாடிய துடைச்சு குடுங்க.",
        "Please clean my glasses.",
        "clean glasses",
        "🧽",
        "glasses",
      ],
    ];
  } else if (has(/fan|ஃபேன்/)) {
    rows = [
      [
        "ஃபேன் போட்டு விடுங்க.",
        "Please switch on the fan.",
        "switch fan on",
        "🌀",
        "fan",
      ],
      [
        "ஃபேனை நிறுத்துங்க.",
        "Please switch off the fan.",
        "switch fan off",
        "✋",
        "fan",
      ],
      [
        "ஃபேன் வேகத்தை கொஞ்சம் மாத்துங்க.",
        "Please change the fan speed.",
        "change fan speed",
        "🌀",
        "fan",
      ],
    ];
  } else if (has(/toilet|bathroom|பாத்ரூம்/)) {
    rows = [
      [
        "பாத்ரூம் போகணும்.",
        "I need to go to the toilet.",
        "need toilet",
        "🚻",
        "toilet",
      ],
      [
        "எழுந்திருக்க உதவி பண்ணுங்க.",
        "Please help me get up.",
        "help getting up",
        "🤲",
        "toilet",
      ],
      [
        "முகம் கழுவணும்.",
        "I want to wash my face.",
        "want to wash",
        "🚿",
        "wash",
      ],
    ];
  } else if (has(/food|சாப்பாடு|idli|இட்லி|dosa|தோசை|rice|சாதம்/)) {
    const idli = has(/idli|இட்லி/),
      dosa = has(/dosa|தோசை/),
      rice = has(/rice|சாதம்/);
    const ta = idli ? "இட்லி" : dosa ? "தோசை" : rice ? "சாதம்" : "சாப்பாடு",
      en = idli ? "idli" : dosa ? "dosa" : rice ? "rice" : "food";
    rows = [
      [`${ta} வேணும்.`, `I would like some ${en}.`, "request food", "🍛", en],
      [
        `${ta} இப்ப வேணாம்.`,
        `I do not want ${en} now.`,
        "refuse food",
        "✋",
        en,
      ],
      [
        `${ta} கொஞ்சம் சூடு பண்ணி குடுங்க.`,
        `Please warm up my ${en}.`,
        "warm up food",
        "♨️",
        en,
      ],
    ];
  } else if (has(/rest|sleep|படுக்க|தூக்க|ஓய்வு/)) {
    rows = [
      [
        "கொஞ்சம் படுக்கணும்.",
        "I want to lie down.",
        "want to lie down",
        "🛏️",
        "rest",
      ],
      [
        "எனக்கு போர்வை குடுங்க.",
        "Please give me a blanket.",
        "request blanket",
        "🛌",
        "rest",
      ],
      [
        "கொஞ்சம் அமைதியா இருங்க.",
        "I would like some quiet.",
        "request quiet",
        "🤫",
        "rest",
      ],
    ];
  } else if (has(/tv_phone|டிவி|phone|tv\b/) && !has(/meena|மீனா/)) {
    rows = [
      [
        "டிவி போட்டு விடுங்க.",
        "Please turn on the TV.",
        "turn on television",
        "📺",
        "TV",
      ],
      [
        "என் ஃபோன் எடுத்து குடுங்க.",
        "Please give me my phone.",
        "request phone",
        "📱",
        "phone",
      ],
      [
        "டிவி சத்தத்தை குறைங்க.",
        "Please turn down the TV volume.",
        "reduce TV volume",
        "🔉",
        "TV",
      ],
    ];
  } else if (has(/feelings|மனசு|களைப்பு/)) {
    rows = [
      [
        "எனக்கு களைப்பா இருக்கு.",
        "I feel tired.",
        "feel tired",
        "😌",
        "feelings",
      ],
      [
        "எனக்கு தனியா இருக்கு.",
        "I feel lonely.",
        "feel lonely",
        "🤝",
        "feelings",
      ],
      [
        "எனக்கு சந்தோஷமா இருக்கு.",
        "I feel happy.",
        "feel happy",
        "🙂",
        "feelings",
      ],
    ];
  } else if (has(/prayer|சாமி/)) {
    rows = [
      ["சாமி கும்பிடணும்.", "I want to pray.", "want to pray", "🙏", "prayer"],
      [
        "விளக்கு ஏத்துங்க.",
        "Please light the lamp.",
        "light lamp",
        "🪔",
        "prayer",
      ],
      [
        "கொஞ்சம் அமைதியா இருக்கணும்.",
        "I want some quiet time.",
        "quiet time",
        "🕯️",
        "prayer",
      ],
    ];
  } else if (has(/go_out|வெளியே|walk/)) {
    rows = [
      [
        "கொஞ்சம் வெளியே போகணும்.",
        "I want to go outside.",
        "go outside",
        "🚶",
        "go outside",
      ],
      [
        "என்கூட கொஞ்சம் நடந்து வாங்க.",
        "Please walk with me.",
        "walk together",
        "🤝",
        "walk",
      ],
      [
        "வீட்டுக்குள்ள போகணும்.",
        "I want to go inside.",
        "go inside",
        "🏠",
        "go inside",
      ],
    ];
  } else {
    const person = c.people?.find((p) =>
      [p.name, ...p.aliases].some((n) => raw.includes(n.toLowerCase())),
    );
    if (person) {
      const name =
        lang === "ta"
          ? (person.aliases.find((n) => /[\u0B80-\u0BFF]/.test(n)) ??
            person.name)
          : person.name;
      if (has(/school/))
        rows = [
          [
            `${name} ஸ்கூல்ல இருந்து வந்தாச்சா?`,
            `Has ${person.name} come back from school?`,
            "ask school return",
            "🏫",
            `${person.name} school`,
          ],
          [
            `${name}கிட்ட பேசணும்.`,
            `I want to talk to ${person.name}.`,
            "talk to family",
            "💬",
            person.name,
          ],
          [
            `${name}யை கூட்டிட்டு வாங்க.`,
            `Please pick up ${person.name}.`,
            "pick up family",
            "🚶",
            person.name,
          ],
        ];
      else
        rows = [
          [
            `${name}கிட்ட ஃபோன்ல பேசணும்.`,
            `I want to call ${person.name}.`,
            "call family",
            "📞",
            `${person.name} phone`,
          ],
          [
            `${name} ஃபோன் பண்ணாங்களா?`,
            `Has ${person.name} called?`,
            "ask about call",
            "❓",
            `${person.name} phone`,
          ],
          [
            `${name}யை எனக்கு ஃபோன் பண்ண சொல்லுங்க.`,
            `Please ask ${person.name} to call me.`,
            "request callback",
            "📲",
            `${person.name} phone`,
          ],
        ];
    }
    // Unknown fragments intentionally produce fewer than three: no fabricated filler.
  }
  return filtered(
    rows.map(([ta, en, intent, icon, reading, urgency]) =>
      candidate(lang === "ta" ? ta : en, en, intent, icon, reading, urgency),
    ),
    c.exclude,
  );
}
function filtered(candidates: Candidate[], exclude: string[]): Candidate[] {
  const rejected = new Set(
    exclude.map((t) => t.normalize("NFC").trim().toLowerCase()),
  );
  return candidates
    .filter((c) => !rejected.has(c.text.normalize("NFC").trim().toLowerCase()))
    .slice(0, 3);
}
