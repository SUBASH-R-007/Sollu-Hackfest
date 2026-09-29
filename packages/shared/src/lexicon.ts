/** Shared, bounded lexical cues used for conservative routing and validation.
 * These are matching aids for abstention, NOT a Tamil morphology analyser, a translation,
 * emergency detection or a clinical assessment. A missed cue must never be read as safety. */

const lower = (text: string) =>
  text.normalize("NFC").toLowerCase().replace(/[’‘]/g, "'");

/** English and Tanglish refusals/denials, including colloquial suffix negatives. */
const latinNegation =
  /\b(?:no|not|never|nope|cannot|without|dont|doesnt|didnt|cant|wont|isnt|arent|wasnt|werent|havent|hasnt|hadnt|shouldnt|couldnt|wouldnt|venam|vendam|vendaam|venaam|venaa|vena|venda|vendaa|illa|illai|ille|illae|illama|illaama|maaten|maatten|matten|mudiyadhu|mudiyathu|mudiyaadhu|koodathu|koodadhu|theriyadhu|theriyathu|mudiyala|mudiyalai|mudiyale|theriyala|teriyala|puriyala|pidikala|pidikkala|valikala|valikkala|varala|varalai|sapidala|saapidala|sapdala|saapdala|thoongala|thungala|kudikala|kudikkala|sollala|pesala|paakala|paakkala|kekala|kekkala)\b|\b[a-z]+n't\b/u;
/** Tamil-script negative words that are safe to find as substrings. */
const tamilNegationWord =
  /வேணா|வேண்டா|இல்ல|முடியாது|மாட்டேன்|மாட்டோம்|மாட்டாங்க|கூடாது|தெரியாது/u;
const tamilWord = /[\p{Script=Tamil}]+/gu;
const wordChar = /[\p{L}\p{M}\p{N}]/u;

/** Case-insensitive whole-term match with letter/mark/number boundaries. Equivalent to a
 * per-term boundary RegExp, without compiling a Unicode-property RegExp for every term. */
export function containsTerm(text: string, term: string): boolean {
  const haystack = text.toLowerCase(),
    needle = term.toLowerCase();
  if (!needle) return false;
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    const before = [...haystack.slice(Math.max(0, at - 2), at)].at(-1);
    const next = haystack.codePointAt(at + needle.length);
    if (
      (!before || !wordChar.test(before)) &&
      (next === undefined || !wordChar.test(String.fromCodePoint(next)))
    )
      return true;
  }
  return false;
}
const letterCount = (value: string) => value.match(/\p{L}/gu)?.length ?? 0;

/** Colloquial Tamil verb negation (சாப்பிடல, வரல, முடியல/முடியலை, தெரியல) and fused
 * இல்லை forms (விருப்பமில்லை, வரவில்லை). Locative -ல after a pulli or vowel sign
 * (ஃபோன்ல, காலையில, வெளில) and short nouns (தல, தலை, மேல) are not negation. */
function tamilSuffixNegation(token: string): boolean {
  if (/(?:இ|ி)ல்ல(?:ை|ா|ே)?$/u.test(token)) return true;
  if (letterCount(token) < 3) return false;
  return /[க-ஹ]ல$/u.test(token) || /[யகடரஙசப]லை$/u.test(token);
}

export function hasNegation(text: string): boolean {
  const value = lower(text);
  return (
    latinNegation.test(value) ||
    tamilNegationWord.test(value) ||
    (value.match(tamilWord) ?? []).some(tamilSuffixNegation)
  );
}

/** Question words. Tamil words need script-aware boundaries: எங்க must not match inside
 * எங்களுக்கு or எங்கேயாவது, and என்ன not inside என்னையும். */
const questionCue =
  /\b(?:who|where|when|why|how|what|yaaru|yaru|enga|enge|eppo|yen|eppadi|epdi|enna)\b|(?<![\p{L}\p{M}])(?:எங்கே|எங்க|எப்போ|எப்போது|ஏன்|எப்படி|யாரு|யார்|என்ன)(?![\p{L}\p{M}])/u;
export function hasQuestionCue(text: string): boolean {
  return questionCue.test(lower(text));
}

/** Explicit refusal cues ("don't want", வேணாம்). Other negation (didn't, இல்ல, முடியல)
 * can be a supply, adherence or ability claim, which a refusal card would misstate. */
const refusalCue =
  /\b(?:no|not|never|don't|dont|do not|won't|wont|venam|vendam|vendaam|venaam|venaa|vena|venda|vendaa)\b|வேணா(?:ம்)?|வேண்டா(?:ம்)?/u;
export function isRefusalOnly(text: string): boolean {
  const value = lower(text);
  return (
    hasNegation(value) &&
    refusalCue.test(value) &&
    !hasNegation(value.replace(new RegExp(refusalCue.source, "gu"), " "))
  );
}

