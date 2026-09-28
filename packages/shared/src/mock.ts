import {
  candidate,
  getPainCandidates,
  getPainFollowupCandidates,
  painParts,
  numberWords,
  quickPhrases,
} from "./phrases";
import { getVocabularyCandidates, prepareCatalogFragment } from "./vocabulary";
import {
  ContextPacketSchema,
  type Candidate,
  type ContextInput,
  type ContextPacket,
} from "./schemas";

const norm = (text: string) => text.normalize("NFC").toLowerCase().trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, term: string) =>
  !!term &&
  new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${escape(norm(term))}(?=$|[^\\p{L}\\p{M}\\p{N}])`,
    "u",
  ).test(norm(text));
const negative = (raw: string) =>
  /\b(?:no|not|never|don['’]?t|without|venam|vendam|vendaam|illai)\b|வேணாம்|வேண்டாம்|இல்லை/u.test(
    raw,
  );

function card(
  c: ContextPacket,
  id: string,
  ta: string,
  en: string,
  speechAct: NonNullable<Candidate["speechAct"]>,
  objectId: string,
  icon: string,
  reading: string,
  extra: Partial<Candidate> = {},
): Candidate {
  return {
    ...candidate(
      c.outputLang === "ta" ? ta : en,
      en,
      id.replaceAll(".", " "),
      icon,
      reading,
    ),
    lang: c.outputLang,
    intentId: id,
    speechAct,
    polarity: speechAct === "refuse" ? "negative" : "positive",
    objectId,
    timeScope: "now",
    evidenceRefs: ["fragment"],
    templateVersion: "2",
    source: "catalog",
    ...extra,
  };
}
function contactCandidates(
  c: ContextPacket,
  raw: string,
): Candidate[] | undefined {
  const person = c.people?.find((p) =>
    [p.name, ...p.aliases].some((n) => mentions(raw, n)),
  );
  if (!person) return undefined;
  const direct = [pName(person.name), ...person.aliases.map(pName)].some(
    (n) => n === norm(raw),
  );
  if (
    !direct &&
    c.fragment.topicPath?.[0] !== "people" &&
    !/\b(?:phone|call|ph|school)\b|ஃபோன்|போன்|பேச|ஸ்கூல்/.test(raw)
  )
    return undefined;
  if (negative(raw)) return [];
  const ta =
    person.aliases.find((n) => /\p{Script=Tamil}/u.test(n)) ?? person.name;
  const extra = {
    subject: person.name,
    evidenceRefs: ["fragment", `person:${person.name}`],
  };
  if (/\bschool\b|ஸ்கூல்/.test(raw))
    return [
      card(
        c,
        "person.school.return",
        `${ta} ஸ்கூல்ல இருந்து வந்தாச்சா?`,
        `Has ${person.name} come back from school?`,
        "question",
        "person",
        "🏫",
        `${person.name} school`,
        extra,
      ),
      card(
        c,
        "person.talk",
        `${ta}கிட்ட பேசணும்.`,
        `I want to talk to ${person.name}.`,
        "request",
        "person",
        "💬",
        person.name,
        extra,
      ),
      card(
        c,
        "person.pickup",
        `${ta}யை கூட்டிட்டு வாங்க.`,
        `Please pick up ${person.name}.`,
        "request",
        "person",
        "🚶",
        person.name,
        extra,
      ),
    ];
  return [
    card(
      c,
      "person.call",
      `${ta}கிட்ட ஃபோன்ல பேசணும்.`,
      `I want to call ${person.name}.`,
      "request",
      "person",
      "📞",
      `${person.name} phone`,
      extra,
    ),
    card(
      c,
      "person.call.question",
      `${ta} ஃபோன் பண்ணாங்களா?`,
      `Has ${person.name} called?`,
      "question",
      "person",
      "❓",
      `${person.name} phone`,
      extra,
    ),
    card(
      c,
      "person.callback",
      `${ta}யை எனக்கு ஃபோன் பண்ண சொல்லுங்க.`,
      `Please ask ${person.name} to call me.`,
      "request",
      "person",
      "📲",
      `${person.name} phone`,
      extra,
    ),
  ];
}
const pName = norm;

/** Controlled bilingual suggestions. Fixtures are proposals, never inferred patient facts. */
export function getMockCandidates(input: ContextInput): Candidate[] {
  const c = ContextPacketSchema.parse(input);
  const prepared = prepareCatalogFragment(c);
  if (prepared.ambiguous) return [];
  const path = c.fragment.topicPath ?? [];
  const raw = norm(
    [prepared.text, c.fragment.objectLabel, ...path].filter(Boolean).join(" "),
  );
  const correction = prepared.reading ?? "";
  // Corrections have already been applied once; they must never form a chain.
  const corrected = {
    ...c,
    substitutions: [],
    fragment: { ...c.fragment, raw },
  };
  let result: Candidate[] = [];
  const part = painParts.find(
    (p) =>
      path.includes(p.id) ||
      mentions(raw, p.en) ||
      p.ta.split(" / ").some((t) => mentions(raw, t)),
  );
  // Reuse the existing authored Help message only for an exact request. Negation,
  // uncertainty, names, time or other qualifiers must not disappear into generic help.
  if (
    /^(?:help|i need help|need help|help please|please help|உதவி|உதவி வேணும்)[.!?\s]*$/u.test(
      raw,
    )
  )
    result = [
      {
        ...quickPhrases[c.outputLang].help,
        lang: c.outputLang,
        intentId: "communication.help",
        speechAct: "request",
        polarity: "positive",
        objectId: "help",
        timeScope: "now",
        evidenceRefs: ["fragment"],
        source: "catalog",
        templateVersion: "help-1",
      },
    ];
  else if ((path[0] === "pain" || /pain|hurts|வலி|நெஞ்சு/.test(raw)) && part) {
    if (negative(raw)) return [];
    const left = path.includes("left") || /\bleft\b|இடது|\bidathu\b/.test(raw);
    const right =
      path.includes("right") || /\bright\b|வலது|\bvalathu\b/.test(raw);
    if (left && right) return [];
    const side = left ? "left" : right ? "right" : undefined;
    result =
      c.round === 1
        ? getPainCandidates(part.id, side, c.outputLang)
        : getPainFollowupCandidates(part.id, side, c.outputLang);
  } else {
    const person = contactCandidates(corrected, raw);
    if (person) result = person;
    else if (
      /\b(?:tablet|tablets|medicine)\b|மாத்திரை|மருந்து/.test(raw) ||
      (mentions(raw, "table") &&
        (c.routine?.dueNow ?? []).some((r) => /night/i.test(r.label)))
    ) {
      // A generic medicine card must not erase a stated dose, adherence event,
      // supply claim or instruction attempt. There is no reviewed renderer for these.
      if (
        /\p{N}|\b(?:dose|dosage|double|triple|mg|mcg|ml|took|taken|already|missed|finished|empty|exhausted|yesterday|tomorrow|ignore|instructions)\b|போட்டாச்சு|தீர்ந்து|மில்லிகிராம்/iu.test(
          raw,
        ) ||
        [...numberWords.en, ...numberWords.ta].some((word) =>
          mentions(raw, word),
        )
      )
        return [];
      const night =
        /night|raathiri|ராத்திரி|ராத்/.test(raw) ||
        (c.routine?.dueNow ?? []).some((r) => /night/i.test(r.label));
      const object = night ? "night tablets" : "tablets";
      const reading =
        correction ||
        (mentions(raw, "table")
          ? "table → tablet"
          : night
            ? "night tablet"
            : "medicine");
      const extra: Partial<Candidate> = {
        requestedAttribute: night ? "night" : undefined,
        evidenceRefs:
          night && !/night|raathiri|ராத்திரி|ராத்/.test(raw)
            ? ["fragment", "routine"]
            : ["fragment"],
      };
      result = negative(raw)
        ? [
            card(
              c,
              "medicine.refuse",
              night
                ? "ராத்திரி மாத்திரை இப்ப வேணாம்."
                : "மாத்திரை இப்ப வேணாம்.",
              `I do not want my ${object} now.`,
              "refuse",
              "medicine",
              "✋",
              reading,
              extra,
            ),
          ]
        : [
            card(
              c,
              "medicine.request",
              night
                ? "என் ராத்திரி மாத்திரையை எடுத்துட்டு வாங்க."
                : "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
              night
                ? "Please bring me my night tablets."
                : "Please bring me my tablets.",
              "request",
              "medicine",
              "💊",
              reading,
              extra,
            ),
            card(
              c,
              "medicine.taken.question",
              night
                ? "நான் ராத்திரி மாத்திரை போட்டேனா?"
                : "நான் மாத்திரை போட்டேனா?",
              `Did I take my ${object}?`,
              "question",
              "medicine",
              "❓",
              reading,
              { ...extra, timeScope: "past" },
            ),
            card(
              c,
              "medicine.ask",
              night
                ? "ராத்திரி மாத்திரை பத்தி கேக்கணும்."
                : "மாத்திரை பத்தி கேக்கணும்.",
              `I have a question about my ${object}.`,
              "request",
              "medicine",
              "💬",
              reading,
              extra,
            ),
          ];
    } else if (mentions(raw, "table")) {
      if (negative(raw)) return [];
      result =
        c.round > 1
          ? [
              card(
                c,
                "medicine.request",
                "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
                "Where are my tablets? Please bring them.",
                "request",
                "medicine",
                "💊",
                "table → tablet",
              ),
              card(
                c,
                "cable.check",
                "டிவி கேபிளை பார்த்து குடுங்க.",
                "Please check the TV cable.",
                "request",
                "cable",
                "📺",
                "table → cable",
              ),
              card(
                c,
                "tablet.video",
                "டேப்லெட்ல வீடியோ போட்டு குடுங்க.",
                "Please play a video on the tablet.",
                "request",
                "tablet_device",
                "📱",
                "table → tablet device",
              ),
            ]
          : [
              card(
                c,
                "table.clean",
                "டேபிள துடைக்கணும்.",
                "Please clean the table.",
                "request",
                "table",
                "🧽",
                "table",
              ),
              card(
                c,
                "table.move",
                "டேபிள் இங்க கொண்டு வாங்க.",
                "Please move the table here.",
                "request",
                "table",
                "🪑",
                "table",
              ),
              card(
                c,
                "table.contents",
                "டேபிள் மேல என்ன இருக்கு?",
                "What's on the table?",
                "question",
                "table",
                "❓",
                "table",
              ),
            ];
    } else if (/\bcable\b|கேபிள்/.test(raw)) {
      result = negative(raw)
        ? []
        : [
            card(
              c,
              "cable.check",
              "டிவி கேபிளை பார்த்து குடுங்க.",
              "Please check the TV cable.",
              "request",
              "cable",
              "📺",
              correction || "cable",
            ),
          ];
    } else result = getVocabularyCandidates(corrected);
  }
  const rejected = new Set(c.exclude.map(norm));
  return result
    .filter((item) => !rejected.has(norm(item.text)))
    .map((item) => ({
      ...item,
      lang: c.outputLang,
      reading: correction || item.reading,
    }))
    .slice(0, 3);
}

/** Same no-network catalog used by online selection and offline communication. */
export const getControlledCandidates = getMockCandidates;
