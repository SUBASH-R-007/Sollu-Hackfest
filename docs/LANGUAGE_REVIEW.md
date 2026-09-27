# Language review inventory

Generated 2026-09-27 from every original specification line containing Tamil, Devanagari or Telugu script. Whole source lines are retained so every draft string and its context remain available; duplicate occurrences are intentional. Source line numbers refer to the unchanged SPEC.md. All entries are **pending native-speaker review**.

Review spoken register, exact meaning, respect/familiarity, Hindi gender and oblique forms, Telugu case agreement, pain intensity, word highlighting and the actual voice pronunciation. Record reviewer, date, accepted/corrected wording, and source location; do not mark strings approved based on generated output.

## Original brief inventory

### SPEC.md line 14 — pending

```text
You are the lead engineer building **Sollu** (சொல்லு — Tamil for "say it"; tagline *"Say it. In your words. In your voice."*), an AI communication companion for adults with post-stroke aphasia. Build it as an installable PWA with a thin server, in two horizons:
```

### SPEC.md line 93 — pending

```text
- **Diglossia.** Formal written Tamil ("தண்ணீர் கொடுங்கள்") sounds stilted when spoken; homes speak colloquial Tamil ("தண்ணி குடுங்க"). All generated Tamil must be **spoken colloquial Tamil in Tamil script**. The same applies to Hindi (everyday Hindustani, not Sanskritised) and Telugu (spoken, not literary).
```

### SPEC.md line 95 — pending

```text
- **Politeness follows the addressee.** Elders, in-laws and doctors get respectful "-ங்க" forms; spouse and children are often familiar. The family decides per contact.
```

### SPEC.md line 96 — pending

```text
- **Speaker gender** changes verb forms in Hindi (थक गया / थक गई). Store it for grammar.
```

### SPEC.md line 386 — pending

```text
  - **ta:** "Use spoken Tamil (பேச்சுத் தமிழ்): 'தண்ணி குடுங்க' not 'தண்ணீர் கொடுங்கள்', 'வேணும்' not 'வேண்டும்', 'போகணும்' not 'போக வேண்டும்'. {dialectNote}"
```

### SPEC.md line 387 — pending

```text
  - **hi:** "Everyday Hindustani as spoken at home ('दवाई', 'टाइम'), not Sanskritised formal Hindi."
```

### SPEC.md line 391 — pending

```text
- `speakerLine`: "the speaker is {female|male}; use matching forms wherever the language marks gender (e.g. Hindi 'थक गई हूँ' vs 'थक गया हूँ')." or "gender unspecified; prefer constructions that avoid gender marking."
```

### SPEC.md line 401 — pending

```text
   - It contains digits in any script (0–9, ௦–௯, ०–९, ౦–౯), number words from the per-language list in `packages/shared` (two and above, plus "half"; not the article-like "one": ஒரு, एक, ఒక), or dose units — unless the same number appears in the fragment or context.
```

### SPEC.md line 462 — pending

```text
  2. Side, only for paired parts: two large buttons labelled இடது / வலது and Left / Right, each with an arrow toward the person's own side.
```

### SPEC.md line 525 — pending

```text
- **On confirm:** upsert a `MemoryEntry` keyed by (normalised fragment key ⊕ normalised `reading` of the chosen card, sentence), and increment `count`. Exchange the candidate signature for a long-lived one (`/api/sign`, source `memory`, `proofSig` = the candidate's `sig`). The English `reading` is the cross-script key (for readings with "→", use the part after the arrow), so "raathiri tablet", "ராத்திரி மாத்திரை" and "night tablet" meet.
```

### SPEC.md line 692 — pending

```text
  - register (a Tamil formal-marker heuristic flags e.g. "தண்ணீர்", "கொடுங்கள்", "வாருங்கள்", "வேண்டும்");
```

### SPEC.md line 858 — pending

```text
5. [human] The caregiver asks "மதியம் என்ன சாப்பிடணும்?" from their phone → a banner on the patient's phone → say "ரசம்" → answer candidates.
```

### SPEC.md line 869 — pending

```text
| medicine | 💊 | மாத்திரை | Medicine | none — context decides |
```

### SPEC.md line 870 — pending

```text
| food | 🍛 | சாப்பாடு | Food | இட்லி, தோசை, சாதம், ரசம், தயிர் சாதம், பழம், டிபன் + vocabulary |
```

### SPEC.md line 871 — pending

```text
| drink | 🥤 | குடிக்க | Drink | தண்ணி, சுடு தண்ணி, காபி, டீ, பால், ஜூஸ் |
```

### SPEC.md line 872 — pending

```text
| toilet | 🚻 | பாத்ரூம் | Toilet & bath | — |
```

### SPEC.md line 873 — pending

```text
| pain | 🤕 | வலி | Pain | body part → side (paired parts) → templates |
```

### SPEC.md line 874 — pending

```text
| people | 👨‍👩‍👧 | ஆட்கள் | People | contact photos |
```

### SPEC.md line 875 — pending

```text
| feelings | 😊 | மனசு | Feelings | சந்தோஷம், வருத்தம், கோபம், களைப்பு, பயம், போர் அடிக்குது, தனியா இருக்கு, எரிச்சல் |
```

### SPEC.md line 876 — pending

```text
| rest | 🛏️ | ஓய்வு | Rest & comfort | தூக்கம், படுக்கணும், உட்காரணும், ஃபேன், ஏசி, லைட், போர்வை, ரொம்ப சூடு, ரொம்ப குளிர் |
```

