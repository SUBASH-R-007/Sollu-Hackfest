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

Pending final source scan. All added Tamil/Hindi/Telugu strings in apps/ and packages/ must be inventoried here before milestone completion; original drafts do not imply native-speaker approval.

## Review sign-off

| Language | Reviewer/date | Result | Corrections |
| --- | --- | --- | --- |
| Tamil | pending | pending | pending |
| Hindi | pending | pending, M10 | pending |
| Telugu | pending | pending, M10 | pending |