/** English/Tamil body-part words (every painParts entry plus common plurals). */
export const bodyPartWords = {
  en: [
    "head",
    "mouth",
    "tooth",
    "teeth",
    "throat",
    "chest",
    "stomach",
    "belly",
    "back",
    "neck",
    "eye",
    "eyes",
    "ear",
    "ears",
    "shoulder",
    "shoulders",
    "arm",
    "arms",
    "hand",
    "hands",
    "wrist",
    "wrists",
    "elbow",
    "elbows",
    "hip",
    "hips",
    "knee",
    "knees",
    "leg",
    "legs",
    "foot",
    "feet",
    "ankle",
    "ankles",
    "toe",
    "toes",
    "finger",
    "fingers",
    "thumb",
    "side",
  ],
  ta: [
    "தலை",
    "வாய்",
    "பல்",
    "தொண்டை",
    "நெஞ்சு",
    "வயிறு",
    "வயிற்று",
    "வயித்து",
    "முதுகு",
    "கழுத்து",
    "கண்",
    "காது",
    "தோள்",
    "கை",
    "உள்ளங்கை",
    "மணிக்கட்டு",
    "இடுப்பு",
    "முட்டி",
    "கால்",
    "பாதம்",
    "கணுக்கால்",
    "மூக்கு",
  ],
} as const;
const sideBodyWords = new Set<string>(bodyPartWords.en);
// "right now", "right here", "all right", "that's right", "not right": not a body side.
const rightAdverbNext = new Set(
  "now away here there then after before on in into at up down off out over when as next behind beside until till through under above below ahead around along".split(
    " ",
  ),
);
const rightIdiomPrev = new Set(
  "all that's thats you're youre it's its is are was be not quite exactly feel feels felt seem seems look looks".split(
    " ",
  ),
);
// "he left", "I left it", "left over", "left the house": the verb, not a body side.
const leftVerbPrev = new Set(
  "i he she they we you it who has have had just already was were is are been be get got nothing something anything everyone everybody someone somebody nobody".split(
    " ",
  ),
);
const leftVerbNext = new Set(
  "over behind alone out early home for the with without in at on after before yesterday today already me us him her them it".split(
    " ",
  ),
);
const sideTokens = (text: string) =>
  lower(text).match(/[\p{L}\p{M}\p{N}']+|[.,;:!?…]/gu) ?? [];
function englishSide(tokens: string[], index: number): boolean {
  const next = tokens[index + 1],
    previous = tokens[index - 1];
  if (next && sideBodyWords.has(next)) return true;
  if (tokens[index] === "right")
    return !(
      (next && rightAdverbNext.has(next)) ||
      (previous && rightIdiomPrev.has(previous))
    );
  return !(
    (previous && leftVerbPrev.has(previous)) ||
    (next && leftVerbNext.has(next))
  );
}

/** Body side cues. Tamil/Tanglish side words are unambiguous; English left/right only count
 * when adjacent to a body word or not part of a time/agreement/verb idiom. */
export function sideMentions(text: string): { left: boolean; right: boolean } {
  const value = lower(text);
  const tokens = sideTokens(value);
  const english = (side: "left" | "right") =>
    tokens.some((token, i) => token === side && englishSide(tokens, i));
  return {
    left:
      /இடது/u.test(value) ||
      /\bida(?:th|dh)u\b/u.test(value) ||
      english("left"),
    right:
      /வலது/u.test(value) ||
      /\bvala(?:th|dh)u\b/u.test(value) ||
      english("right"),
  };
}

/** Drop idiomatic "right" (right now, all right) so it is not treated as omitted content. */
export function withoutIdiomaticRight(text: string): string {
  const tokens = sideTokens(text);
  return tokens
    .filter((token, i) => token !== "right" || englishSide(tokens, i))
    .join(" ");
}

/** Common Tanglish (Latin-script Tamil) body-part words, keyed by painParts id. Matching input
 * only: they select the existing authored pain templates and are never rendered as output. */
export const tanglishBodyPartForms: Record<string, readonly string[]> = {
  head: ["thalai", "thala"],
  mouth: ["vaai", "vaay"],
  tooth: ["pal", "pallu"],
  throat: ["thondai", "thonda"],
  chest: ["nenju", "nenchu"],
  stomach: ["vayiru", "vayitru", "vayithu", "vairu"],
  back: ["mudhugu", "muthugu", "mudugu"],
  neck: ["kazhuthu", "kaluthu"],
  eye: ["kan", "kannu"],
  ear: ["kaadhu", "kaathu", "kadhu"],
  shoulder: ["thol", "tholu"],
  arm: ["kai"],
  hand: ["ullangai"],
  wrist: ["manikattu", "manikkattu"],
  hip: ["iduppu"],
  knee: ["mutti"],
  leg: ["kaal"],
  foot: ["paadham", "paatham"],
  ankle: ["kanukkal", "kanukaal"],
};

/** A Tanglish body-part word fused with a positive pain word (thalaivali, vayitruvalikuthu).
 * Only exact pain forms count: a fused negative (thalaivalikala) is not a pain statement. */
export function isFusedTanglishPain(token: string, part: string): boolean {
  return (tanglishBodyPartForms[part] ?? []).some((form) =>
    new RegExp(
      `^${form}(?:vali|valikuthu|valikkuthu|valikudhu|valikkudhu)$`,
      "u",
    ).test(lower(token)),
  );
}

/** Health, medicine and help words that route to authored communication. */
export const healthTerms = [
  ..."help emergency ambulance pain pains hurt hurts hurting chest breath breathe breathing breathless breathlessness choke choking bleed bleeding blood faint fainting seizure seizures medicine medicines medication medications tablet tablets pill pills drug drugs dose doses dosage treatment diagnosis diagnose diagnosed prescription prescribe prescribed overdose mg mcg ml ache aches aching headache headaches fever feverish vomit vomits vomiting vomited sick nausea nauseous dizzy dizziness unconscious collapse collapsed injury injured".split(
    " ",
  ),
  // Falls, hospital, common symptoms, BP/sugar (diabetes) and urgency. "fall asleep" is
  // removed before matching (benignHealthIdioms); "sugar" routes even as a food word
  // ("coffee with sugar") because a free-text qualifier has no authored renderer.
  ..."fall falls fallen falling fell hospital hospitals cough coughs coughing sore swelling swollen swelled diarrhea diarrhoea constipation constipated bp diabetes diabetic sugar urgent urgently".split(
    " ",
  ),
  "loose motion",
  "loose motions",
  "blood pressure",
  "can t pee",
  "cant pee",
  "cannot pee",
  "can not pee",
  "can t urinate",
  "cannot urinate",
  "vizhunthuten",
  "vizhundhuten",
  "vizhunthen",
  "irumal",
  "veekkam",
  "sugar problem",
  // Existing vocabulary and terms are matching boundaries, never new translated output.
  "vali",
  "nenju",
  "nenchu",
  "marunthu",
  "marundhu",
  "mathirai",
  "maathirai",
  "udhavi",
  "uthavi",
  "வலி",
  "வலிக்குது",
  "நெஞ்சு",
  "மருந்து",
  "மாத்திரை",
  "உதவி",
  "சிகிச்சை",
  "மருந்தளவு",
  "ஆஸ்பத்திரி",
  "மருத்துவமனை",
  "சுகர்",
];
/** Tamil stems found inside agglutinated tokens (தலைவலி, வலிக்கிறது, உதவிக்கு, மூச்சு). */
const tamilHealthStems = [
  "வலி",
  "நெஞ்ச",
  "மூச்ச",
  "காய்ச்சல்",
  "ஜுரம்",
  "ஜூரம்",
  "உதவி",
  "மருந்",
  "மாத்திரை",
  "சிகிச்சை",
  "வாந்தி",
  "மயக்க",
  "இரத்த",
  "ரத்த",
  "குமட்ட",
  "ஆம்புலன்ஸ்",
  // Fell (விழுந்துட்டேன், விழுந்தேன்), cough, swelling, hospital.
  "விழுந்",
  "இருமல்",
  "வீக்கம்",
  "ஆஸ்பத்திரி",
  "மருத்துவமனை",
];
/** Tanglish/English stems inside a token (thalaivali, valikudhu, headache, vomiting). */
const latinHealthStem =
  /vali(?:$|k|c)|nenju|nenchu|mooch|kaaichal|kaichal|kaychal|juram|jwaram|vaanthi|marunth|marundh|mathirai|maathirai|udhavi|uthavi|mayakkam|mayakam|^(?:vizhun|vizhund|cough|swell|constipat|diarrh|breath|vomit|fever|dizz|nause|bleed|faint|chok|seiz|medic|diagnos|prescri|overdos|injur|unconscious|collaps)|(?:head|stomach|tooth|back|ear|belly|tummy|neck)ache/u;
/** Everyday idioms that contain a health word but are not about health: "fall asleep",
 * "I fell asleep". Removed before routing; anything else with fall/fell still routes. */
export const benignHealthIdioms =
  /\b(?:fall|falls|falling|fell|fallen)\s+(?:back\s+)?asleep\b/gu;
export function containsHealthStem(token: string): boolean {
  const value = lower(token);
  return (
    tamilHealthStems.some((stem) => value.includes(stem)) ||
    latinHealthStem.test(value)
  );
}

/** Complete words that a prefix repair must never extend into a different catalog word
 * (pill → pillow, glass → glasses, took → tookam, chai → chair, மூக்கு → மூக்குக்கண்ணாடி). */
export const completeWords = [
  ...healthTerms,
  ...bodyPartWords.en,
  ...bodyPartWords.ta,
  ..."pil pill glass chai late after list hell good new joy ups scar scare lone tire exhaust fat pea peace relax annoy tan mil bot toil clot cloth took mob spec kan kann blank cove out sam pay bay app inn eva alter".split(
    " ",
  ),
  "தூக்க",
  "தலைய",
];