### SPEC.md line 877 — pending

```text
| tv_phone | 📺 | டிவி / ஃபோன் | TV & phone | — |
```

### SPEC.md line 878 — pending

```text
| prayer | 🙏 | சாமி | Prayer | optional per family |
```

### SPEC.md line 879 — pending

```text
| go_out | 🚶 | வெளியே | Go out | — |
```

### SPEC.md line 882 — pending

```text
- **Home tiles:** 🎤 பேசு (Speak) · 🗂️ வகைகள் (Topics) · 📷 கேமரா (Camera) · ⌨️ எழுது (Type).
```

### SPEC.md line 883 — pending

```text
- **Confirm screen:** "இதுல எதுவும் இல்ல" (None of these) · 👂 "கேளு" (Listen) · "மறுபடி சொல்லு" (Say again) · "நிறுத்து" (Stop).
```

### SPEC.md line 884 — pending

```text
- **Help screen:** "SMS அனுப்பு" (Send SMS) · "தெரியாம அழுத்திட்டேன்" (It was a mistake) · "அவசரத்துக்கு 112-க்கு கூப்பிடுங்க." (In an emergency call 112).
```

### SPEC.md line 887 — pending

```text
- **Parts without a side:** தலை head · வாய் / பல் mouth / teeth · தொண்டை throat · நெஞ்சு chest · வயிறு stomach · முதுகு back.
```

### SPEC.md line 888 — pending

```text
- **Paired parts (ask the side):** கண் eye · காது ear · தோள் shoulder · கை arm/hand · இடுப்பு hip · முட்டி knee · கால் leg · பாதம் foot.
```

### SPEC.md line 889 — pending

```text
- **Sides:** இடது left · வலது right.
```

### SPEC.md line 895 — pending

```text
| a little | {side} {part} கொஞ்சம் வலிக்குது. | My {side} {part} hurts a little. | none |
```

### SPEC.md line 896 — pending

```text
| a lot | {side} {part} ரொம்ப வலிக்குது. | My {side} {part} hurts a lot. | elevated |
```

### SPEC.md line 897 — pending

```text
| unbearable | {side} {part} வலி தாங்க முடியல, உடனே உதவி வேணும். | The pain in my {side} {part} is unbearable — I need help now. | elevated |
```

### SPEC.md line 899 — pending

```text
- For parts without a side, omit `{side}` (e.g. "தலை ரொம்ப வலிக்குது." / "My head hurts a lot.").
```

### SPEC.md line 900 — pending

```text
- **Chest replaces all three**, all `emergency`: "நெஞ்சு வலிக்குது, உடனே உதவி வேணும்." / "My chest hurts — I need help now." · "நெஞ்சு அடைக்குற மாதிரி இருக்கு." / "My chest feels tight." · "மூச்சு விட கஷ்டமா இருக்கு." / "I'm finding it hard to breathe." Speaking any emergency card also sends `help` (§9).
```

### SPEC.md line 906 — pending

```text
| help | உதவி வேணும்! | I need help! | मुझे मदद चाहिए! | నాకు సహాయం కావాలి! |
```

### SPEC.md line 907 — pending

```text
| yes | ஆமா | Yes | हाँ | అవును |
```

### SPEC.md line 908 — pending

```text
| no | இல்ல | No | नहीं | కాదు |
```

### SPEC.md line 909 — pending

```text
| wait | கொஞ்சம் இருங்க | Wait a moment, please | एक मिनट रुकिए | ఒక్క నిమిషం ఆగండి |
```

### SPEC.md line 912 — pending

```text
- "எனக்கு ஸ்ட்ரோக் வந்ததால பேச கஷ்டமா இருக்கு. கொஞ்சம் நேரம் குடுங்க." / "I had a stroke and find it hard to speak. Please give me time."
```

### SPEC.md line 913 — pending

```text
- "ஆமா, இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க." / "Please ask me yes-or-no questions."
```

### SPEC.md line 914 — pending

```text
- "நன்றி." / "Thank you."
```

### SPEC.md line 920 — pending

```text
   - c1 "ராத்திரி மாத்திரை போடணும், கொஞ்சம் எடுத்துட்டு வாங்க." — night tablet · I need to take my night tablet, please bring it · request night medicine · மாத்திரை · 💊 · none
```

### SPEC.md line 921 — pending

```text
   - c2 "நான் ராத்திரி மாத்திரை போட்டேனா?" — night tablet · Did I take my night tablet? · ask if medicine taken · போட்டேனா · ❓ · none
```

### SPEC.md line 922 — pending

```text
   - c3 "ராத்திரி மாத்திரை தீர்ந்து போச்சு." — night tablet · The night tablets have run out · report medicine finished · தீர்ந்து · 📦 · none
```

### SPEC.md line 924 — pending

```text
   - "கார்த்திக், கொஞ்சம் தண்ணி குடு." (request water · 💧) · "தண்ணி பாட்டில் காலியா இருக்கு, நிரப்பி வை." (bottle empty, refill · 🚰) · "சுடு தண்ணி வேணும்." (want warm water · ♨️)
```

### SPEC.md line 925 — pending

```text
3. **Partner question** "மதியம் என்ன சாப்பிடணும்?" + speech "ரசம்" · 12:40 · to Priya (respectful) · out ta — reading "rasam"
```

### SPEC.md line 926 — pending

```text
   - "ரசம் சாதம் போதும்." (choose rasam rice · 🍲) · "கொஞ்சம் ரசம் மட்டும் குடிக்கணும்." (only drink some rasam · 🥣) · "ரசம் வேணாம், வேற ஏதாவது குடுங்க." (refuse rasam · 🙅)
```

### SPEC.md line 931 — pending

```text
6. **Round 2, paraphasia** · speech "table" · 16:30 · no routine due · no addressee · exclude ["டேபிள துடைக்கணும்.", "டேபிள் இங்க கொண்டு வாங்க.", "டேபிள் மேல என்ன இருக்கு?"] · out ta
```

### SPEC.md line 932 — pending

```text
   - "என் மாத்திரை எங்க? எடுத்து குடுங்க." — table → tablet · where are my tablets · 💊
```

### SPEC.md line 933 — pending

```text
   - "டிவி கேபிள் வேலை செய்யல." — table → cable · the TV cable isn't working · 📺
```

### SPEC.md line 934 — pending

```text
   - "டேப்லெட்ல வீடியோ போட்டு குடுங்க." — table → tablet device · put a video on the tablet · 📱
```

### SPEC.md line 935 — pending

```text
7. **Urgency** · speech "நெஞ்சு" · 10:00 · to Karthik (familiar) · out ta — reading "chest"
```

### SPEC.md line 936 — pending

```text
   - "நெஞ்சு வலிக்குது, உடனே டாக்டர கூப்பிடு." (chest pain, call the doctor · 🚨 · emergency) · "நெஞ்சு அடைக்குற மாதிரி இருக்கு." (chest feels tight · ⚠️ · emergency) · "நெஞ்சுல சளி கட்டியிருக்கு." (chest congestion · 🤧 · elevated)
```

### SPEC.md line 937 — pending

```text
8. **Hindi (M10)** · speech "दवाई" · 21:00 · to son (familiar) · speaker male · out hi — reading "medicine"
```

### SPEC.md line 938 — pending

```text
   - "रात की दवाई का टाइम हो गया, ला दो।" · "मैंने रात की दवाई ले ली क्या?" · "दवाई खत्म हो गई है।"
```

### SPEC.md line 948 — pending

```text
    { "name": "Karthik", "aliases": ["கார்த்திக்", "Karthi"], "relation": "son", "register": "familiar", "lang": "ta", "isCaregiver": true },
```

### SPEC.md line 949 — pending

```text
    { "name": "Priya", "aliases": ["ப்ரியா"], "relation": "daughter-in-law", "register": "respectful", "lang": "ta", "isCaregiver": true },
```

### SPEC.md line 950 — pending

```text
    { "name": "Meena", "aliases": ["மீனா"], "relation": "daughter (Bengaluru)", "register": "familiar", "lang": "ta", "isCaregiver": false },
```

### SPEC.md line 951 — pending

```text
    { "name": "Aadhav", "aliases": ["ஆதவ்"], "relation": "grandson", "register": "familiar", "lang": "ta", "isCaregiver": false },
```

### SPEC.md line 952 — pending

```text
    { "name": "Nurse Anjali", "aliases": ["Anjali", "अंजलि"], "relation": "home nurse", "register": "respectful", "lang": "hi", "isCaregiver": false },
```

### SPEC.md line 953 — pending

```text
    { "name": "Dr. Rao", "aliases": ["Rao", "ராவ்"], "relation": "doctor", "register": "respectful", "lang": "en", "isCaregiver": false }
```

### SPEC.md line 980 — pending

```text
5. **[H] Partner question:** Priya asks "மதியம் என்ன சாப்பிடணும்?" into Amma's phone ("They asked…") → Amma says "ரசம்" → answer candidates. After M5 full, Priya sends the question from her own phone.
```

### SPEC.md line 982 — pending

```text
7. **[H] Help:** Amma taps Help → her voice says "உதவி வேணும்!" → Karthik's phone alarms → "I'm coming" → "Karthik is coming ✓". After M5 full, the same works with the patient's phone offline first: the alert arrives, marked late, once it reconnects.
```

### SPEC.md line 989 — pending

```text
| e03 | ta | speech "தண்ணி" | 14:00 | want water · warm water · refill | — |
```

### SPEC.md line 990 — pending

```text
| e04 | ta | speech "தலை… வலி" | 07:30 | head hurts a lot (elevated) · want to lie down · ask for help | drug name |
```

### SPEC.md line 991 — pending

```text
| e05 | ta | partner "காபி வேணுமா?" + speech "ஆமா… சக்கரை" | 07:05 | yes with sugar · yes, less sugar · yes, no sugar | medical advice |
```

### SPEC.md line 996 — pending

```text
| e10 | ta | speech "நெஞ்சு" | 10:00 | chest pain + help (emergency) | medical advice |
```

## Implementation inventory

Final source scan dated 2026-09-27. Every runtime source line in apps/**/src and packages/**/src containing Tamil, Devanagari or Telugu is included below; test files and generated bundles are excluded. Line numbers match the frozen source at the scan time. Whole lines preserve interpolation and nearby punctuation. All entries remain pending native-speaker review. Hindi/Telugu product support is deferred; an original-spec string does not establish implemented support.

Scan coverage: 212 matching lines across 12 runtime source files, from 35 files inspected. All 67 original brief entries above remain unchanged.

### apps/server/src/app.ts line 401 — pending

```text
water: "தண்ணி",
```

### apps/server/src/app.ts line 402 — pending

```text
rasam: "ரசம்",
```

### apps/server/src/app.ts line 404 — pending

```text
head: "தலை வலி",
```

### apps/server/src/app.ts line 405 — pending

```text
chest: "நெஞ்சு",
```

### apps/server/src/lib/validation.ts line 21 — pending

```text
/\b(?:mg|mcg|ml|milligram(?:s)?|microgram(?:s)?|millilitre(?:s)?|milliliter(?:s)?|dosage)\b|மில்லிகிராம்|மி\.கி/iu;
```

### apps/server/src/providers/ollama.ts line 36 — pending

```text
`Output language: ${context.outputLang === "ta" ? "everyday spoken Chennai Tamil in Tamil script; use தண்ணி குடுங்க, வேணும், போகணும், never formal Tamil" : "simple Indian English"}. Register: ${context.addressee?.register ?? "polite neutral"}. Speaker gender: ${context.speaker?.gender ?? "unspecified"}.\n` +
```

### apps/web/src/App.tsx line 339 — pending

```text
தமிழ்
```

### apps/web/src/App.tsx line 448 — pending

```text
சொல்லு <span aria-hidden="true">✦</span> Say it, your way.
```

### apps/web/src/db.ts line 106 — pending

```text
aliases: ["ப்ரியா"],
```

### apps/web/src/db.ts line 115 — pending

```text
aliases: ["கார்த்திக்", "Karthi"],
```

### apps/web/src/db.ts line 124 — pending

```text
aliases: ["மீனா"],
```

### apps/web/src/pages/Camera.tsx line 283 — pending

```text
title={settings.lang === "ta" ? "கேமரா · Camera" : "Camera"}
```

### apps/web/src/pages/Demo.tsx line 57 — pending

```text
"Priya asks what you want for lunch. “ரசம்” is ready in Type; tap Find my words and choose your answer.",
```

### apps/web/src/pages/Demo.tsx line 208 — pending

```text
setQuestion("மதியம் என்ன சாப்பிடணும்?");
```

### apps/web/src/pages/Demo.tsx line 209 — pending

```text
begin({ modality: "text", raw: "ரசம்" });
```

### apps/web/src/pages/Patient.tsx line 60 — pending

```text
subtitle="என்ன சொல்லணும்? Take your time. We’re listening."
```

### apps/web/src/pages/Patient.tsx line 104 — pending

```text
tamil="பேசு"
```

### apps/web/src/pages/Patient.tsx line 112 — pending

```text
tamil="வகைகள்"
```

### apps/web/src/pages/Patient.tsx line 120 — pending

```text
tamil="கேமரா"
```

### apps/web/src/pages/Patient.tsx line 128 — pending

```text
tamil="எழுது"
```

### apps/web/src/pages/Patient.tsx line 227 — pending

```text
Your words · உங்க வார்த்தைகள்
```

### apps/web/src/pages/Patient.tsx line 311 — pending

```text
{ id: "idli", icon: "🍚", ta: "இட்லி", en: "Idli" },
```

### apps/web/src/pages/Patient.tsx line 312 — pending

```text
{ id: "dosa", icon: "🥞", ta: "தோசை", en: "Dosa" },
```

### apps/web/src/pages/Patient.tsx line 313 — pending

```text
{ id: "rasam", icon: "🍲", ta: "ரசம்", en: "Rasam" },
```

### apps/web/src/pages/Patient.tsx line 314 — pending

```text
{ id: "rice", icon: "🍚", ta: "சாதம்", en: "Rice" },
```

### apps/web/src/pages/Patient.tsx line 318 — pending

```text
{ id: "water", icon: "💧", ta: "தண்ணி", en: "Water" },
```

### apps/web/src/pages/Patient.tsx line 319 — pending

```text
{ id: "coffee", icon: "☕", ta: "காபி", en: "Coffee" },
```

### apps/web/src/pages/Patient.tsx line 320 — pending

```text
{ id: "tea", icon: "🍵", ta: "டீ", en: "Tea" },
```

### apps/web/src/pages/Patient.tsx line 321 — pending

```text
{ id: "milk", icon: "🥛", ta: "பால்", en: "Milk" },
```

### apps/web/src/pages/Patient.tsx line 389 — pending

```text
<span lang="ta">{side === "left" ? "இடது" : "வலது"}</span>
```

### apps/web/src/pages/Patient.tsx line 496 — pending

```text
{context.outputLang === "ta" ? "தமிழ் → English" : "English → தமிழ்"}
```

### apps/web/src/pages/Patient.tsx line 589 — pending

```text
None of these <small lang="ta">இதுல எதுவும் இல்ல</small>
```

### apps/web/src/pages/Patient.tsx line 791 — pending

```text
{c.relation} · {c.lang === "en" ? "English" : "தமிழ்"}
```

### apps/web/src/pages/Patient.tsx line 986 — pending

```text
<p>{heard || "உங்க குரல் · Your voice"}</p>
```

### apps/web/src/pages/Patient.tsx line 1026 — pending

```text
? ["மதியம் என்ன சாப்பிடணும்?"]
```

### apps/web/src/pages/Patient.tsx line 1027 — pending

```text
: ["tablet… raathiri", "தண்ணி", "table"]
```

### apps/web/src/pages/Settings.tsx line 203 — pending

```text
<option value="ta">தமிழ் · Tamil</option>
```

### apps/web/src/pages/Settings.tsx line 693 — pending

```text
<option value="ta">தமிழ் · Tamil</option>
```

### packages/shared/src/mock.ts line 26 — pending

```text
has(/night|raathiri|ராத்திரி|ராத்/) ||
```

### packages/shared/src/mock.ts line 35 — pending

```text
if (has(/chest|நெஞ்சு/))
```

### packages/shared/src/mock.ts line 37 — pending

```text
if ((path[0] === "pain" || has(/வலி|pain|hurts/)) && painPart) {
```

### packages/shared/src/mock.ts line 51 — pending

```text
"கையை அசைக்க கொஞ்சம் உதவி பண்ணுங்க.",
```

### packages/shared/src/mock.ts line 59 — pending

```text
"கைக்கு கீழ தலையணை வைங்க.",
```

### packages/shared/src/mock.ts line 66 — pending

```text
"வலிக்கு ஏதாவது உதவி கிடைக்குமா?",
```

### packages/shared/src/mock.ts line 77 — pending

```text
"என் மாத்திரை எங்க? எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 84 — pending

```text
"டிவி கேபிள் வேலை செய்யல.",
```

### packages/shared/src/mock.ts line 91 — pending

```text
"டேப்லெட்ல வீடியோ போட்டு குடுங்க.",
```

### packages/shared/src/mock.ts line 99 — pending

```text
has(/tablet|medicine|மாத்திரை|மருந்து/) ||
```

### packages/shared/src/mock.ts line 112 — pending

```text
"ராத்திரி மாத்திரை போடணும், கொஞ்சம் எடுத்துட்டு வாங்க.",
```

### packages/shared/src/mock.ts line 119 — pending

```text
"நான் ராத்திரி மாத்திரை போட்டேனா?",
```

### packages/shared/src/mock.ts line 126 — pending

```text
"ராத்திரி மாத்திரை தீர்ந்து போச்சு.",
```

### packages/shared/src/mock.ts line 135 — pending

```text
"என் மாத்திரை எங்க? எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 142 — pending

```text
"நான் மாத்திரை போட்டேனா?",
```

### packages/shared/src/mock.ts line 149 — pending

```text
"மாத்திரை தீர்ந்து போச்சு.",
```

### packages/shared/src/mock.ts line 159 — pending

```text
"டேபிள துடைக்கணும்.",
```

### packages/shared/src/mock.ts line 166 — pending

```text
"டேபிள் இங்க கொண்டு வாங்க.",
```

### packages/shared/src/mock.ts line 173 — pending

```text
"டேபிள் மேல என்ன இருக்கு?",
```

### packages/shared/src/mock.ts line 181 — pending

```text
has(/தண்ணி|தண்ணீர்|water|bottle|cup/) ||
```

### packages/shared/src/mock.ts line 187 — pending

```text
"கொஞ்சம் தண்ணி குடுங்க.",
```

### packages/shared/src/mock.ts line 194 — pending

```text
"தண்ணி பாட்டில் காலியா இருக்கு, நிரப்பி வைங்க.",
```

### packages/shared/src/mock.ts line 201 — pending

```text
"சுடு தண்ணி வேணும்.",
```

### packages/shared/src/mock.ts line 208 — pending

```text
} else if (has(/rasam|ரசம்/)) {
```

### packages/shared/src/mock.ts line 211 — pending

```text
"ரசம் சாதம் போதும்.",
```

### packages/shared/src/mock.ts line 218 — pending

```text
"கொஞ்சம் ரசம் மட்டும் குடிக்கணும்.",
```

### packages/shared/src/mock.ts line 225 — pending

```text
"ரசம் வேணாம், வேற ஏதாவது குடுங்க.",
```

### packages/shared/src/mock.ts line 233 — pending

```text
has(/sugar|சக்கரை|சர்க்கரை/) &&
```

### packages/shared/src/mock.ts line 234 — pending

```text
/coffee|காபி/.test(c.partnerQuestion?.text ?? raw)
```

### packages/shared/src/mock.ts line 238 — pending

```text
"ஆமா, சக்கரை போட்டு காபி குடுங்க.",
```

### packages/shared/src/mock.ts line 245 — pending

```text
"ஆமா, சக்கரை கொஞ்சமா போடுங்க.",
```

### packages/shared/src/mock.ts line 252 — pending

```text
"ஆமா, சக்கரை இல்லாம குடுங்க.",
```

### packages/shared/src/mock.ts line 259 — pending

```text
} else if (has(/coffee|காபி|டீ|tea/)) {
```

### packages/shared/src/mock.ts line 260 — pending

```text
const tea = has(/டீ|tea/),
```

### packages/shared/src/mock.ts line 261 — pending

```text
ta = tea ? "டீ" : "காபி",
```

### packages/shared/src/mock.ts line 265 — pending

```text
`கொஞ்சம் ${ta} குடுங்க.`,
```

### packages/shared/src/mock.ts line 272 — pending

```text
`${ta} ரொம்ப சூடா இருக்கு.`,
```

### packages/shared/src/mock.ts line 278 — pending

```text
[`${ta} வேணாம்.`, `I do not want ${en}.`, `refuse ${en}`, "✋", en],
```

### packages/shared/src/mock.ts line 280 — pending

```text
} else if (has(/milk|பால்|juice|ஜூஸ்/)) {
```

### packages/shared/src/mock.ts line 281 — pending

```text
const juice = has(/juice|ஜூஸ்/),
```

### packages/shared/src/mock.ts line 282 — pending

```text
ta = juice ? "ஜூஸ்" : "பால்",
```

### packages/shared/src/mock.ts line 286 — pending

```text
`கொஞ்சம் ${ta} குடுங்க.`,
```

### packages/shared/src/mock.ts line 292 — pending

```text
[`${ta} வேணாம்.`, `I do not want ${en}.`, `refuse ${en}`, "✋", en],
```

### packages/shared/src/mock.ts line 294 — pending

```text
`${ta} இன்னும் கொஞ்சம் வேணும்.`,
```

### packages/shared/src/mock.ts line 301 — pending

```text
} else if (has(/spectacles|glasses|கண்ணாடி/)) {
```

### packages/shared/src/mock.ts line 304 — pending

```text
"என் கண்ணாடி எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 311 — pending

```text
"என் கண்ணாடிய காணோம்.",
```

### packages/shared/src/mock.ts line 318 — pending

```text
"கண்ணாடிய துடைச்சு குடுங்க.",
```

### packages/shared/src/mock.ts line 325 — pending

```text
} else if (has(/fan|ஃபேன்/)) {
```

### packages/shared/src/mock.ts line 328 — pending

```text
"ஃபேன் போட்டு விடுங்க.",
```

### packages/shared/src/mock.ts line 335 — pending

```text
"ஃபேனை நிறுத்துங்க.",
```

### packages/shared/src/mock.ts line 342 — pending

```text
"ஃபேன் வேகத்தை கொஞ்சம் மாத்துங்க.",
```

### packages/shared/src/mock.ts line 349 — pending

```text
} else if (has(/toilet|bathroom|பாத்ரூம்/)) {
```

### packages/shared/src/mock.ts line 352 — pending

```text
"பாத்ரூம் போகணும்.",
```

### packages/shared/src/mock.ts line 359 — pending

```text
"எழுந்திருக்க உதவி பண்ணுங்க.",
```

### packages/shared/src/mock.ts line 366 — pending

```text
"முகம் கழுவணும்.",
```

### packages/shared/src/mock.ts line 373 — pending

```text
} else if (has(/food|சாப்பாடு|idli|இட்லி|dosa|தோசை|rice|சாதம்/)) {
```

### packages/shared/src/mock.ts line 374 — pending

```text
const idli = has(/idli|இட்லி/),
```

### packages/shared/src/mock.ts line 375 — pending

```text
dosa = has(/dosa|தோசை/),
```

### packages/shared/src/mock.ts line 376 — pending

```text
rice = has(/rice|சாதம்/);
```

### packages/shared/src/mock.ts line 377 — pending

```text
const ta = idli ? "இட்லி" : dosa ? "தோசை" : rice ? "சாதம்" : "சாப்பாடு",
```

### packages/shared/src/mock.ts line 380 — pending

```text
[`${ta} வேணும்.`, `I would like some ${en}.`, "request food", "🍛", en],
```

### packages/shared/src/mock.ts line 382 — pending

```text
`${ta} இப்ப வேணாம்.`,
```

### packages/shared/src/mock.ts line 389 — pending

```text
`${ta} கொஞ்சம் சூடு பண்ணி குடுங்க.`,
```

### packages/shared/src/mock.ts line 396 — pending

```text
} else if (has(/rest|sleep|படுக்க|தூக்க|ஓய்வு/)) {
```

### packages/shared/src/mock.ts line 399 — pending

```text
"கொஞ்சம் படுக்கணும்.",
```

### packages/shared/src/mock.ts line 406 — pending

```text
"எனக்கு போர்வை குடுங்க.",
```

### packages/shared/src/mock.ts line 413 — pending

```text
"கொஞ்சம் அமைதியா இருங்க.",
```

### packages/shared/src/mock.ts line 420 — pending

```text
} else if (has(/tv_phone|டிவி|phone|tv\b/) && !has(/meena|மீனா/)) {
```

### packages/shared/src/mock.ts line 423 — pending

```text
"டிவி போட்டு விடுங்க.",
```

### packages/shared/src/mock.ts line 430 — pending

```text
"என் ஃபோன் எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 437 — pending

```text
"டிவி சத்தத்தை குறைங்க.",
```

### packages/shared/src/mock.ts line 444 — pending

```text
} else if (has(/feelings|மனசு|களைப்பு/)) {
```

### packages/shared/src/mock.ts line 447 — pending

```text
"எனக்கு களைப்பா இருக்கு.",
```

### packages/shared/src/mock.ts line 454 — pending

```text
"எனக்கு தனியா இருக்கு.",
```

### packages/shared/src/mock.ts line 461 — pending

```text
"எனக்கு சந்தோஷமா இருக்கு.",
```

### packages/shared/src/mock.ts line 468 — pending

```text
} else if (has(/prayer|சாமி/)) {
```

### packages/shared/src/mock.ts line 470 — pending

```text
["சாமி கும்பிடணும்.", "I want to pray.", "want to pray", "🙏", "prayer"],
```

### packages/shared/src/mock.ts line 472 — pending

```text
"விளக்கு ஏத்துங்க.",
```

### packages/shared/src/mock.ts line 479 — pending

```text
"கொஞ்சம் அமைதியா இருக்கணும்.",
```

### packages/shared/src/mock.ts line 486 — pending

```text
} else if (has(/go_out|வெளியே|walk/)) {
```

### packages/shared/src/mock.ts line 489 — pending

```text
"கொஞ்சம் வெளியே போகணும்.",
```

### packages/shared/src/mock.ts line 496 — pending

```text
"என்கூட கொஞ்சம் நடந்து வாங்க.",
```

### packages/shared/src/mock.ts line 503 — pending

```text
"வீட்டுக்குள்ள போகணும்.",
```

### packages/shared/src/mock.ts line 523 — pending

```text
`${name} ஸ்கூல்ல இருந்து வந்தாச்சா?`,
```

### packages/shared/src/mock.ts line 530 — pending

```text
`${name}கிட்ட பேசணும்.`,
```

### packages/shared/src/mock.ts line 537 — pending

```text
`${name}யை கூட்டிட்டு வாங்க.`,
```

### packages/shared/src/mock.ts line 547 — pending

```text
`${name}கிட்ட ஃபோன்ல பேசணும்.`,
```

### packages/shared/src/mock.ts line 554 — pending

```text
`${name} ஃபோன் பண்ணாங்களா?`,
```

### packages/shared/src/mock.ts line 561 — pending

```text
`${name}யை எனக்கு ஃபோன் பண்ண சொல்லுங்க.`,
```

### packages/shared/src/phrases.ts line 34 — pending

```text
"உதவி வேணும்!",
```

### packages/shared/src/phrases.ts line 41 — pending

```text
yes: candidate("ஆமா", "Yes", "say yes", "👍"),
```

### packages/shared/src/phrases.ts line 42 — pending

```text
no: candidate("இல்ல", "No", "say no", "✋"),
```

### packages/shared/src/phrases.ts line 44 — pending

```text
"கொஞ்சம் இருங்க",
```

### packages/shared/src/phrases.ts line 72 — pending

```text
"பேச கொஞ்சம் நேரம் குடுங்க.",
```

### packages/shared/src/phrases.ts line 78 — pending

```text
"ஆமா, இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க.",
```

### packages/shared/src/phrases.ts line 83 — pending

```text
candidate("நன்றி.", "Thank you.", "say thanks", "🙏"),
```

### packages/shared/src/phrases.ts line 102 — pending

```text
ta: ["வணக்கம், நான் பேசுறது கேக்குதா?"],
```

### packages/shared/src/phrases.ts line 106 — pending

```text
{ id: "medicine", icon: "💊", ta: "மாத்திரை", en: "Medicine" },
```

### packages/shared/src/phrases.ts line 107 — pending

```text
{ id: "food", icon: "🍛", ta: "சாப்பாடு", en: "Food" },
```

### packages/shared/src/phrases.ts line 108 — pending

```text
{ id: "drink", icon: "🥤", ta: "குடிக்க", en: "Drink" },
```

### packages/shared/src/phrases.ts line 109 — pending

```text
{ id: "toilet", icon: "🚻", ta: "பாத்ரூம்", en: "Toilet" },
```

### packages/shared/src/phrases.ts line 110 — pending

```text
{ id: "pain", icon: "🤕", ta: "வலி", en: "Pain" },
```

### packages/shared/src/phrases.ts line 111 — pending

```text
{ id: "people", icon: "👨‍👩‍👧", ta: "ஆட்கள்", en: "People" },
```

### packages/shared/src/phrases.ts line 112 — pending

```text
{ id: "feelings", icon: "😊", ta: "மனசு", en: "Feelings" },
```

### packages/shared/src/phrases.ts line 113 — pending

```text
{ id: "rest", icon: "🛏️", ta: "ஓய்வு", en: "Rest" },
```

### packages/shared/src/phrases.ts line 114 — pending

```text
{ id: "tv_phone", icon: "📺", ta: "டிவி / ஃபோன்", en: "TV & phone" },
```

### packages/shared/src/phrases.ts line 115 — pending

```text
{ id: "prayer", icon: "🙏", ta: "சாமி", en: "Prayer" },
```

### packages/shared/src/phrases.ts line 116 — pending

```text
{ id: "go_out", icon: "🚶", ta: "வெளியே", en: "Go out" },
```

### packages/shared/src/phrases.ts line 119 — pending

```text
{ id: "head", ta: "தலை", en: "head", paired: false },
```

### packages/shared/src/phrases.ts line 120 — pending

```text
{ id: "mouth", ta: "வாய் / பல்", en: "mouth", paired: false },
```

### packages/shared/src/phrases.ts line 121 — pending

```text
{ id: "throat", ta: "தொண்டை", en: "throat", paired: false },
```

### packages/shared/src/phrases.ts line 122 — pending

```text
{ id: "chest", ta: "நெஞ்சு", en: "chest", paired: false },
```

### packages/shared/src/phrases.ts line 123 — pending

```text
{ id: "stomach", ta: "வயிறு", en: "stomach", paired: false },
```

### packages/shared/src/phrases.ts line 124 — pending

```text
{ id: "back", ta: "முதுகு", en: "back", paired: false },
```

### packages/shared/src/phrases.ts line 125 — pending

```text
{ id: "eye", ta: "கண்", en: "eye", paired: true },
```

### packages/shared/src/phrases.ts line 126 — pending

```text
{ id: "ear", ta: "காது", en: "ear", paired: true },
```

### packages/shared/src/phrases.ts line 127 — pending

```text
{ id: "shoulder", ta: "தோள்", en: "shoulder", paired: true },
```

### packages/shared/src/phrases.ts line 128 — pending

```text
{ id: "arm", ta: "கை", en: "arm", paired: true },
```

### packages/shared/src/phrases.ts line 129 — pending

```text
{ id: "hip", ta: "இடுப்பு", en: "hip", paired: true },
```

### packages/shared/src/phrases.ts line 130 — pending

```text
{ id: "knee", ta: "முட்டி", en: "knee", paired: true },
```

### packages/shared/src/phrases.ts line 131 — pending

```text
{ id: "leg", ta: "கால்", en: "leg", paired: true },
```

### packages/shared/src/phrases.ts line 132 — pending

```text
{ id: "foot", ta: "பாதம்", en: "foot", paired: true },
```

### packages/shared/src/phrases.ts line 148 — pending

```text
? "நெஞ்சு வலிக்குது, உடனே உதவி வேணும்."
```

### packages/shared/src/phrases.ts line 158 — pending

```text
? "நெஞ்சு அடைக்குற மாதிரி இருக்கு."
```

### packages/shared/src/phrases.ts line 168 — pending

```text
? "மூச்சு விட கஷ்டமா இருக்கு."
```

### packages/shared/src/phrases.ts line 178 — pending

```text
const tamil = [p.paired ? (side === "left" ? "இடது" : "வலது") : "", p.ta]
```

### packages/shared/src/phrases.ts line 184 — pending

```text
? `${tamil} கொஞ்சம் வலிக்குது.`
```

### packages/shared/src/phrases.ts line 193 — pending

```text
lang === "ta" ? `${tamil} ரொம்ப வலிக்குது.` : `My ${name} hurts a lot.`,
```

### packages/shared/src/phrases.ts line 202 — pending

```text
? `${tamil} வலி தாங்க முடியல, உடனே உதவி வேணும்.`
```

### packages/shared/src/phrases.ts line 275 — pending

```text
"இரண்டு",
```

### packages/shared/src/phrases.ts line 276 — pending

```text
"ரெண்டு",
```

### packages/shared/src/phrases.ts line 277 — pending

```text
"மூன்று",
```

### packages/shared/src/phrases.ts line 278 — pending

```text
"மூணு",
```

### packages/shared/src/phrases.ts line 279 — pending

```text
"நான்கு",
```

### packages/shared/src/phrases.ts line 280 — pending

```text
"நாலு",
```

### packages/shared/src/phrases.ts line 281 — pending

```text
"ஐந்து",
```

### packages/shared/src/phrases.ts line 282 — pending

```text
"அஞ்சு",
```

### packages/shared/src/phrases.ts line 283 — pending

```text
"ஆறு",
```

### packages/shared/src/phrases.ts line 284 — pending

```text
"ஏழு",
```

### packages/shared/src/phrases.ts line 285 — pending

```text
"எட்டு",
```

### packages/shared/src/phrases.ts line 286 — pending

```text
"ஒன்பது",
```

### packages/shared/src/phrases.ts line 287 — pending

```text
"பத்து",
```

### packages/shared/src/phrases.ts line 288 — pending

```text
"பதினொன்று",
```

### packages/shared/src/phrases.ts line 289 — pending

```text
"பதினொண்ணு",
```

### packages/shared/src/phrases.ts line 290 — pending

```text
"பன்னிரண்டு",
```

### packages/shared/src/phrases.ts line 291 — pending

```text
"பனிரெண்டு",
```

### packages/shared/src/phrases.ts line 292 — pending

```text
"பதின்மூன்று",
```

### packages/shared/src/phrases.ts line 293 — pending

```text
"பதிமூணு",
```

### packages/shared/src/phrases.ts line 294 — pending

```text
"பதினான்கு",
```

### packages/shared/src/phrases.ts line 295 — pending

```text
"பதினைந்து",
```

### packages/shared/src/phrases.ts line 296 — pending

```text
"பதினாறு",
```

### packages/shared/src/phrases.ts line 297 — pending

```text
"பதினேழு",
```

### packages/shared/src/phrases.ts line 298 — pending

```text
"பதினெட்டு",
```

### packages/shared/src/phrases.ts line 299 — pending

```text
"பத்தொன்பது",
```

### packages/shared/src/phrases.ts line 300 — pending

```text
"இருபது",
```

### packages/shared/src/phrases.ts line 301 — pending

```text
"முப்பது",
```

### packages/shared/src/phrases.ts line 302 — pending

```text
"நாற்பது",
```

### packages/shared/src/phrases.ts line 303 — pending

```text
"ஐம்பது",
```

### packages/shared/src/phrases.ts line 304 — pending

```text
"அறுபது",
```

### packages/shared/src/phrases.ts line 305 — pending

```text
"எழுபது",
```

### packages/shared/src/phrases.ts line 306 — pending

```text
"எண்பது",
```

### packages/shared/src/phrases.ts line 307 — pending

```text
"தொண்ணூறு",
```

### packages/shared/src/phrases.ts line 308 — pending

```text
"நூறு",
```

### packages/shared/src/phrases.ts line 309 — pending

```text
"ஆயிரம்",
```

### packages/shared/src/phrases.ts line 310 — pending

```text
"லட்சம்",
```

### packages/shared/src/phrases.ts line 311 — pending

```text
"கோடி",
```

### packages/shared/src/phrases.ts line 312 — pending

```text
"அரை",
```

### packages/shared/src/seed.ts line 37 — pending

```text
aliases: ["கார்த்திக்", "Karthi"],
```

### packages/shared/src/seed.ts line 46 — pending

```text
aliases: ["ப்ரியா"],
```

### packages/shared/src/seed.ts line 55 — pending

```text
aliases: ["மீனா"],
```

### packages/shared/src/seed.ts line 64 — pending

```text
aliases: ["ஆதவ்"],
```

### packages/shared/src/seed.ts line 73 — pending

```text
aliases: ["Anjali", "அஞ்சலி"],
```

### packages/shared/src/seed.ts line 82 — pending

```text
aliases: ["Rao", "ராவ்"],
```

## Review sign-off

| Language | Reviewer/date | Result | Corrections |
| --- | --- | --- | --- |
| Tamil | pending | pending | pending |
| Hindi | pending | pending, M10 | pending |
| Telugu | pending | pending, M10 | pending |
