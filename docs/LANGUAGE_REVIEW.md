# Language review inventory

## Speech companion, Voice flow and engine messages — 2026-09-29 (third pass)

All entries are **pending native-speaker review**. Lesson phrases reuse the authored catalog/quick-phrase sentences word for word.

**Navigation:** துணை (Companion) · பேச்சுத் துணை (Speech companion) · பேச்சு → எழுத்து (Voice flow).

**Speech companion** (`apps/web/src/features/companion/`): unit title வசதி; குடிக்க, சாப்பாடு (built from existing words); உங்கள் வேகத்தில், கொஞ்சம் பயிற்சி. · வணக்கம் · தினசரி இலக்கு · இன்று {done} / {goal} · இலக்கு முடிந்தது. நல்லது! · தினசரி இலக்கு: {n} · இந்த வாரம் · பயிற்சி செய்தீர்கள் · ஓய்வு நாள் · இன்னும் வரவில்லை · பயிற்சி இல்லை · தொடர்ந்து {n} நாள் — ஓய்வு நாளும் சரி · எந்த நாளும் தொடங்கலாம் — ஓய்வு நாளும் சரி · தொடரலாம் · {n} வாக்கியங்களை மீண்டும் பழகுங்கள் · மீண்டும் பழகு · இன்று {n} தயார் · இன்று எதுவும் இல்லை · பயிற்சி மொழி · பாடங்கள் · {n} வாக்கியங்கள் · {n} பாடங்கள் முடிந்தன · அடுத்து இது · இன்று ஓய்வு · ஓய்வு நாள் சேமிக்கப்பட்டது. ஓய்வும் உதவும். · முன்னேற்றம் இந்தச் சாதனத்தில் மட்டும் இருக்கும். இது பயிற்சி, பேச்சுத் தேர்வு அல்ல. · படி {i} / {n} · பாட முன்னேற்றம் · ஓய்வு · ஓய்வும் பயிற்சியின் பகுதி. விரும்பும்போது தொடருங்கள். · கேட்டு, திரும்பச் சொல்லுங்கள் · சரியான வாக்கியத்தைத் தேர்ந்தெடுங்கள் · வாக்கியத்தை அமையுங்கள் · உங்கள் வழியில் சொல்லுங்கள் · தயாரானதும் சொல்லுங்கள். காட்டியோ உதவிக் கருவியாலோ சொல்லலாம். · இது பயிற்சி மட்டும். உண்மையான உதவிக்கு ‘உதவி’ பொத்தானைத் தொடுங்கள். · சேமித்துத் தொடருங்கள் · மைக் மூலம் சரிபார் · அனுமதித்து ஒருமுறை கேள் · கேட்பதை நிறுத்து · கேட்கிறது… · கேட்டது: · மதிப்பிடப்படவில்லை · பேச்சு அறிதல் இல்லை. · {n}% சொல் பொருத்தம் — வார்த்தைகள் மட்டும், உச்சரிப்பு அல்ல · இந்த எழுத்துடன் தொடருங்கள் · browser/on-device recognition notices · ஆமா, அதுதான்! · படத்துக்குப் பொருந்துவது இது: · அடுத்து · வார்த்தைகளை வரிசையாகத் தொடுங்கள். நீக்க, வைத்த வார்த்தையைத் தொடுங்கள். · உங்கள் வாக்கியம் · வார்த்தைகள் · நீக்கு · சரிபார் · நல்லது — வாக்கியம் சரி. · வாக்கியம் இதுதான்: · மீண்டும் முயலுங்கள் · பேசலாம், எழுதலாம், காட்டலாம் — எல்லாமே சரி. · பேசினேன் · எழுதினேன் · காட்டினேன் · இங்கே எழுதுங்கள் (சேமிக்கப்படாது) · செய்தேன் · தவிர் · நல்லது! · பரவாயில்லை. மீண்டும் பழக வரும். · மாதிரிக் குரல் இல்லை. படிக்கலாம் அல்லது துணையுடன் பழகலாம். · save-failure messages · பாடம் முடிந்தது · இங்கே நிறுத்தினீர்கள். பரவாயில்லை. · பழகிய வாக்கியங்கள்: {n} · மீண்டும் பழக · உங்கள் பயிற்சி முன்னேற்றத்தில் இந்தச் சாதனத்தில் சேமிக்கப்பட்டது. · துணைக்குத் திரும்பு.

**Voice flow** (`apps/web/src/features/flow/FlowPage.tsx`): பேச்சு → எழுத்து · தாராளமாகப் பேசுங்கள். நாங்கள் சீராக்குகிறோம். · எவ்வளவு நேரம் வேண்டுமானாலும் பேசுங்கள். இடைவெளி பரவாயில்லை. · நான் பேசும் மொழி · பேச்சு எழுத்தாகும் வழி · இந்தச் சாதனத்தில் · அதிகத் துல்லியம் (OpenAI) · cloud/on-device/browser notices · பேசத் தொடங்கு · தொடர்ந்து பேசு · நிறுத்து · நிறுத்தி அனுப்பு · பேச்சை எழுத்தாக்குகிறது… · மைக் தொடங்குகிறது… · கேட்கிறது… · உங்கள் வார்த்தைகள் · உங்கள் வார்த்தைகள் இங்கே வரும். · கேட்டது · நீக்கியது · நான் சொல்ல வந்ததைக் கண்டுபிடி · அப்படியே சொல் · நகலெடு · நகலெடுக்கப்பட்டது. · நகலெடுக்க முடியவில்லை. · அழி · எழுத்தாக்க அனுப்பு · பதிவை நீக்கு · two-minute-limit notice · tidy-up explanation · வார்த்தைகள் கேட்கவில்லை. மீண்டும் முயலுங்கள். · மைக் நின்றது. உங்கள் வார்த்தைகள் இருக்கின்றன. Filler matching (input only): ம், ம்ம், ம்ம்ம்.

**Sentence-engine reasons** (`apps/web/src/state.tsx`): timeout, key, model, quota, provider, network and invalid-output messages ({engine} … வினாடிகளில் பதில் தரவில்லை… etc.), and மாற்று வாக்கியங்கள் தானாகச் சேர்க்கப்படவில்லை.

## Easier practice, topics and patient screens — 2026-09-29 (second pass)

All entries are **pending native-speaker review**. Tests confirm rendering and matching only.

**Tamil practice library** (`apps/web/src/features/rehab/model.ts`, spoken targets; titles and instructions in the same entries): தண்ணி (பயனுள்ள சொல்); உதவி (உதவி கேளுங்கள்); கொஞ்சம் நேரம் குடுங்க. (நேரம் கேளுங்கள்); எனக்கு தண்ணி வேணும். (ஒரு கோரிக்கை); எனக்கு கொஞ்சம் ஓய்வு வேணும். (ஓய்வு கேளுங்கள்); நான் சொல்ல வந்தது அது இல்ல. மறுபடி சொல்றேன். (உரையாடலைச் சரிசெய்யுங்கள்); நான் என் வழியில பேசுவேன். கொஞ்சம் பொறுமையா கேளுங்க. (உங்கள் தேவையைச் சொல்லுங்கள்); நான் தேர்ந்தெடுக்கணும். (ஒரு செய்தியைத் தேர்ந்தெடுங்கள்); மறுபடி சொல்லுங்க. (மீண்டும் சொல்லச் சொல்லுங்கள்); ஆமா இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க. (உங்கள் பொருளை உறுதிசெய்யுங்கள்). Each instruction sentence in that file also needs review.

**Practice screen** (`PracticePage.tsx`): பேச்சுப் பயிற்சி · உங்கள் வார்த்தைகள், உங்கள் வேகம் · தொடங்க ஒரு செய்தியைத் தொடுங்கள். தேவைப்படும்போது ஓய்வெடுங்கள். · ஒரு செய்தியைத் தேர்ந்தெடுங்கள் · நான் பயன்படுத்திய செய்தி · இந்தச் சொல்லை மீண்டும் பழகு · நானே எழுதுகிறேன் · என் சொந்தச் செய்தி · என் பயிற்சி வார்த்தைகள் · பயிற்சியைத் தொடங்கு · இப்போது எவ்வளவு சோர்வாக இருக்கிறீர்கள்? (விருப்பம்) · பயிற்சிக்கு முன் சோர்வு · பயிற்சிக்குப் பின் சோர்வு · முயற்சி · 0 = இல்லை · 10 = மிக அதிகம் · 0 = முயற்சி இல்லை · 10 = மிக அதிகம் · மாதிரியைக் கேளுங்கள் · ஓய்வு எடு · தொடரத் தயார் · ஒப்புக்கொண்டு ஒலிப்பதிவு · ஒப்புக்கொண்டு காணொளிப்பதிவு · பதிவை முடி · பதிவை ரத்து செய் · இந்தப் பதிவை நீக்கு · recording-consent sentence (பதிவு விருப்பத்துக்குரியது; …) · எப்படி இருந்தது? · சொன்னேன் · இன்னும் இல்லை · தெளிவாக வராத சொல்லைத் தொடுங்கள் · என் உதவிக் கருவியுடன் பழகினேன் · கேட்டதை எழுதுங்கள் · என் துணைக்குப் புரிந்ததா? · என் பொருள் புரிந்ததா? · ஆம் / கொஞ்சம் / இல்லை · கூடுதல் விவரங்கள் (விருப்பம்) · எது உதவியது? (விருப்பம்) · பயிற்சியைச் சேமி · சேமிக்கிறது… · அடுத்த பயிற்சி · என் முன்னேற்றத்தைப் பார் · வேறு பயிற்சியைத் தேர்ந்தெடு · இதை விட்டுவிட்டு மீண்டும் தொடங்கு · இந்தப் பயிற்சி பற்றி · rest-threshold notices · saved and reviewed-word statuses.

**Topics** (`Patient.tsx`): feelings சந்தோஷம், சோகம், கவலை, பயம், கோபம், தனிமை, களைப்பு, போரடிக்குது, குழப்பம், நிம்மதி; டிவி, ஃபோன், பாட்டு; வெளியே, வீட்டுக்கு. Default contact alias `டாக்டர் ராவ்` (`db.ts`) now used in Tamil sentences such as `டாக்டர் ராவை எனக்கு ஃபோன் பண்ண சொல்லுங்க.`

**Confirm / Speak / People / Recent / Help / dock** (`Patient.tsx`, `Communication.tsx`, `state.tsx`): 📷 நான் பார்ப்பது · 🎤 நான் கேட்டது · 🗂️ நீங்கள் தேர்ந்தது · 💬 உங்கள் வார்த்தைகள் · நீங்கள் சொல்ல வந்தது இதுவா? · ஒரு வாக்கியத்தைத் தேர்ந்தெடுத்து, ‘சொல்’ தொடுங்கள். · சொல்ல உங்கள் வாக்கியத்தைத் தொடுங்கள். · health-wording notice · யாரிடம் · அருகில் உள்ளவர் · மீண்டும் பேசு · என் வாக்கியங்களைத் திற · சொல் · Speak screen title/eyebrow/subtitles, listening statuses, local-recognition notices, அவர்கள் கேட்டதை எழுதுங்கள் · இந்தக் கேள்வியை வை · எழுது · பேச்சு அறிதல் அமைப்புகள் · என் தேர்வுகளுக்குத் திரும்பு · யாரிடம் பேசுகிறீர்கள்? · listener subtitle · save-failure message · வாக்கியங்களைப் புதுப்பி · சமீபத்திய வார்த்தைகள் · மீண்டும் சொல்ல ஒரு வாக்கியத்தைத் தொடுங்கள். · empty-recent text · SMS no-number note · dock statuses (✓ …, குரல் இல்லை. காட்டுங்கள்: …, ஒலிக்கவில்லை. காட்டுங்கள்: …) · AI clarification notice ({engine}-க்கு இன்னும் கொஞ்சம் தெளிவு வேண்டும்…). Home Topics tile now uses தலைப்புகள் (was வகைகள்).

**Caregiver gate and camera** (`App.tsx`, `Camera.tsx`): குடும்பத்தினர், பராமரிப்பாளர்களுக்கு · மீண்டும் வாருங்கள். · இந்த இடத்தை அமைப்போம். · PIN prompts · all camera errors, privacy/download lines, "இது:" label, object names (பாட்டில், கப், கிண்ணம், வாழைப்பழம், ஆப்பிள், ஆரஞ்சு, சாண்ட்விச், படுக்கை, சோபா, நாற்காலி, கழிவறை, சிங்க், பல் பிரஷ், டிவி, ரிமோட், ஃபோன், புத்தகம், கடிகாரம்) and categories (குடிக்க, சாப்பாடு, ஓய்வு, கழிவறை, குளியல், டிவி, ஃபோன், படிக்க, நேரம்).

**Input matching only** (`packages/shared/src/lexicon.ts`, not spoken): ஆஸ்பத்திரி, மருத்துவமனை, சுகர், stems விழுந், இருமல், வீக்கம்; Tanglish body parts (thalai/thala, vaai, pal/pallu, thondai, nenju, vayiru/vayitru/vayithu/vairu, mudhugu, kazhuthu, kan/kannu, kaadhu, thol, kai, ullangai, manikattu, iduppu, mutti, kaal, paadham, kanukkal), pain endings vali/valikuthu/valikkudhu, udhavi/uthavi, maathirai/mathirai, marunthu/marundhu, vizhunthuten, irumal, veekkam.

## Language, speech and sentence-engine fixes — 2026-09-29

All entries are **pending native-speaker review**. Automated tests confirm rendering and matching only.

New interface wording in `apps/web/src/pages/Patient.tsx`, `apps/web/src/state.tsx` and `apps/web/src/features/personal/BackupPanel.tsx`:

| English | Tamil |
| --- | --- |
| Language: Tamil. Switch to English (header switch label) | மொழி: தமிழ். Switch to English |
| Language: English. Switch to Tamil (header switch label) | தமிழுக்கு மாற்று |
| I will speak in | நான் பேசும் மொழி |
| Edit the words | வார்த்தைகளைத் திருத்து |
| Did you say…? | நீங்கள் சொன்னது இதுவா? |
| Show prepared phrases instead | தயாரான வாக்கியங்களைக் காட்டு |
| Sentence engine settings | வாக்கிய இயந்திர அமைப்புகள் |
| Find new choices | புதிய தேர்வுகள் |
| The microphone has stopped. Tap Done to use these words, or Keep listening. | மைக் நின்றது. இந்த வார்த்தைகளுக்கு ‘முடிந்தது’ தொடுங்கள், அல்லது தொடர்ந்து கேளுங்கள். |
| Settings changed, so the earlier choices were cleared. Tap Find new choices to try the same words again. | அமைப்புகள் மாறியதால் முந்தைய தேர்வுகள் நீக்கப்பட்டன. அதே வார்த்தைகளுக்குப் ‘புதிய தேர்வுகள்’ தொடுங்கள். |
| {engine}'s suggestions did not pass the checks for your words… | {engine} தந்த வாக்கியங்கள் உங்கள் வார்த்தைகளுடன் பொருந்தவில்லை. வேறு வார்த்தைகளை முயலுங்கள். |
| Cloud sentences are off on this device, so {engine} was not asked… | இந்தச் சாதனத்தில் கிளவுட் வாக்கியங்கள் அணைக்கப்பட்டுள்ளன; {engine} கேட்கப்படவில்லை. அமைப்புகளில் இயக்குங்கள். |
| The Sollu server restarted and forgot the {engine} choice… | Sollu சர்வர் மீண்டும் தொடங்கியதால் {engine} தேர்வு நீங்கியது. அமைப்புகளில் மீண்டும் தேர்ந்தெடுங்கள். |
| {engine} could not answer… No vocabulary phrases were substituted. | {engine} பதில் தரவில்லை. மாற்று வாக்கியங்கள் தானாகச் சேர்க்கப்படவில்லை. |
| {name} is coming ✓ | {name} வருகிறார் ✓ |
| Help cancelled. | உதவி ரத்து செய்யப்பட்டது. |
| Waiting for someone to reply… | பதிலுக்குக் காத்திருக்கிறது… |
| I need help. Please come to me. (SMS body) | எனக்கு உதவி வேணும். தயவுசெய்து என்னிடம் வாருங்கள். |
| Rehabilitation practice and its recordings use a separate store… (backup panel) | மறுவாழ்வுப் பயிற்சியும் பதிவுகளும் தனிச் சேமிப்பில் உள்ளன; இந்தக் காப்புப் பிரதியில் இல்லை. சாதனத் தரவை அழிக்கும் முன், ‘சிகிச்சை நிபுணர்’ தாவலில் அவற்றை ஏற்றுமதி செய்யவும். |

Changed spoken wording in `packages/shared/src/mock.ts` (accusative case for contact names): `கார்த்திக்கை எனக்கு ஃபோன் பண்ண சொல்லுங்க.` and `கார்த்திக்கை கூட்டிட்டு வாங்க.` (previously `கார்த்திக்யை…`); `ராவை எனக்கு ஃபோன் பண்ண சொல்லுங்க.` and `ராவை கூட்டிட்டு வாங்க.`. Vowel-final names ending in ஆ/ஓ/உ now take `வை` (e.g. லதாவை); இ/ஈ/ஐ/எ/ஏ endings take `யை`. A name with no Tamil-script alias still receives `யை` after Latin letters (e.g. `Karthikயை`) — known, not yet fixed.

New Tamil **matching** terms (input recognition only, not spoken output) in `packages/shared/src/lexicon.ts`: negation இல்ல, வேணா, வேண்டா, முடியாது, மாட்டேன், மாட்டோம், மாட்டாங்க, கூடாது, தெரியாது, suffix rules (-ல after a plain consonant; -லை after ய/க/ட/ர/ங/ச/ப; fused இல்லை); question words எங்கே, எங்க, எப்போ, எப்போது, ஏன், எப்படி, யாரு, யார், என்ன; health stems காய்ச்சல், ஜுரம், மூச்ச, வாந்தி, மயக்க, இரத்த, குமட்ட, ஆம்புலன்ஸ்; body forms வயிற்று, வயித்து, மூக்கு; never-complete words தூக்க, தலைய; neutral grammar words எனக்கு, கொஞ்சம், வேணும், வேண்டும், ப்ளீஸ், தயவுசெய்து, குடுங்க, கொடுங்க. Dialect coverage and false matches need review.

## Rehabilitation and clinician navigation — 2026-09-28

Added to the shared `apps/web/src/lib/copy.ts` dictionary and applied to mobile/desktop navigation, rehabilitation navigation, and caregiver shortcuts. Native-speaker approval remains pending; runtime verification confirms language selection and rendering only.

| English | Tamil |
| --- | --- |
| Rehabilitation | மறுவாழ்வு |
| Clinician | சிகிச்சை நிபுணர் |
| My rehabilitation | என் மறுவாழ்வு |
| Clinician dashboard | சிகிச்சை நிபுணர் பலகை |
| Practice | பயிற்சி |
| Book appointment | சந்திப்பை முன்பதிவு செய் |
| Rehabilitation navigation | மறுவாழ்வு வழிசெலுத்தல் |

## Fragment repairs and word dashboard — 2026-09-28

The new repair module reuses catalog Tamil meanings; no newly approved Tamil clinical content is introduced. Regression examples include `தண்-ணீர்` and `தண்ணீ` as possible input for the existing water meaning, plus Tanglish `th-thanni` and `than-ni`. These fixtures and the proposed interpretation display need native-speaker review across dialects and code mixing. The new privacy, encryption and word-analysis controls are English; full interface translation remains pending. Automated match tests are not language approval.

## Multiple sentence options — 2026-09-28

Pending native-speaker review in `apps/web/src/pages/Patient.tsx`:

- `மேலும் விருப்பங்களைக் காட்டு` — Show more options.
- `தயாரான விருப்பம் · பொருளைச் சரிபாருங்கள்` — Prepared option · Check the meaning.

## Rehabilitation addition — 2026-09-28

Pending native-speaker and clinical review. New Tools tile in `apps/web/src/pages/Support.tsx`: `தொடர்பு பயிற்சி` (Communication practice), `உங்கள் வேகத்தில் பயிற்சி செய்யுங்கள்` (Practise at your own pace). Practice/dashboard controls and starter targets are currently English; Tamil custom targets are supported and require review by the person and a fluent speaker. Unicode scoring fixtures are test strings, not clinically approved prompts.

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

Final frozen-source scan dated 2026-09-28. Every runtime source line in apps/**/src and packages/**/src containing Tamil, Devanagari or Telugu is included below; test files and generated bundles are excluded. Line numbers match the frozen source at scan time. Whole lines preserve interpolation and punctuation. The expanded bilingual vocabulary is draft content checked by automated engineering tests; all wording remains pending native-speaker and aphasia-friendly review. Hindi/Telugu support remains deferred.

Scan coverage: 895 matching lines across 18 runtime source files, from 50 files inspected. All 67 original brief entries above remain unchanged.

### apps/server/src/app.ts line 375 — pending

```text
        water: "தண்ணி",
```

### apps/server/src/app.ts line 376 — pending

```text
        rasam: "ரசம்",
```

### apps/server/src/app.ts line 378 — pending

```text
        head: "தலை வலி",
```

### apps/server/src/app.ts line 379 — pending

```text
        chest: "நெஞ்சு",
```

### apps/web/src/App.tsx line 375 — pending

```text
                    தமிழ்
```

### apps/web/src/App.tsx line 494 — pending

```text
            சொல்லு <span aria-hidden="true">✦</span> Say it, your way.
```

### apps/web/src/db.ts line 120 — pending

```text
      aliases: ["ப்ரியா"],
```

### apps/web/src/db.ts line 129 — pending

```text
      aliases: ["கார்த்திக்", "Karthi"],
```

### apps/web/src/db.ts line 138 — pending

```text
      aliases: ["மீனா"],
```

### apps/web/src/features/personal/BackupPanel.tsx line 32 — pending

```text
          : t("மீண்டும் முயற்சி செய்யவும்", "Please try again"),
```

### apps/web/src/features/personal/BackupPanel.tsx line 42 — pending

```text
          "காப்புப் பிரதிக்கு அமைப்புகளைத் திறக்கவும்.",
```

### apps/web/src/features/personal/BackupPanel.tsx line 49 — pending

```text
      <h2>{t("பூட்டிய காப்புப் பிரதி", "Encrypted local backup")}</h2>
```

### apps/web/src/features/personal/BackupPanel.tsx line 52 — pending

```text
          "உங்கள் அட்டைகள், படங்கள், பதிவு செய்த குரல், ஒப்புதல், சொற்றொடர்கள் மற்றும் பதிவேடு ஒரு பூட்டிய கோப்பில் சேமிக்கப்படும். இணையத்தில் அனுப்பப்படாது.",
```

### apps/web/src/features/personal/BackupPanel.tsx line 58 — pending

```text
          "PIN, தொலைபேசி இணைப்பு மற்றும் அமைப்புகள் இதில் இல்லை. கடவுச் சொற்றொடரை மறந்தால் கோப்பைத் திறக்க முடியாது.",
```

### apps/web/src/features/personal/BackupPanel.tsx line 64 — pending

```text
          "கடவுச் சொற்றொடர் (குறைந்தது 12 எழுத்துகள்)",
```

### apps/web/src/features/personal/BackupPanel.tsx line 80 — pending

```text
        {t("ஏற்றுமதிக்கு மீண்டும் எழுது", "Repeat passphrase for export")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 104 — pending

```text
                "பூட்டிய கோப்பு பதிவிறக்கப்பட்டது.",
```

### apps/web/src/features/personal/BackupPanel.tsx line 111 — pending

```text
        {t("பூட்டிய காப்புப் பிரதியைச் சேமி", "Download encrypted backup")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 115 — pending

```text
        {t("மீட்டெடுக்கக் கோப்பைத் தேர்ந்தெடு", "Choose a backup to restore")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 136 — pending

```text
        {t("முதலில் உள்ளடக்கத்தைப் பார்", "Preview before importing")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 140 — pending

```text
          <h3>{t("சேர்க்க வேண்டியவை", "Review this backup")}</h3>
```

### apps/web/src/features/personal/BackupPanel.tsx line 145 — pending

```text
                <th>{t("வகை", "Collection")}</th>
```

### apps/web/src/features/personal/BackupPanel.tsx line 146 — pending

```text
                <th>{t("எண்ணிக்கை", "Count")}</th>
```

### apps/web/src/features/personal/BackupPanel.tsx line 161 — pending

```text
                "அட்டைகளையும் குரல் ஒப்புதலையும் பார்",
```

### apps/web/src/features/personal/BackupPanel.tsx line 196 — pending

```text
              "ஏற்கெனவே உள்ளவை மாற்றப்படாது. புதிய தனிப்பட்ட அட்டைகள் மீண்டும் உங்கள் ஒப்புதலுக்காக வைக்கப்படும்.",
```

### apps/web/src/features/personal/BackupPanel.tsx line 215 — pending

```text
                      `${result.added} சேர்க்கப்பட்டது. ${result.skipped} ஏற்கெனவே உள்ளவை விடப்பட்டது.`,
```

### apps/web/src/features/personal/BackupPanel.tsx line 222 — pending

```text
              {t("பார்த்தேன், புதியவற்றைச் சேர்", "Reviewed — add new entries")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 225 — pending

```text
              {t("ரத்து செய்", "Cancel")}
```

### apps/web/src/features/personal/BackupPanel.tsx line 231 — pending

```text
        {busy ? t("செயல்படுகிறது…", "Working…") : status}
```

### apps/web/src/features/personal/components.tsx line 55 — pending

```text
        ← {t("கருவிகள்", "Tools")}
```

### apps/web/src/features/personal/components.tsx line 77 — pending

```text
      aria-label={`${label ?? t("சொல்லு", "Say")}: ${text}`}
```

### apps/web/src/features/personal/components.tsx line 100 — pending

```text
          ? t("மீண்டும் தொட்டால் சொல்லும்", "Tap again to say")
```

### apps/web/src/features/personal/components.tsx line 101 — pending

```text
          : (label ?? t("தொட்டால் சொல்லும்", "Tap to say"))}
```

### apps/web/src/features/personal/components.tsx line 122 — pending

```text
                  ? t("சாதனக் குரலில் கேட்டது", "Device voice preview finished")
```

### apps/web/src/features/personal/components.tsx line 124 — pending

```text
                      "குரல் கிடைக்கவில்லை. இந்த வரியைப் படியுங்கள்.",
```

### apps/web/src/features/personal/components.tsx line 132 — pending

```text
        <small>▷ {t("கேள் · சாதனக் குரல்", "Listen · device voice")}</small>
```

### apps/web/src/features/personal/components.tsx line 158 — pending

```text
            "சேர்க்க அமைப்புகளைத் திறக்கவும்",
```

### apps/web/src/features/personal/components.tsx line 165 — pending

```text
          "சேர்த்த பிறகு, பேசுபவர் பார்த்து ஒப்புக்கொள்ள வேண்டும்.",
```

### apps/web/src/features/personal/components.tsx line 189 — pending

```text
            setError(t("சேமிக்க முடியவில்லை", "Could not save")),
```

### apps/web/src/features/personal/components.tsx line 193 — pending

```text
        {item.pinned ? "★" : "☆"} {t("முதலில் வை", "Pin first")}
```

### apps/web/src/features/personal/components.tsx line 205 — pending

```text
                  setError(t("சேமிக்க முடியவில்லை", "Could not save")),
```

### apps/web/src/features/personal/components.tsx line 210 — pending

```text
                ? t("சொற்களில் காட்டு", "Show in My words")
```

### apps/web/src/features/personal/components.tsx line 211 — pending

```text
                : t("சொற்களில் மறை", "Hide from My words")}
```

### apps/web/src/features/personal/components.tsx line 214 — pending

```text
          <TapButton onActivate={onEdit}>{t("திருத்து", "Edit")}</TapButton>
```

### apps/web/src/features/personal/components.tsx line 216 — pending

```text
            {t("நீக்கு", "Delete")}
```

### apps/web/src/features/personal/components.tsx line 223 — pending

```text
            {t("இந்த அட்டையை நீக்கவா?", "Delete this card from this device?")}
```

### apps/web/src/features/personal/components.tsx line 228 — pending

```text
                setError(t("நீக்க முடியவில்லை", "Could not delete")),
```

### apps/web/src/features/personal/components.tsx line 232 — pending

```text
            {t("ஆம், நீக்கு", "Yes, delete")}
```

### apps/web/src/features/personal/components.tsx line 235 — pending

```text
            {t("வேண்டாம்", "Keep it")}
```

### apps/web/src/features/personal/components.tsx line 261 — pending

```text
      aria-label={t("உங்கள் ஒப்புதல்", "Your approval")}
```

### apps/web/src/features/personal/components.tsx line 264 — pending

```text
        {t("இது நீங்கள் சொல்ல விரும்புவதா?", "Is this what you want to say?")}
```

### apps/web/src/features/personal/components.tsx line 272 — pending

```text
              {t("தேட உதவும் பெயர்கள்", "Names that help you find this word")}:{" "}
```

### apps/web/src/features/personal/components.tsx line 283 — pending

```text
          "ஒவ்வொரு வரியையும் பாருங்கள். சரி என்றால் மட்டும் சேர்க்கவும்.",
```

### apps/web/src/features/personal/components.tsx line 304 — pending

```text
                    : t("மீண்டும் முயற்சி செய்யவும்", "Please try again"),
```

### apps/web/src/features/personal/components.tsx line 309 — pending

```text
          ✓ {t("சரி, என் அட்டைகளில் சேர்", "Yes, add to my cards")}
```

### apps/web/src/features/personal/components.tsx line 312 — pending

```text
          {t("இப்போது வேண்டாம்", "Not now")}
```

### apps/web/src/features/personal/components.tsx line 315 — pending

```text
          ■ {t("நிறுத்து", "Stop")}
```

### apps/web/src/features/personal/components.tsx line 366 — pending

```text
        <p>{t("திருத்த அமைப்புகளைத் திறக்கவும்", "Unlock settings to edit")}</p>
```

### apps/web/src/features/personal/components.tsx line 367 — pending

```text
        <TapButton onActivate={onClose}>{t("திரும்பு", "Back")}</TapButton>
```

### apps/web/src/features/personal/components.tsx line 374 — pending

```text
      <h2>{t("அட்டையைத் தயார் செய்", "Prepare a card")}</h2>
```

### apps/web/src/features/personal/components.tsx line 377 — pending

```text
          "இது இன்னும் பேசுபவரால் ஒப்புக்கொள்ளப்படவில்லை. படங்களும் சொற்களும் இந்தச் சாதனத்தில் மட்டும் இருக்கும்.",
```

### apps/web/src/features/personal/components.tsx line 382 — pending

```text
        {t("தலைப்பு", "Title")}
```

### apps/web/src/features/personal/components.tsx line 390 — pending

```text
        {t("இந்த அட்டையின் மொழி", "Language of this card")}
```

### apps/web/src/features/personal/components.tsx line 395 — pending

```text
          <option value="ta">தமிழ்</option>
```

### apps/web/src/features/personal/components.tsx line 402 — pending

```text
            {t("பேச வேண்டிய முழு வரி", "Exact words to say")}
```

### apps/web/src/features/personal/components.tsx line 411 — pending

```text
            {t("வகை", "Category")}
```

### apps/web/src/features/personal/components.tsx line 419 — pending

```text
            {t("வேறு பெயர்கள் (விருப்பம்)", "Alternative names (optional)")}
```

### apps/web/src/features/personal/components.tsx line 427 — pending

```text
                "காற்புள்ளியால் பிரிக்கவும். தேட உதவும்; பேசும் வரி மாறாது.",
```

### apps/web/src/features/personal/components.tsx line 433 — pending

```text
            {t("நினைவுக் குறிப்பு (விருப்பம்)", "Description hint (optional)")}
```

### apps/web/src/features/personal/components.tsx line 444 — pending

```text
          {t("ஒவ்வொரு வரியிலும் ஒரு கருத்து", "One short message per line")}
```

### apps/web/src/features/personal/components.tsx line 454 — pending

```text
              "அதிகபட்சம் 12 வரிகள். மருந்து அல்லது நோய் பற்றிய தகவலை ஊகிக்க வேண்டாம்.",
```

### apps/web/src/features/personal/components.tsx line 463 — pending

```text
            📷 {t("படத்தைத் தேர்ந்தெடு", "Choose a photo")}
```

### apps/web/src/features/personal/components.tsx line 487 — pending

```text
              alt={title || t("தேர்ந்தெடுத்த படம்", "Selected photo")}
```

### apps/web/src/features/personal/components.tsx line 492 — pending

```text
              "படத்தில் உள்ளவற்றை நீங்களே பெயரிடுங்கள். தானாக அடையாளம் காணாது.",
```

### apps/web/src/features/personal/components.tsx line 499 — pending

```text
                {t("தேர்வு", "Choice")} {i + 1}
```

### apps/web/src/features/personal/components.tsx line 502 — pending

```text
                {t("குறுகிய பெயர்", "Short label")}
```

### apps/web/src/features/personal/components.tsx line 512 — pending

```text
                {t("பேச வேண்டிய முழு வரி", "Exact words to say")}
```

### apps/web/src/features/personal/components.tsx line 523 — pending

```text
                  {t("இடம்: இடது → வலது", "Position: left → right")}
```

### apps/web/src/features/personal/components.tsx line 535 — pending

```text
                  {t("இடம்: மேல் → கீழ்", "Position: top → bottom")}
```

### apps/web/src/features/personal/components.tsx line 553 — pending

```text
                  {t("இந்தத் தேர்வை நீக்கு", "Remove choice")}
```

### apps/web/src/features/personal/components.tsx line 573 — pending

```text
              ＋ {t("தேர்வு சேர்", "Add a choice")}
```

### apps/web/src/features/personal/components.tsx line 644 — pending

```text
            ? t("சேமிக்கிறது…", "Saving…")
```

### apps/web/src/features/personal/components.tsx line 645 — pending

```text
            : t("பார்த்து ஒப்புக்கொள்ள சேமி", "Save for patient review")}
```

### apps/web/src/features/personal/components.tsx line 648 — pending

```text
          {t("ரத்து செய்", "Cancel")}
```

### apps/web/src/features/personal/components.tsx line 666 — pending

```text
      <h2>{t("நீங்கள் பார்த்து ஒப்புக்கொள்ள", "Ready for your review")}</h2>
```

### apps/web/src/features/personal/components.tsx line 672 — pending

```text
              {t("பார் · இன்னும் சேர்க்கப்படவில்லை", "Review · not added yet")}
```

### apps/web/src/lib/copy.ts line 5 — pending

```text
  "There’s no right spelling. Tamil, English, or a little of both.": "தமிழ், ஆங்கிலம் அல்லது இரண்டையும் கலந்து எழுதலாம்.",
```

### apps/web/src/lib/copy.ts line 6 — pending

```text
  "A family member can record these exact phrases in Voice Studio.": "இந்த வாக்கியங்களுக்கான குரலைக் குடும்பத்தினர் பதிவு செய்யலாம்.",
```

### apps/web/src/lib/copy.ts line 7 — pending

```text
  "Choose Speak, Topics, Camera or Type from Home.": "முகப்பில் பேசு, தலைப்புகள், கேமரா அல்லது எழுது என்பதைத் தேர்ந்தெடு.",
```

### apps/web/src/lib/copy.ts line 8 — pending

```text
  "Choose an exact sentence first.": "முதலில் ஒரு வாக்கியத்தைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 9 — pending

```text
  "After you choose and speak a sentence, you can find it here.": "நீங்கள் தேர்ந்தெடுத்துப் பேசிய வாக்கியங்கள் இங்கே இருக்கும்.",
```

### apps/web/src/lib/copy.ts line 10 — pending

```text
  "Getting your voice ready…": "குரல் தயாராகிறது…", "Speaking…": "பேசுகிறது…", "Said, in your words.": "நீங்கள் தேர்ந்தெடுத்தது பேசப்பட்டது.",
```

### apps/web/src/lib/copy.ts line 11 — pending

```text
  "Stopped.": "நிறுத்தப்பட்டது.", "Waiting for playback": "பேசக் காத்திருக்கிறது", "Device voice": "சாதனக் குரல்", "Your recorded voice": "உங்கள் பதிவுசெய்த குரல்", "Consented family recording": "ஒப்புதலுடன் குடும்பத்தினர் பதிவுசெய்த குரல்", "Help alert tone": "உதவி எச்சரிக்கை ஒலி", "Help alert sounded.": "உதவி ஒலி எழுப்பப்பட்டது.",
```

### apps/web/src/lib/copy.ts line 12 — pending

```text
  "Ready now. Tap the sentence again to speak.": "தயார். பேச வாக்கியத்தை மீண்டும் தொடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 13 — pending

```text
  "A voice for this language isn’t installed. Show this sentence to the person.": "இந்த மொழிக்கான குரல் இல்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
```

### apps/web/src/lib/copy.ts line 14 — pending

```text
  "Couldn’t play audio. Show this sentence to the person.": "ஒலி வரவில்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
```

### apps/web/src/lib/copy.ts line 15 — pending

```text
  "Could not load your voice. Show this sentence to the person.": "குரல் கிடைக்கவில்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
```

### apps/web/src/lib/copy.ts line 16 — pending

```text
  "என்ன சொல்லணும்? Take your time. We’re listening.":
```

### apps/web/src/lib/copy.ts line 17 — pending

```text
    "நிதானமாகத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 18 — pending

```text
  "Is this what you mean?": "இதைத்தான் சொல்ல விரும்புகிறீர்களா?",
```

### apps/web/src/lib/copy.ts line 20 — pending

```text
    "வாக்கியத்தைத் தொட்டால் பேசும். ‘கேள்’ மூலம் முதலில் கேட்டுப் பார்க்கலாம்.",
```

### apps/web/src/lib/copy.ts line 21 — pending

```text
  "Let’s get you some help.": "உதவிக்கு அழைப்போம்.",
```

### apps/web/src/lib/copy.ts line 22 — pending

```text
  "Your chosen words.": "நீங்கள் தேர்ந்தெடுத்த வார்த்தைகள்.",
```

### apps/web/src/lib/copy.ts line 24 — pending

```text
    "உங்களுக்குத் தேவையான வாக்கியங்கள்.",
```

### apps/web/src/lib/copy.ts line 26 — pending

```text
    "நீங்கள் பேசும் நபரைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 28 — pending

```text
    "நீங்கள் பேசியவை இந்தச் சாதனத்தில் உள்ளன.",
```

### apps/web/src/lib/copy.ts line 29 — pending

```text
  "What did they ask?": "அவர்கள் என்ன கேட்டார்கள்?",
```

### apps/web/src/lib/copy.ts line 30 — pending

```text
  "I’m listening.": "கேட்டுக்கொண்டிருக்கிறேன்.",
```

### apps/web/src/lib/copy.ts line 31 — pending

```text
  "Let’s hear your words.": "உங்கள் வார்த்தைகளைச் சொல்லுங்கள்.",
```

### apps/web/src/lib/copy.ts line 33 — pending

```text
    "அவர்களின் கேள்வியைச் சொல்லுங்கள். ஐந்து நிமிடங்கள் இங்கே இருக்கும்.",
```

### apps/web/src/lib/copy.ts line 35 — pending

```text
    "நிதானமாகப் பேசுங்கள். இடையில் நிறுத்தலாம்.",
```

### apps/web/src/lib/copy.ts line 36 — pending

```text
  "Picture board": "சொல் பலகை",
```

### apps/web/src/lib/copy.ts line 38 — pending

```text
    "சொற்களைத் தேர்ந்தெடுங்கள். பிறகு வாக்கியத்தைத் தொட்டுப் பேசுங்கள்.",
```

### apps/web/src/lib/copy.ts line 40 — pending

```text
    "பழக்கமான பொருளைக் காட்டுங்கள்.",
```

### apps/web/src/lib/copy.ts line 41 — pending

```text
  "Start with a word": "ஒரு வார்த்தையில் தொடங்கு",
```

### apps/web/src/lib/copy.ts line 42 — pending

```text
  "Your voice is ready when you are": "முதலில் வாக்கியத்தைத் தேர்ந்தெடுங்கள்",
```

### apps/web/src/lib/copy.ts line 43 — pending

```text
  "Your words will appear here": "உங்கள் வார்த்தைகள் இங்கே தோன்றும்",
```

### apps/web/src/lib/copy.ts line 44 — pending

```text
  "What would you like to talk about?": "எதைப் பற்றிப் பேச விரும்புகிறீர்கள்?",
```

### apps/web/src/lib/copy.ts line 45 — pending

```text
  "Where does it hurt?": "எங்கே வலிக்கிறது?",
```

### apps/web/src/lib/copy.ts line 46 — pending

```text
  "Which side?": "எந்தப் பக்கம்?",
```

### apps/web/src/lib/copy.ts line 48 — pending

```text
    "நீங்கள் சொல்ல நினைப்பதைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 49 — pending

```text
  "Choose the body part.": "உடல் பகுதியைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 51 — pending

```text
    "உங்கள் இடது அல்லது வலது பக்கத்தைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 52 — pending

```text
  "Pick a picture. We’ll help with the words.": "படத்தைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/lib/copy.ts line 53 — pending

```text
  "Start over": "மீண்டும் தொடங்கு",
```

### apps/web/src/lib/copy.ts line 54 — pending

```text
  "Go back": "திரும்பிச் செல்",
```

### apps/web/src/lib/copy.ts line 55 — pending

```text
  Back: "பின் செல்",
```

### apps/web/src/lib/copy.ts line 56 — pending

```text
  "What would you like to say?": "என்ன சொல்ல விரும்புகிறீர்கள்?",
```

### apps/web/src/lib/copy.ts line 57 — pending

```text
  "Let’s find your words.": "உங்கள் வார்த்தைகளைக் கண்டுபிடிப்போம்.",
```

### apps/web/src/lib/copy.ts line 59 — pending

```text
    "தமிழ் அல்லது ஆங்கிலத்தில் எழுதுங்கள்.",
```

### apps/web/src/lib/copy.ts line 60 — pending

```text
  "Find my words": "வார்த்தைகளைக் காட்டு",
```

### apps/web/src/lib/copy.ts line 61 — pending

```text
  Stop: "நிறுத்து",
```

### apps/web/src/lib/copy.ts line 62 — pending

```text
  Listen: "கேள்",
```

### apps/web/src/lib/copy.ts line 63 — pending

```text
  "Try again": "மீண்டும் முயற்சி",
```

### apps/web/src/lib/copy.ts line 64 — pending

```text
  Continue: "தொடரவும்",
```

### apps/web/src/lib/copy.ts line 65 — pending

```text
  Done: "முடிந்தது",
```

### apps/web/src/lib/copy.ts line 66 — pending

```text
  "My phrases": "என் வாக்கியங்கள்",
```

### apps/web/src/lib/copy.ts line 67 — pending

```text
  "Recent words": "சமீபத்தியவை",
```

### apps/web/src/lib/copy.ts line 68 — pending

```text
  "My space": "முகப்பு",
```

### apps/web/src/lib/copy.ts line 69 — pending

```text
  "My tools": "என் கருவிகள்",
```

### apps/web/src/lib/copy.ts line 70 — pending

```text
  "My words": "என் சொற்கள்",
```

### apps/web/src/lib/copy.ts line 71 — pending

```text
  Topics: "தலைப்புகள்",
```

### apps/web/src/lib/copy.ts line 72 — pending

```text
  Speak: "பேசு",
```

### apps/web/src/lib/copy.ts line 73 — pending

```text
  Type: "எழுது",
```

### apps/web/src/lib/copy.ts line 74 — pending

```text
  Camera: "கேமரா",
```

### apps/web/src/lib/copy.ts line 75 — pending

```text
  "They asked…": "அவர்கள் கேட்டது…",
```

### apps/web/src/lib/copy.ts line 76 — pending

```text
  "A word is a good place to start": "ஒரு வார்த்தையில் தொடங்கலாம்",
```

### apps/web/src/lib/copy.ts line 77 — pending

```text
  "Find what’s on your mind": "ஒரு தலைப்பைத் தேர்ந்தெடு",
```

### apps/web/src/lib/copy.ts line 78 — pending

```text
  "Show us what you mean": "ஒரு பொருளைக் காட்டு",
```

### apps/web/src/lib/copy.ts line 79 — pending

```text
  "A few letters are enough": "சில எழுத்துகள் போதும்",
```

### apps/web/src/lib/copy.ts line 80 — pending

```text
  "Your words. At your pace.": "உங்கள் வார்த்தைகள். உங்கள் நேரத்தில்.",
```

### apps/web/src/lib/copy.ts line 81 — pending

```text
  "Which one feels right?": "எதைச் சொல்ல விரும்புகிறீர்கள்?",
```

### apps/web/src/lib/copy.ts line 82 — pending

```text
  "Who are you talking to?": "யாரிடம் பேசுகிறீர்கள்?",
```

### apps/web/src/lib/copy.ts line 83 — pending

```text
  "What’s on your mind?": "எதைப் பற்றிப் பேச வேண்டும்?",
```

### apps/web/src/lib/copy.ts line 84 — pending

```text
  "Take your time.": "நிதானமாகச் சொல்லுங்கள்.",
```

### apps/web/src/lib/copy.ts line 85 — pending

```text
  "No words yet": "இன்னும் வார்த்தைகள் இல்லை",
```

### apps/web/src/lib/copy.ts line 86 — pending

```text
  "Nothing here yet": "இன்னும் எதுவும் இல்லை",
```

### apps/web/src/lib/copy.ts line 87 — pending

```text
  "Say it again": "மீண்டும் சொல்",
```

### apps/web/src/lib/copy.ts line 88 — pending

```text
  "Say something else": "வேறு ஏதாவது சொல்",
```

### apps/web/src/lib/copy.ts line 89 — pending

```text
  "Choose a topic": "தலைப்பைத் தேர்ந்தெடு",
```

### apps/web/src/lib/copy.ts line 90 — pending

```text
  "Choose this": "இதைத் தேர்ந்தெடு",
```

### apps/web/src/lib/copy.ts line 91 — pending

```text
  Next: "அடுத்து",
```

### apps/web/src/lib/copy.ts line 92 — pending

```text
  Previous: "முந்தையது",
```

### apps/web/src/lib/copy.ts line 93 — pending

```text
  Cancel: "ரத்து செய்",
```

### apps/web/src/lib/copy.ts line 94 — pending

```text
  "Save phrase": "வாக்கியத்தைச் சேமி",
```

### apps/web/src/lib/copy.ts line 95 — pending

```text
  "I need more time": "எனக்கு இன்னும் நேரம் வேண்டும்",
```

### apps/web/src/lib/copy.ts line 96 — pending

```text
  Clear: "அழி",
```

### apps/web/src/lib/copy.ts line 97 — pending

```text
  Undo: "முந்தையதை நீக்கு",
```

### apps/web/src/pages/Camera.tsx line 284 — pending

```text
        title={settings.lang === "ta" ? "கேமரா · Camera" : "Camera"}
```

### apps/web/src/pages/Camera.tsx line 336 — pending

```text
                      "கேமரா திறக்கிறது…",
```

### apps/web/src/pages/Camera.tsx line 341 — pending

```text
                      "படம் எடு அல்லது தேர்ந்தெடு",
```

### apps/web/src/pages/Camera.tsx line 358 — pending

```text
              <span>{copy(settings.lang, "Take photo", "படம் எடு")}</span>
```

### apps/web/src/pages/Camera.tsx line 371 — pending

```text
                  ? copy(settings.lang, "Take another photo", "வேறு படம் எடு")
```

### apps/web/src/pages/Camera.tsx line 372 — pending

```text
                  : copy(settings.lang, "Open camera", "கேமராவைத் திற")}
```

### apps/web/src/pages/Camera.tsx line 382 — pending

```text
              {copy(settings.lang, "Choose a photo", "படத்தைத் தேர்ந்தெடு")}
```

### apps/web/src/pages/Camera.tsx line 419 — pending

```text
                  "இந்தப் பொருளுக்கான வார்த்தைகளைக் காட்டு",
```

### apps/web/src/pages/Camera.tsx line 446 — pending

```text
              {copy(settings.lang, "Use Topics", "தலைப்புகளைக் காட்டு")}
```

### apps/web/src/pages/Camera.tsx line 455 — pending

```text
                "மாதிரி: தண்ணீர் பாட்டில்",
```

### apps/web/src/pages/Communication.tsx line 38 — pending

```text
      aria-label={copy(settings.lang, "Communication support", "பேச உதவி")}
```

### apps/web/src/pages/Communication.tsx line 63 — pending

```text
        ↩ {copy(settings.lang, "Fix", "திருத்து")}
```

### apps/web/src/pages/Communication.tsx line 66 — pending

```text
        Ⅱ {copy(settings.lang, "Pause", "இடைவேளை")}
```

### apps/web/src/pages/Communication.tsx line 69 — pending

```text
        ■ {copy(settings.lang, "Stop", "நிறுத்து")}
```

### apps/web/src/pages/Communication.tsx line 97 — pending

```text
          "பேச அதே வாக்கியத்தை மீண்டும் தொடுங்கள்.",
```

### apps/web/src/pages/Communication.tsx line 112 — pending

```text
      <h1>{copy(settings.lang, "Take your time.", "நிதானமாக இருங்கள்.")}</h1>
```

### apps/web/src/pages/Communication.tsx line 117 — pending

```text
          "உங்கள் வார்த்தைகள் இங்கே உள்ளன. நீங்கள் தேர்ந்தெடுத்தால் மட்டுமே பேசும்.",
```

### apps/web/src/pages/Communication.tsx line 124 — pending

```text
        {copy(settings.lang, "Continue my message", "என் செய்தியைத் தொடரவும்")}
```

### apps/web/src/pages/Communication.tsx line 133 — pending

```text
        {copy(settings.lang, "Start a new message", "புதிய செய்தியைத் தொடங்கு")}
```

### apps/web/src/pages/Communication.tsx line 157 — pending

```text
    ["Please give me time.", "எனக்குக் கொஞ்சம் நேரம் கொடுங்கள்."],
```

### apps/web/src/pages/Communication.tsx line 158 — pending

```text
    ["That is not what I mean.", "நான் சொல்ல நினைப்பது அது இல்லை."],
```

### apps/web/src/pages/Communication.tsx line 159 — pending

```text
    ["Please ask one question at a time.", "ஒவ்வொரு கேள்வியாகக் கேளுங்கள்."],
```

### apps/web/src/pages/Communication.tsx line 160 — pending

```text
    ["Please write the main words.", "முக்கிய வார்த்தைகளை எழுதுங்கள்."],
```

### apps/web/src/pages/Communication.tsx line 169 — pending

```text
          "சரியான பொருளைத் தெரிவிப்போம்.",
```

### apps/web/src/pages/Communication.tsx line 192 — pending

```text
        <h2>{copy(l, "Change one part", "ஒரு பகுதியை மாற்று")}</h2>
```

### apps/web/src/pages/Communication.tsx line 195 — pending

```text
            ["Person", "நபர்"],
```

### apps/web/src/pages/Communication.tsx line 196 — pending

```text
            ["Thing", "பொருள்"],
```

### apps/web/src/pages/Communication.tsx line 197 — pending

```text
            ["Place", "இடம்"],
```

### apps/web/src/pages/Communication.tsx line 198 — pending

```text
            ["Time", "நேரம்"],
```

### apps/web/src/pages/Communication.tsx line 199 — pending

```text
            ["Yes / no", "ஆம் / இல்லை"],
```

### apps/web/src/pages/Communication.tsx line 216 — pending

```text
            "உங்கள் முழுச் செய்தி",
```

### apps/web/src/pages/Communication.tsx line 234 — pending

```text
          {copy(l, "Show new choices", "புதிய வாக்கியங்களைக் காட்டு")}
```

### apps/web/src/pages/Communication.tsx line 238 — pending

```text
        <h2>{copy(l, "Check together", "சேர்ந்து உறுதிசெய்")}</h2>
```

### apps/web/src/pages/Communication.tsx line 243 — pending

```text
            "அவர்கள் புரிந்துகொண்டதைச் சொல்லச் சொல்லுங்கள். பிறகு தேர்ந்தெடுங்கள்.",
```

### apps/web/src/pages/Communication.tsx line 250 — pending

```text
            "அவர்கள் புரிந்துகொண்டது… (விருப்பம்)",
```

### apps/web/src/pages/Communication.tsx line 265 — pending

```text
                "ஆம், புரிந்துகொண்டார்கள்",
```

### apps/web/src/pages/Communication.tsx line 267 — pending

```text
              ["needs_repair", "No, try again", "இல்லை, மீண்டும் முயற்சி"],
```

### apps/web/src/pages/Communication.tsx line 271 — pending

```text
                "பதில் சொல்ல விரும்பவில்லை",
```

### apps/web/src/pages/Communication.tsx line 284 — pending

```text
                    "உங்கள் தேர்வு சேமிக்கப்பட்டது.",
```

### apps/web/src/pages/Communication.tsx line 296 — pending

```text
        <h2>{copy(l, "One question at a time", "ஒவ்வொரு கேள்வியாக")}</h2>
```

### apps/web/src/pages/Communication.tsx line 299 — pending

```text
          {copy(l, "Partner’s question", "மற்றவரின் கேள்வி")}
```

### apps/web/src/pages/Communication.tsx line 314 — pending

```text
          {copy(l, "Keep this question visible", "இந்தக் கேள்வியைக் காட்டு")}
```

### apps/web/src/pages/Communication.tsx line 325 — pending

```text
    ["I need a break.", "எனக்கு ஓய்வு வேண்டும்.", "☕"],
```

### apps/web/src/pages/Communication.tsx line 326 — pending

```text
    ["It is too noisy.", "சத்தம் அதிகமாக இருக்கிறது.", "🔇"],
```

### apps/web/src/pages/Communication.tsx line 327 — pending

```text
    ["Please turn the light down.", "வெளிச்சத்தைக் குறையுங்கள்.", "💡"],
```

### apps/web/src/pages/Communication.tsx line 328 — pending

```text
    ["Please sit near me.", "என் அருகில் உட்காருங்கள்.", "🪑"],
```

### apps/web/src/pages/Communication.tsx line 329 — pending

```text
    ["I feel worried.", "எனக்குக் கவலையாக இருக்கிறது.", "💭"],
```

### apps/web/src/pages/Communication.tsx line 330 — pending

```text
    ["I feel happy.", "நான் மகிழ்ச்சியாக இருக்கிறேன்.", "🙂"],
```

### apps/web/src/pages/Communication.tsx line 331 — pending

```text
    ["I want some privacy.", "எனக்குத் தனிமை வேண்டும்.", "🚪"],
```

### apps/web/src/pages/Communication.tsx line 334 — pending

```text
      "நான் உட்காரும் அல்லது படுக்கும் நிலையை மாற்ற வேண்டும்.",
```

### apps/web/src/pages/Communication.tsx line 341 — pending

```text
      <PageTitle title={copy(l, "How do you feel?", "எப்படி உணர்கிறீர்கள்?")} />
```

### apps/web/src/pages/Communication.tsx line 359 — pending

```text
        {copy(l, "Take a quiet break", "அமைதியாக ஓய்வெடு")}
```

### apps/web/src/pages/Communication.tsx line 372 — pending

```text
    ["water", "தண்ணீர்", "💧"],
```

### apps/web/src/pages/Communication.tsx line 373 — pending

```text
    ["food", "உணவு", "🍽"],
```

### apps/web/src/pages/Communication.tsx line 374 — pending

```text
    ["tea", "தேநீர்", "☕"],
```

### apps/web/src/pages/Communication.tsx line 375 — pending

```text
    ["rest", "ஓய்வு", "🛏"],
```

### apps/web/src/pages/Communication.tsx line 376 — pending

```text
    ["help", "உதவி", "✋"],
```

### apps/web/src/pages/Communication.tsx line 377 — pending

```text
    ["company", "துணை", "👥"],
```

### apps/web/src/pages/Communication.tsx line 382 — pending

```text
    ? copy(l, en, `எனக்கு ${item[1]} ${negative ? "வேண்டாம்" : "வேண்டும்"}.`)
```

### apps/web/src/pages/Communication.tsx line 388 — pending

```text
        title={copy(l, "Build my sentence", "என் வாக்கியத்தை உருவாக்கு")}
```

### apps/web/src/pages/Communication.tsx line 390 — pending

```text
      <h2>{copy(l, "Choose a meaning", "பொருளைத் தேர்ந்தெடு")}</h2>
```

### apps/web/src/pages/Communication.tsx line 404 — pending

```text
              no ? "எனக்கு வேண்டாம்" : "எனக்கு வேண்டும்",
```

### apps/web/src/pages/Communication.tsx line 409 — pending

```text
      <h2>{copy(l, "Choose a word", "சொல்லைத் தேர்ந்தெடு")}</h2>
```

### apps/web/src/pages/Communication.tsx line 489 — pending

```text
                      "ஆம், இதைத்தான் சொல்கிறேன்",
```

### apps/web/src/pages/Communication.tsx line 562 — pending

```text
              "ஆம், இதைத்தான் சொல்கிறேன்",
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

### apps/web/src/pages/Patient.tsx line 62 — pending

```text
        subtitle="என்ன சொல்லணும்? Take your time. We’re listening."
```

### apps/web/src/pages/Patient.tsx line 87 — pending

```text
              {copy(settings.lang, "I’m talking to", "நான் பேசுவது")}
```

### apps/web/src/pages/Patient.tsx line 108 — pending

```text
          tamil="பேசு"
```

### apps/web/src/pages/Patient.tsx line 116 — pending

```text
          tamil="வகைகள்"
```

### apps/web/src/pages/Patient.tsx line 124 — pending

```text
          tamil="கேமரா"
```

### apps/web/src/pages/Patient.tsx line 132 — pending

```text
          tamil="எழுது"
```

### apps/web/src/pages/Patient.tsx line 142 — pending

```text
            "நீங்கள் தேர்ந்தெடுத்து தொட்டால் மட்டுமே பேசும்.",
```

### apps/web/src/pages/Patient.tsx line 170 — pending

```text
          {copy(settings.lang, "ALWAYS WITH YOU", "எப்போதும் உங்களுடன்")}
```

### apps/web/src/pages/Patient.tsx line 173 — pending

```text
          {copy(settings.lang, "One tap to say it", "தொட்டால் பேசும்")}
```

### apps/web/src/pages/Patient.tsx line 237 — pending

```text
          Your words · உங்க வார்த்தைகள்
```

### apps/web/src/pages/Patient.tsx line 324 — pending

```text
              { id: "idli", icon: "🍚", ta: "இட்லி", en: "Idli" },
```

### apps/web/src/pages/Patient.tsx line 325 — pending

```text
              { id: "dosa", icon: "🥞", ta: "தோசை", en: "Dosa" },
```

### apps/web/src/pages/Patient.tsx line 326 — pending

```text
              { id: "rasam", icon: "🍲", ta: "ரசம்", en: "Rasam" },
```

### apps/web/src/pages/Patient.tsx line 327 — pending

```text
              { id: "rice", icon: "🍚", ta: "சாதம்", en: "Rice" },
```

### apps/web/src/pages/Patient.tsx line 331 — pending

```text
                { id: "water", icon: "💧", ta: "தண்ணி", en: "Water" },
```

### apps/web/src/pages/Patient.tsx line 332 — pending

```text
                { id: "coffee", icon: "☕", ta: "காபி", en: "Coffee" },
```

### apps/web/src/pages/Patient.tsx line 333 — pending

```text
                { id: "tea", icon: "🍵", ta: "டீ", en: "Tea" },
```

### apps/web/src/pages/Patient.tsx line 334 — pending

```text
                { id: "milk", icon: "🥛", ta: "பால்", en: "Milk" },
```

### apps/web/src/pages/Patient.tsx line 371 — pending

```text
                    `${selected.ta} பற்றிப் பேசுவோம்`,
```

### apps/web/src/pages/Patient.tsx line 394 — pending

```text
            part ? "உடல் பகுதிகளுக்குத் திரும்பு" : "தலைப்புகளுக்குத் திரும்பு",
```

### apps/web/src/pages/Patient.tsx line 413 — pending

```text
                  side === "left" ? "இடது" : "வலது",
```

### apps/web/src/pages/Patient.tsx line 417 — pending

```text
                <span lang="ta">{side === "left" ? "இடது" : "வலது"}</span>
```

### apps/web/src/pages/Patient.tsx line 453 — pending

```text
                {copy(settings.lang, "More topics", "மேலும் தலைப்புகள்")}
```

### apps/web/src/pages/Patient.tsx line 525 — pending

```text
          {context.outputLang === "ta" ? "தமிழ் → English" : "English → தமிழ்"}
```

### apps/web/src/pages/Patient.tsx line 550 — pending

```text
                "வாக்கியங்களைத் தேடுகிறோம்…",
```

### apps/web/src/pages/Patient.tsx line 575 — pending

```text
                        "நீங்கள் ஒப்புக்கொண்ட வாக்கியம்",
```

### apps/web/src/pages/Patient.tsx line 631 — pending

```text
            {copy(settings.lang, "None of these", "இவற்றில் எதுவும் இல்லை")}
```

### apps/web/src/pages/Patient.tsx line 640 — pending

```text
          `${context.round} / 3 · மீண்டும் தொடங்கலாம்`,
```

### apps/web/src/pages/Patient.tsx line 711 — pending

```text
            "என் செய்திக்குத் திரும்பு",
```

### apps/web/src/pages/Patient.tsx line 727 — pending

```text
          {copy(settings.lang, "Say again", "மீண்டும் சொல்")}
```

### apps/web/src/pages/Patient.tsx line 744 — pending

```text
            {copy(settings.lang, "Send SMS", "குறுஞ்செய்தி அனுப்பு")}
```

### apps/web/src/pages/Patient.tsx line 755 — pending

```text
            {copy(settings.lang, "It was a mistake", "தவறுதலாகத் தொட்டேன்")}
```

### apps/web/src/pages/Patient.tsx line 761 — pending

```text
              "சொல்லு அவசர சேவை அல்ல. அவசர உதவிக்கு 112 அழைக்கவும்.",
```

### apps/web/src/pages/Patient.tsx line 777 — pending

```text
                "புரிந்ததா என்று உறுதிசெய்",
```

### apps/web/src/pages/Patient.tsx line 786 — pending

```text
              {copy(settings.lang, "Change my message", "என் செய்தியை மாற்று")}
```

### apps/web/src/pages/Patient.tsx line 883 — pending

```text
              {c.relation} · {c.lang === "en" ? "English" : "தமிழ்"}
```

### apps/web/src/pages/Patient.tsx line 1112 — pending

```text
        <p>{heard || "உங்க குரல் · Your voice"}</p>
```

### apps/web/src/pages/Patient.tsx line 1126 — pending

```text
          {copy(settings.lang, "Keep listening", "தொடர்ந்து கேள்")}
```

### apps/web/src/pages/Patient.tsx line 1147 — pending

```text
          {copy(settings.lang, "Type instead", "எழுதுகிறேன்")}
```

### apps/web/src/pages/Patient.tsx line 1155 — pending

```text
            ? ["மதியம் என்ன சாப்பிடணும்?"]
```

### apps/web/src/pages/Patient.tsx line 1156 — pending

```text
            : ["tablet… raathiri", "தண்ணி", "table"]
```

### apps/web/src/pages/Patient.tsx line 1185 — pending

```text
    ["I", "🙋", "எனக்கு"],
```

### apps/web/src/pages/Patient.tsx line 1186 — pending

```text
    ["want", "🤲", "வேண்டும்"],
```

### apps/web/src/pages/Patient.tsx line 1187 — pending

```text
    ["need", "🙏", "தேவை"],
```

### apps/web/src/pages/Patient.tsx line 1188 — pending

```text
    ["go", "🚶", "போக"],
```

### apps/web/src/pages/Patient.tsx line 1189 — pending

```text
    ["eat", "🍽️", "சாப்பிட"],
```

### apps/web/src/pages/Patient.tsx line 1190 — pending

```text
    ["drink", "🥤", "குடிக்க"],
```

### apps/web/src/pages/Patient.tsx line 1191 — pending

```text
    ["water", "💧", "தண்ணீர்"],
```

### apps/web/src/pages/Patient.tsx line 1192 — pending

```text
    ["tablet", "💊", "மாத்திரை"],
```

### apps/web/src/pages/Patient.tsx line 1193 — pending

```text
    ["toilet", "🚻", "கழிப்பறை"],
```

### apps/web/src/pages/Patient.tsx line 1194 — pending

```text
    ["pain", "🤕", "வலி"],
```

### apps/web/src/pages/Patient.tsx line 1195 — pending

```text
    ["help", "🆘", "உதவி"],
```

### apps/web/src/pages/Patient.tsx line 1196 — pending

```text
    ["yes", "👍", "ஆம்"],
```

### apps/web/src/pages/Patient.tsx line 1197 — pending

```text
    ["no", "✋", "இல்லை"],
```

### apps/web/src/pages/Patient.tsx line 1198 — pending

```text
    ["more", "➕", "இன்னும்"],
```

### apps/web/src/pages/Patient.tsx line 1199 — pending

```text
    ["please", "🤝", "தயவுசெய்து"],
```

### apps/web/src/pages/Patient.tsx line 1200 — pending

```text
    ["night", "🌙", "இரவு"],
```

### apps/web/src/pages/Patient.tsx line 1262 — pending

```text
                    "இந்த மொழிக்கான குரல் நிறுவப்படவில்லை.",
```

### apps/web/src/pages/Patient.tsx line 1276 — pending

```text
          "தேர்ந்தெடுத்த மொழியில் சொற்கள். ஒரே செய்திகளை ஒப்பிடுங்கள்.",
```

### apps/web/src/pages/Settings.tsx line 205 — pending

```text
              <option value="ta">தமிழ் · Tamil</option>
```

### apps/web/src/pages/Settings.tsx line 781 — pending

```text
              <option value="ta">தமிழ் · Tamil</option>
```

### apps/web/src/pages/Support.tsx line 45 — pending

```text
  core: ["அடிப்படைச் சொற்கள்", "Core words"],
```

### apps/web/src/pages/Support.tsx line 46 — pending

```text
  actions: ["செயல்கள்", "Actions"],
```

### apps/web/src/pages/Support.tsx line 47 — pending

```text
  questions: ["கேள்விகள்", "Questions"],
```

### apps/web/src/pages/Support.tsx line 48 — pending

```text
  negation: ["மறுப்பு", "No and not"],
```

### apps/web/src/pages/Support.tsx line 49 — pending

```text
  social: ["உரையாடல்", "Conversation"],
```

### apps/web/src/pages/Support.tsx line 50 — pending

```text
  feelings: ["உணர்வுகள்", "Feelings"],
```

### apps/web/src/pages/Support.tsx line 51 — pending

```text
  daily: ["தினசரி தேவைகள்", "Daily needs"],
```

### apps/web/src/pages/Support.tsx line 52 — pending

```text
  health: ["உடல்நலம்", "Health"],
```

### apps/web/src/pages/Support.tsx line 53 — pending

```text
  identity: ["என்னைப் பற்றி", "About me"],
```

### apps/web/src/pages/Support.tsx line 54 — pending

```text
  repair: ["புரிய வைக்க", "Help me explain"],
```

### apps/web/src/pages/Support.tsx line 64 — pending

```text
      "நான் சொன்னது வேறு",
```

### apps/web/src/pages/Support.tsx line 66 — pending

```text
      "சரியான அர்த்தத்தை மீண்டும் தேர்ந்தெடு",
```

### apps/web/src/pages/Support.tsx line 72 — pending

```text
      "உடல் மற்றும் ஓய்வு",
```

### apps/web/src/pages/Support.tsx line 74 — pending

```text
      "உங்களுக்கு என்ன வேண்டும்?",
```

### apps/web/src/pages/Support.tsx line 80 — pending

```text
      "வரியை அமை",
```

### apps/web/src/pages/Support.tsx line 82 — pending

```text
      "உங்கள் கருத்தை படிப்படியாகத் தேர்ந்தெடு",
```

### apps/web/src/pages/Support.tsx line 88 — pending

```text
      "சொற்கள்",
```

### apps/web/src/pages/Support.tsx line 90 — pending

```text
      "சொல்ல விரும்புவதைத் தேர்ந்தெடு",
```

### apps/web/src/pages/Support.tsx line 96 — pending

```text
      "என் படங்கள்",
```

### apps/web/src/pages/Support.tsx line 98 — pending

```text
      "உங்கள் இடங்கள், உங்கள் சொற்கள்",
```

### apps/web/src/pages/Support.tsx line 104 — pending

```text
      "என் உரையாடல்கள்",
```

### apps/web/src/pages/Support.tsx line 106 — pending

```text
      "முன்பே தயார் செய்த வரிகள்",
```

### apps/web/src/pages/Support.tsx line 112 — pending

```text
      "என்னைப் பற்றி",
```

### apps/web/src/pages/Support.tsx line 114 — pending

```text
      "எப்படி உதவலாம் என்று காட்டுங்கள்",
```

### apps/web/src/pages/Support.tsx line 120 — pending

```text
      "வரைந்து காட்டு",
```

### apps/web/src/pages/Support.tsx line 122 — pending

```text
      "பேச வேறு ஒரு வழி",
```

### apps/web/src/pages/Support.tsx line 129 — pending

```text
        ← {t("முகப்பு", "Home")}
```

### apps/web/src/pages/Support.tsx line 132 — pending

```text
        title={t("உங்களுக்கு உதவும் கருவிகள்", "Your communication tools")}
```

### apps/web/src/pages/Support.tsx line 134 — pending

```text
          "உங்களுக்குப் பொருத்தமான வழியைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/pages/Support.tsx line 151 — pending

```text
          "படங்களும் தனிப்பட்ட அட்டைகளும் இந்தச் சாதனத்தில் மட்டும் இருக்கும். எந்த வரியும் தானாகப் பேசாது.",
```

### apps/web/src/pages/Support.tsx line 214 — pending

```text
      title={t("சொல்ல ஒரு சொல்", "Find a word")}
```

### apps/web/src/pages/Support.tsx line 216 — pending

```text
        "தேர்ந்தெடுத்து முழு வரியைப் பாருங்கள்.",
```

### apps/web/src/pages/Support.tsx line 238 — pending

```text
              {t("பொதுச் சொற்கள்", "Everyday words")}
```

### apps/web/src/pages/Support.tsx line 246 — pending

```text
              {t("என் சொற்கள்", "My words")}
```

### apps/web/src/pages/Support.tsx line 250 — pending

```text
            {t("தேடு", "Search")}
```

### apps/web/src/pages/Support.tsx line 259 — pending

```text
                "சொல் அல்லது முதல் எழுத்து",
```

### apps/web/src/pages/Support.tsx line 267 — pending

```text
              {t("வகை", "Category")}
```

### apps/web/src/pages/Support.tsx line 274 — pending

```text
                <option value="">{t("அனைத்தும்", "All")}</option>
```

### apps/web/src/pages/Support.tsx line 292 — pending

```text
                {t("வேறு சொல்", "Another word")}
```

### apps/web/src/pages/Support.tsx line 322 — pending

```text
                    ← {t("முந்தைய சொற்கள்", "Previous words")}
```

### apps/web/src/pages/Support.tsx line 335 — pending

```text
                    {t("மேலும் சொற்கள்", "More words")} →
```

### apps/web/src/pages/Support.tsx line 342 — pending

```text
                    "இந்தச் சொல் இல்லை. உங்கள் சொற்களில் சேர்க்கலாம்.",
```

### apps/web/src/pages/Support.tsx line 364 — pending

```text
                    "இன்னும் சொற்கள் இல்லை. சேர்த்த பின் நீங்கள் ஒப்புக்கொள்ளலாம்.",
```

### apps/web/src/pages/Support.tsx line 372 — pending

```text
                  <h2>{t("மறைத்த சொற்கள்", "Hidden words")}</h2>
```

### apps/web/src/pages/Support.tsx line 375 — pending

```text
                      "இந்தச் சாதனத்தில் உள்ளன; பேசத் தேர்ந்தெடுக்கும் பட்டியலில் இல்லை.",
```

### apps/web/src/pages/Support.tsx line 393 — pending

```text
                label={t("என் சொல் சேர்", "Add my word")}
```

### apps/web/src/pages/Support.tsx line 421 — pending

```text
      title={t("என் படங்கள்", "My photos")}
```

### apps/web/src/pages/Support.tsx line 423 — pending

```text
        "ஒரு படத்திலிருந்து உங்கள் சொற்களைத் தேர்ந்தெடுங்கள்.",
```

### apps/web/src/pages/Support.tsx line 443 — pending

```text
            {t("எல்லாப் படங்களும்", "All photos")}
```

### apps/web/src/pages/Support.tsx line 462 — pending

```text
              "படத்தில் உள்ள எண்ணை அல்லது கீழே உள்ள சொல்லைத் தொடுங்கள்.",
```

### apps/web/src/pages/Support.tsx line 506 — pending

```text
                "உங்களுக்கு நன்கு தெரிந்த இடம் அல்லது பொருளின் படத்தைச் சேர்க்கலாம்.",
```

### apps/web/src/pages/Support.tsx line 513 — pending

```text
            label={t("படம் சேர்", "Add a photo")}
```

### apps/web/src/pages/Support.tsx line 546 — pending

```text
          ? t("என் தொடர்பு அட்டை", "My communication card")
```

### apps/web/src/pages/Support.tsx line 547 — pending

```text
          : t("என் உரையாடல்கள்", "My conversations")
```

### apps/web/src/pages/Support.tsx line 552 — pending

```text
              "எப்படி உதவலாம் என்று மற்றவர்களுக்குக் காட்டுங்கள்.",
```

### apps/web/src/pages/Support.tsx line 556 — pending

```text
              "உங்கள் சொற்கள். ஒவ்வொரு வரியாக, உங்கள் நேரத்தில்.",
```

### apps/web/src/pages/Support.tsx line 575 — pending

```text
            {t("எல்லா அட்டைகளும்", "All cards")}
```

### apps/web/src/pages/Support.tsx line 607 — pending

```text
                    ← {t("முந்தைய வரி", "Previous")}
```

### apps/web/src/pages/Support.tsx line 619 — pending

```text
                    {t("அடுத்த வரி", "Next")} →
```

### apps/web/src/pages/Support.tsx line 630 — pending

```text
                ? t("ஒரு வரியாகப் பேசு", "One message at a time")
```

### apps/web/src/pages/Support.tsx line 631 — pending

```text
                : t("எல்லா வரிகளையும் காட்டு", "Show every line")}
```

### apps/web/src/pages/Support.tsx line 639 — pending

```text
              {t("அச்சிடு / PDF", "Print / save PDF")}
```

### apps/web/src/pages/Support.tsx line 675 — pending

```text
                  "உங்களுடன் சேர்ந்து தயார் செய்யலாம்",
```

### apps/web/src/pages/Support.tsx line 682 — pending

```text
                      "நீங்கள் விரும்பும் மொழி, பதில் சொல்ல வேண்டிய நேரம், உதவியாக இருக்கும் முறைகள் ஆகியவற்றை உங்கள் ஒப்புதலுடன் சேர்க்கலாம்.",
```

### apps/web/src/pages/Support.tsx line 686 — pending

```text
                      "கடை, குடும்பச் சந்திப்பு, அல்லது ஒரு நினைவு பற்றி நீங்கள் சொல்ல விரும்பும் வரிகளைச் சேர்க்கலாம்.",
```

### apps/web/src/pages/Support.tsx line 694 — pending

```text
            label={t("அட்டை சேர்", "Add a card")}
```

### apps/web/src/pages/Support.tsx line 746 — pending

```text
      title={t("வரைந்து அல்லது எழுதிக் காட்டு", "Draw or write")}
```

### apps/web/src/pages/Support.tsx line 748 — pending

```text
        "இது நீங்கள் காட்டுவதற்கான இடம். படம் படிக்கப்படாது, அனுப்பப்படாது.",
```

### apps/web/src/pages/Support.tsx line 755 — pending

```text
            {t("மெல்லிய கோடு", "Thin line")}
```

### apps/web/src/pages/Support.tsx line 758 — pending

```text
            {t("தடிமனான கோடு", "Thick line")}
```

### apps/web/src/pages/Support.tsx line 764 — pending

```text
            {t("கருப்பு", "Black")}
```

### apps/web/src/pages/Support.tsx line 770 — pending

```text
            {t("சிவப்பு", "Red")}
```

### apps/web/src/pages/Support.tsx line 780 — pending

```text
          "வரைவதற்கான இடம். கீழே எழுதியும் காட்டலாம்.",
```

### apps/web/src/pages/Support.tsx line 836 — pending

```text
            ? t("தொடர்ந்து வரை", "Keep drawing")
```

### apps/web/src/pages/Support.tsx line 837 — pending

```text
            : t("இதை மற்றவருக்குக் காட்டு", "Show this to someone")}
```

### apps/web/src/pages/Support.tsx line 848 — pending

```text
              {t("கடைசிக் கோட்டை நீக்கு", "Undo last stroke")}
```

### apps/web/src/pages/Support.tsx line 851 — pending

```text
              {t("அழி", "Clear")}
```

### apps/web/src/pages/Support.tsx line 858 — pending

```text
          <p>{t("இந்தப் படத்தை அழிக்கவா?", "Clear this drawing?")}</p>
```

### apps/web/src/pages/Support.tsx line 867 — pending

```text
              {t("ஆம், அழி", "Yes, clear")}
```

### apps/web/src/pages/Support.tsx line 870 — pending

```text
              {t("வேண்டாம்", "Keep it")}
```

### apps/web/src/pages/Support.tsx line 876 — pending

```text
        {t("அல்லது ஒரு சொல்லை எழுது", "Or type a word")}
```

### apps/web/src/pages/Support.tsx line 891 — pending

```text
        {t("சொற்களில் தேர்ந்தெடு", "Choose from words")}
```

### apps/web/src/pages/Support.tsx line 895 — pending

```text
          "இடைவேளைக்குப் பிறகும் வரைந்தது இருக்கும். பக்கத்தை மீண்டும் ஏற்றினால் அழியும்; சாதனத்தில் கோப்பாகச் சேமிக்கப்படாது.",
```

### apps/web/src/state.tsx line 146 — pending

```text
          ? "உதவி செய்தி 60 வினாடிகள் வரை காத்திருக்கும். இன்னும் சேரவில்லை."
```

### apps/web/src/state.tsx line 147 — pending

```text
          : "செய்தி 5 நிமிடங்கள் வரை காத்திருக்கும். இன்னும் சேரவில்லை.",
```

### apps/web/src/state.tsx line 153 — pending

```text
        `${name} சாதனத்தில் காட்டப்பட்டது ✓`,
```

### apps/web/src/state.tsx line 159 — pending

```text
        "செய்தியின் நேரம் முடிந்தது. தேவைப்பட்டால் வாக்கியத்தை மீண்டும் தொடுங்கள்.",
```

### apps/web/src/state.tsx line 165 — pending

```text
        "காத்திருந்த செய்தி ரத்து செய்யப்பட்டது.",
```

### apps/web/src/state.tsx line 174 — pending

```text
          ? "உதவி செய்தி அனுப்பப்பட்டது. பதிலுக்குக் காத்திருக்கிறது."
```

### apps/web/src/state.tsx line 175 — pending

```text
          : "செய்தி சேர்ந்ததா என்று காத்திருக்கிறது…",
```

### apps/web/src/state.tsx line 180 — pending

```text
      "செய்தி அனுப்பப்படவில்லை. குறுஞ்செய்தி அனுப்பலாம்.",
```

### apps/web/src/state.tsx line 549 — pending

```text
            ? "வேறு வார்த்தை அல்லது தலைப்பைத் தேர்ந்தெடுக்கவும்."
```

### packages/shared/src/candidatePolicy.ts line 20 — pending

```text
  /\b(?:no|not|never|don['’]?t|without|venam|vendam|vendaam|illai)\b|வேணாம்|வேண்டாம்|இல்லை/u.test(
```

### packages/shared/src/candidatePolicy.ts line 25 — pending

```text
  /\b(?:mg|mcg|ml|milligrams?|micrograms?|millilitres?|milliliters?|dosage)\b|மில்லிகிராம்|மி\.கி/iu;
```

### packages/shared/src/candidatePolicy.ts line 120 — pending

```text
  const side = /\bleft\b|இடது|\bidathu\b/.test(evidence)
```

### packages/shared/src/candidatePolicy.ts line 122 — pending

```text
    : /\bright\b|வலது|\bvalathu\b/.test(evidence)
```

### packages/shared/src/candidatePolicy.ts line 189 — pending

```text
      (/\bright\b|வலது/.test(c.text)
```

### packages/shared/src/candidatePolicy.ts line 191 — pending

```text
        : /\bleft\b|இடது/.test(c.text)
```

### packages/shared/src/candidatePolicy.ts line 245 — pending

```text
        ? "வேற வார்த்தையில சொல்ல முடியுமா?"
```

### packages/shared/src/mock.ts line 25 — pending

```text
  /\b(?:no|not|never|don['’]?t|without|venam|vendam|vendaam|illai)\b|வேணாம்|வேண்டாம்|இல்லை/u.test(
```

### packages/shared/src/mock.ts line 74 — pending

```text
    !/\b(?:phone|call|ph|school)\b|ஃபோன்|போன்|பேச|ஸ்கூல்/.test(raw)
```

### packages/shared/src/mock.ts line 84 — pending

```text
  if (/\bschool\b|ஸ்கூல்/.test(raw))
```

### packages/shared/src/mock.ts line 89 — pending

```text
        `${ta} ஸ்கூல்ல இருந்து வந்தாச்சா?`,
```

### packages/shared/src/mock.ts line 100 — pending

```text
        `${ta}கிட்ட பேசணும்.`,
```

### packages/shared/src/mock.ts line 111 — pending

```text
        `${ta}யை கூட்டிட்டு வாங்க.`,
```

### packages/shared/src/mock.ts line 124 — pending

```text
      `${ta}கிட்ட ஃபோன்ல பேசணும்.`,
```

### packages/shared/src/mock.ts line 135 — pending

```text
      `${ta} ஃபோன் பண்ணாங்களா?`,
```

### packages/shared/src/mock.ts line 146 — pending

```text
      `${ta}யை எனக்கு ஃபோன் பண்ண சொல்லுங்க.`,
```

### packages/shared/src/mock.ts line 192 — pending

```text
  if ((path[0] === "pain" || /pain|hurts|வலி|நெஞ்சு/.test(raw)) && part) {
```

### packages/shared/src/mock.ts line 194 — pending

```text
    const left = path.includes("left") || /\bleft\b|இடது|\bidathu\b/.test(raw);
```

### packages/shared/src/mock.ts line 196 — pending

```text
      path.includes("right") || /\bright\b|வலது|\bvalathu\b/.test(raw);
```

### packages/shared/src/mock.ts line 207 — pending

```text
      /\b(?:tablet|tablets|medicine)\b|மாத்திரை|மருந்து/.test(raw) ||
```

### packages/shared/src/mock.ts line 214 — pending

```text
        /\p{N}|\b(?:dose|dosage|double|triple|mg|mcg|ml|took|taken|already|missed|finished|empty|exhausted|yesterday|tomorrow|ignore|instructions)\b|போட்டாச்சு|தீர்ந்து|மில்லிகிராம்/iu.test(
```

### packages/shared/src/mock.ts line 223 — pending

```text
        /night|raathiri|ராத்திரி|ராத்/.test(raw) ||
```

### packages/shared/src/mock.ts line 236 — pending

```text
          night && !/night|raathiri|ராத்திரி|ராத்/.test(raw)
```

### packages/shared/src/mock.ts line 246 — pending

```text
                ? "ராத்திரி மாத்திரை இப்ப வேணாம்."
```

### packages/shared/src/mock.ts line 247 — pending

```text
                : "மாத்திரை இப்ப வேணாம்.",
```

### packages/shared/src/mock.ts line 261 — pending

```text
                ? "என் ராத்திரி மாத்திரையை எடுத்துட்டு வாங்க."
```

### packages/shared/src/mock.ts line 262 — pending

```text
                : "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 276 — pending

```text
                ? "நான் ராத்திரி மாத்திரை போட்டேனா?"
```

### packages/shared/src/mock.ts line 277 — pending

```text
                : "நான் மாத்திரை போட்டேனா?",
```

### packages/shared/src/mock.ts line 289 — pending

```text
                ? "ராத்திரி மாத்திரை பத்தி கேக்கணும்."
```

### packages/shared/src/mock.ts line 290 — pending

```text
                : "மாத்திரை பத்தி கேக்கணும்.",
```

### packages/shared/src/mock.ts line 307 — pending

```text
                "என் மாத்திரை எங்க? எடுத்து குடுங்க.",
```

### packages/shared/src/mock.ts line 317 — pending

```text
                "டிவி கேபிளை பார்த்து குடுங்க.",
```

### packages/shared/src/mock.ts line 327 — pending

```text
                "டேப்லெட்ல வீடியோ போட்டு குடுங்க.",
```

### packages/shared/src/mock.ts line 339 — pending

```text
                "டேபிள துடைக்கணும்.",
```

### packages/shared/src/mock.ts line 349 — pending

```text
                "டேபிள் இங்க கொண்டு வாங்க.",
```

### packages/shared/src/mock.ts line 359 — pending

```text
                "டேபிள் மேல என்ன இருக்கு?",
```

### packages/shared/src/mock.ts line 367 — pending

```text
    } else if (/\bcable\b|கேபிள்/.test(raw)) {
```

### packages/shared/src/mock.ts line 374 — pending

```text
              "டிவி கேபிளை பார்த்து குடுங்க.",
```

### packages/shared/src/phrases.ts line 35 — pending

```text
      "உதவி வேணும்!",
```

### packages/shared/src/phrases.ts line 42 — pending

```text
    yes: candidate("ஆமா", "Yes", "say yes", "👍"),
```

### packages/shared/src/phrases.ts line 43 — pending

```text
    no: candidate("இல்ல", "No", "say no", "✋"),
```

### packages/shared/src/phrases.ts line 45 — pending

```text
      "கொஞ்சம் இருங்க",
```

### packages/shared/src/phrases.ts line 73 — pending

```text
      "பேச கொஞ்சம் நேரம் குடுங்க.",
```

### packages/shared/src/phrases.ts line 79 — pending

```text
      "ஆமா, இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க.",
```

### packages/shared/src/phrases.ts line 84 — pending

```text
    candidate("நன்றி.", "Thank you.", "say thanks", "🙏"),
```

### packages/shared/src/phrases.ts line 122 — pending

```text
  ta: ["வணக்கம், நான் பேசுறது கேக்குதா?"],
```

### packages/shared/src/phrases.ts line 126 — pending

```text
  { id: "medicine", icon: "💊", ta: "மாத்திரை", en: "Medicine" },
```

### packages/shared/src/phrases.ts line 127 — pending

```text
  { id: "food", icon: "🍛", ta: "சாப்பாடு", en: "Food" },
```

### packages/shared/src/phrases.ts line 128 — pending

```text
  { id: "drink", icon: "🥤", ta: "குடிக்க", en: "Drink" },
```

### packages/shared/src/phrases.ts line 129 — pending

```text
  { id: "toilet", icon: "🚻", ta: "பாத்ரூம்", en: "Toilet" },
```

### packages/shared/src/phrases.ts line 130 — pending

```text
  { id: "pain", icon: "🤕", ta: "வலி", en: "Pain" },
```

### packages/shared/src/phrases.ts line 131 — pending

```text
  { id: "people", icon: "👨‍👩‍👧", ta: "ஆட்கள்", en: "People" },
```

### packages/shared/src/phrases.ts line 132 — pending

```text
  { id: "feelings", icon: "😊", ta: "மனசு", en: "Feelings" },
```

### packages/shared/src/phrases.ts line 133 — pending

```text
  { id: "rest", icon: "🛏️", ta: "ஓய்வு", en: "Rest" },
```

### packages/shared/src/phrases.ts line 134 — pending

```text
  { id: "tv_phone", icon: "📺", ta: "டிவி / ஃபோன்", en: "TV & phone" },
```

### packages/shared/src/phrases.ts line 135 — pending

```text
  { id: "prayer", icon: "🙏", ta: "சாமி", en: "Prayer" },
```

### packages/shared/src/phrases.ts line 136 — pending

```text
  { id: "go_out", icon: "🚶", ta: "வெளியே", en: "Go out" },
```

### packages/shared/src/phrases.ts line 139 — pending

```text
  { id: "head", ta: "தலை", en: "head", paired: false },
```

### packages/shared/src/phrases.ts line 140 — pending

```text
  { id: "mouth", ta: "வாய்", en: "mouth", paired: false },
```

### packages/shared/src/phrases.ts line 141 — pending

```text
  { id: "tooth", ta: "பல்", en: "tooth", paired: false },
```

### packages/shared/src/phrases.ts line 142 — pending

```text
  { id: "throat", ta: "தொண்டை", en: "throat", paired: false },
```

### packages/shared/src/phrases.ts line 143 — pending

```text
  { id: "chest", ta: "நெஞ்சு", en: "chest", paired: false },
```

### packages/shared/src/phrases.ts line 144 — pending

```text
  { id: "stomach", ta: "வயிறு", en: "stomach", paired: false },
```

### packages/shared/src/phrases.ts line 145 — pending

```text
  { id: "back", ta: "முதுகு", en: "back", paired: false },
```

### packages/shared/src/phrases.ts line 146 — pending

```text
  { id: "neck", ta: "கழுத்து", en: "neck", paired: false },
```

### packages/shared/src/phrases.ts line 147 — pending

```text
  { id: "eye", ta: "கண்", en: "eye", paired: true },
```

### packages/shared/src/phrases.ts line 148 — pending

```text
  { id: "ear", ta: "காது", en: "ear", paired: true },
```

### packages/shared/src/phrases.ts line 149 — pending

```text
  { id: "shoulder", ta: "தோள்", en: "shoulder", paired: true },
```

### packages/shared/src/phrases.ts line 150 — pending

```text
  { id: "arm", ta: "கை", en: "arm", paired: true },
```

### packages/shared/src/phrases.ts line 151 — pending

```text
  { id: "hand", ta: "உள்ளங்கை", en: "hand", paired: true },
```

### packages/shared/src/phrases.ts line 152 — pending

```text
  { id: "wrist", ta: "மணிக்கட்டு", en: "wrist", paired: true },
```

### packages/shared/src/phrases.ts line 153 — pending

```text
  { id: "hip", ta: "இடுப்பு", en: "hip", paired: true },
```

### packages/shared/src/phrases.ts line 154 — pending

```text
  { id: "knee", ta: "முட்டி", en: "knee", paired: true },
```

### packages/shared/src/phrases.ts line 155 — pending

```text
  { id: "leg", ta: "கால்", en: "leg", paired: true },
```

### packages/shared/src/phrases.ts line 156 — pending

```text
  { id: "foot", ta: "பாதம்", en: "foot", paired: true },
```

### packages/shared/src/phrases.ts line 157 — pending

```text
  { id: "ankle", ta: "கணுக்கால்", en: "ankle", paired: true },
```

### packages/shared/src/phrases.ts line 173 — pending

```text
          ? "நெஞ்சு வலிக்குது, உடனே உதவி வேணும்."
```

### packages/shared/src/phrases.ts line 183 — pending

```text
  const tamil = [p.paired ? (side === "left" ? "இடது" : "வலது") : "", p.ta]
```

### packages/shared/src/phrases.ts line 189 — pending

```text
        ? `${tamil} கொஞ்சம் வலிக்குது.`
```

### packages/shared/src/phrases.ts line 198 — pending

```text
      lang === "ta" ? `${tamil} ரொம்ப வலிக்குது.` : `My ${name} hurts a lot.`,
```

### packages/shared/src/phrases.ts line 207 — pending

```text
        ? `${tamil} வலி தாங்க முடியல, உடனே உதவி வேணும்.`
```

### packages/shared/src/phrases.ts line 262 — pending

```text
  const ta = [p.paired ? (side === "left" ? "இடது" : "வலது") : "", p.ta]
```

### packages/shared/src/phrases.ts line 268 — pending

```text
      ta: `${ta} வலிக்கு உதவி வேணும்.`,
```

### packages/shared/src/phrases.ts line 274 — pending

```text
      ta: `${ta} வலி பற்றி பேசணும்.`,
```

### packages/shared/src/phrases.ts line 280 — pending

```text
      ta: `${ta} எங்க வலிக்குதுன்னு காட்டுறேன்.`,
```

### packages/shared/src/phrases.ts line 379 — pending

```text
    "இரண்டு",
```

### packages/shared/src/phrases.ts line 380 — pending

```text
    "ரெண்டு",
```

### packages/shared/src/phrases.ts line 381 — pending

```text
    "மூன்று",
```

### packages/shared/src/phrases.ts line 382 — pending

```text
    "மூணு",
```

### packages/shared/src/phrases.ts line 383 — pending

```text
    "நான்கு",
```

### packages/shared/src/phrases.ts line 384 — pending

```text
    "நாலு",
```

### packages/shared/src/phrases.ts line 385 — pending

```text
    "ஐந்து",
```

### packages/shared/src/phrases.ts line 386 — pending

```text
    "அஞ்சு",
```

### packages/shared/src/phrases.ts line 387 — pending

```text
    "ஆறு",
```

### packages/shared/src/phrases.ts line 388 — pending

```text
    "ஏழு",
```

### packages/shared/src/phrases.ts line 389 — pending

```text
    "எட்டு",
```

### packages/shared/src/phrases.ts line 390 — pending

```text
    "ஒன்பது",
```

### packages/shared/src/phrases.ts line 391 — pending

```text
    "பத்து",
```

### packages/shared/src/phrases.ts line 392 — pending

```text
    "பதினொன்று",
```

### packages/shared/src/phrases.ts line 393 — pending

```text
    "பதினொண்ணு",
```

### packages/shared/src/phrases.ts line 394 — pending

```text
    "பன்னிரண்டு",
```

### packages/shared/src/phrases.ts line 395 — pending

```text
    "பனிரெண்டு",
```

### packages/shared/src/phrases.ts line 396 — pending

```text
    "பதின்மூன்று",
```

### packages/shared/src/phrases.ts line 397 — pending

```text
    "பதிமூணு",
```

### packages/shared/src/phrases.ts line 398 — pending

```text
    "பதினான்கு",
```

### packages/shared/src/phrases.ts line 399 — pending

```text
    "பதினைந்து",
```

### packages/shared/src/phrases.ts line 400 — pending

```text
    "பதினாறு",
```

### packages/shared/src/phrases.ts line 401 — pending

```text
    "பதினேழு",
```

### packages/shared/src/phrases.ts line 402 — pending

```text
    "பதினெட்டு",
```

### packages/shared/src/phrases.ts line 403 — pending

```text
    "பத்தொன்பது",
```

### packages/shared/src/phrases.ts line 404 — pending

```text
    "இருபது",
```

### packages/shared/src/phrases.ts line 405 — pending

```text
    "முப்பது",
```

### packages/shared/src/phrases.ts line 406 — pending

```text
    "நாற்பது",
```

### packages/shared/src/phrases.ts line 407 — pending

```text
    "ஐம்பது",
```

### packages/shared/src/phrases.ts line 408 — pending

```text
    "அறுபது",
```

### packages/shared/src/phrases.ts line 409 — pending

```text
    "எழுபது",
```

### packages/shared/src/phrases.ts line 410 — pending

```text
    "எண்பது",
```

### packages/shared/src/phrases.ts line 411 — pending

```text
    "தொண்ணூறு",
```

### packages/shared/src/phrases.ts line 412 — pending

```text
    "நூறு",
```

### packages/shared/src/phrases.ts line 413 — pending

```text
    "ஆயிரம்",
```

### packages/shared/src/phrases.ts line 414 — pending

```text
    "லட்சம்",
```

### packages/shared/src/phrases.ts line 415 — pending

```text
    "கோடி",
```

### packages/shared/src/phrases.ts line 416 — pending

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

### packages/shared/src/vocabulary.ts line 78 — pending

```text
    "ஆமா",
```

### packages/shared/src/vocabulary.ts line 80 — pending

```text
    "ஆமா.",
```

### packages/shared/src/vocabulary.ts line 82 — pending

```text
    "ஆமாம்|ஆம்|சரி",
```

### packages/shared/src/vocabulary.ts line 91 — pending

```text
    "இல்ல",
```

### packages/shared/src/vocabulary.ts line 93 — pending

```text
    "இல்ல.",
```

### packages/shared/src/vocabulary.ts line 95 — pending

```text
    "இல்லை",
```

### packages/shared/src/vocabulary.ts line 105 — pending

```text
    "தெரியல",
```

### packages/shared/src/vocabulary.ts line 107 — pending

```text
    "எனக்கு சரியா தெரியல.",
```

### packages/shared/src/vocabulary.ts line 109 — pending

```text
    "உறுதியா தெரியல|சரியா தெரியல",
```

### packages/shared/src/vocabulary.ts line 119 — pending

```text
    "எனக்குத் தெரியல",
```

### packages/shared/src/vocabulary.ts line 121 — pending

```text
    "எனக்குத் தெரியல.",
```

### packages/shared/src/vocabulary.ts line 123 — pending

```text
    "எனக்கு தெரியாது|எனக்குத் தெரியாது",
```

### packages/shared/src/vocabulary.ts line 133 — pending

```text
    "இன்னும்",
```

### packages/shared/src/vocabulary.ts line 135 — pending

```text
    "இன்னும் கொஞ்சம் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 137 — pending

```text
    "கொஞ்சம் கூட|இன்னும் கொஞ்சம்",
```

### packages/shared/src/vocabulary.ts line 148 — pending

```text
    "போதும்",
```

### packages/shared/src/vocabulary.ts line 150 — pending

```text
    "இது போதும்.",
```

### packages/shared/src/vocabulary.ts line 152 — pending

```text
    "போதும்|இது போதும்",
```

### packages/shared/src/vocabulary.ts line 163 — pending

```text
    "இப்போ",
```

### packages/shared/src/vocabulary.ts line 165 — pending

```text
    "இப்போ செய்யணும்.",
```

### packages/shared/src/vocabulary.ts line 167 — pending

```text
    "இப்போது|இப்ப",
```

### packages/shared/src/vocabulary.ts line 178 — pending

```text
    "அப்புறம்",
```

### packages/shared/src/vocabulary.ts line 180 — pending

```text
    "அப்புறம் செய்யலாம்.",
```

### packages/shared/src/vocabulary.ts line 182 — pending

```text
    "பிறகு|அப்புறம்|இப்போ வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 193 — pending

```text
    "இது",
```

### packages/shared/src/vocabulary.ts line 195 — pending

```text
    "நான் சொல்றது இது.",
```

### packages/shared/src/vocabulary.ts line 197 — pending

```text
    "இது தான்|இதுதான்",
```

### packages/shared/src/vocabulary.ts line 206 — pending

```text
    "வேற ஏதாவது",
```

### packages/shared/src/vocabulary.ts line 208 — pending

```text
    "வேற ஏதோ சொல்ல வரேன்.",
```

### packages/shared/src/vocabulary.ts line 210 — pending

```text
    "வேற ஒண்ணு|வேற ஏதாவது",
```

### packages/shared/src/vocabulary.ts line 220 — pending

```text
    "உட்கார",
```

### packages/shared/src/vocabulary.ts line 222 — pending

```text
    "உட்காரணும்.",
```

### packages/shared/src/vocabulary.ts line 224 — pending

```text
    "உட்கார|உக்கார",
```

### packages/shared/src/vocabulary.ts line 235 — pending

```text
    "எழுந்திருக்க",
```

### packages/shared/src/vocabulary.ts line 237 — pending

```text
    "எழுந்திருக்க உதவி பண்ணுங்க.",
```

### packages/shared/src/vocabulary.ts line 239 — pending

```text
    "எழுந்திருக்க|எழுந்து நிற்க",
```

### packages/shared/src/vocabulary.ts line 250 — pending

```text
    "நடக்க",
```

### packages/shared/src/vocabulary.ts line 252 — pending

```text
    "நடக்க கொஞ்சம் உதவி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 254 — pending

```text
    "நடக்க|நடை",
```

### packages/shared/src/vocabulary.ts line 265 — pending

```text
    "படுக்க",
```

### packages/shared/src/vocabulary.ts line 267 — pending

```text
    "கொஞ்சம் படுக்கணும்.",
```

### packages/shared/src/vocabulary.ts line 269 — pending

```text
    "படுக்க|படுத்துக்க",
```

### packages/shared/src/vocabulary.ts line 280 — pending

```text
    "திரும்பி படுக்க",
```

### packages/shared/src/vocabulary.ts line 282 — pending

```text
    "திரும்பி படுக்க உதவி பண்ணுங்க.",
```

### packages/shared/src/vocabulary.ts line 284 — pending

```text
    "திரும்பி படுக்க|நிலை மாற்ற",
```

### packages/shared/src/vocabulary.ts line 295 — pending

```text
    "எடுத்து தர",
```

### packages/shared/src/vocabulary.ts line 297 — pending

```text
    "அதை என்கிட்ட எடுத்து குடுங்க.",
```

### packages/shared/src/vocabulary.ts line 299 — pending

```text
    "அதை எடுத்து குடுங்க|எடுத்து தா",
```

### packages/shared/src/vocabulary.ts line 310 — pending

```text
    "திறக்க",
```

### packages/shared/src/vocabulary.ts line 312 — pending

```text
    "அதை திறந்து விடுங்க.",
```

### packages/shared/src/vocabulary.ts line 314 — pending

```text
    "திறக்க|திறந்து",
```

### packages/shared/src/vocabulary.ts line 325 — pending

```text
    "மூட",
```

### packages/shared/src/vocabulary.ts line 327 — pending

```text
    "அதை மூடுங்க.",
```

### packages/shared/src/vocabulary.ts line 329 — pending

```text
    "மூட|மூடு",
```

### packages/shared/src/vocabulary.ts line 340 — pending

```text
    "படிச்சு சொல்ல",
```

### packages/shared/src/vocabulary.ts line 342 — pending

```text
    "இதை படிச்சு சொல்லுங்க.",
```

### packages/shared/src/vocabulary.ts line 344 — pending

```text
    "படிச்சு சொல்ல|வாசிக்க",
```

### packages/shared/src/vocabulary.ts line 355 — pending

```text
    "எழுத",
```

### packages/shared/src/vocabulary.ts line 357 — pending

```text
    "அதை எழுதிக் காட்டுங்க.",
```

### packages/shared/src/vocabulary.ts line 359 — pending

```text
    "எழுத|எழுதிக் காட்டு",
```

### packages/shared/src/vocabulary.ts line 370 — pending

```text
    "ஃபோன் பண்ண",
```

### packages/shared/src/vocabulary.ts line 372 — pending

```text
    "ஃபோன் பண்ணணும்.",
```

### packages/shared/src/vocabulary.ts line 374 — pending

```text
    "போன் பண்ண|அழைக்க",
```

### packages/shared/src/vocabulary.ts line 385 — pending

```text
    "நான் சொல்றதை கேளுங்க",
```

### packages/shared/src/vocabulary.ts line 387 — pending

```text
    "நான் சொல்றதை கேளுங்க.",
```

### packages/shared/src/vocabulary.ts line 389 — pending

```text
    "கேளுங்க|நான் பேசுறதை கேளுங்க",
```

### packages/shared/src/vocabulary.ts line 401 — pending

```text
    "என்ன?",
```

### packages/shared/src/vocabulary.ts line 403 — pending

```text
    "என்ன சொல்றீங்க?",
```

### packages/shared/src/vocabulary.ts line 405 — pending

```text
    "என்ன|என்ன சொல்றீங்க",
```

### packages/shared/src/vocabulary.ts line 414 — pending

```text
    "யாரு?",
```

### packages/shared/src/vocabulary.ts line 416 — pending

```text
    "அது யாரு?",
```

### packages/shared/src/vocabulary.ts line 418 — pending

```text
    "யார்|யாரு",
```

### packages/shared/src/vocabulary.ts line 427 — pending

```text
    "எங்க?",
```

### packages/shared/src/vocabulary.ts line 429 — pending

```text
    "அது எங்க இருக்கு?",
```

### packages/shared/src/vocabulary.ts line 431 — pending

```text
    "எங்கே|எங்க",
```

### packages/shared/src/vocabulary.ts line 440 — pending

```text
    "எப்போ?",
```

### packages/shared/src/vocabulary.ts line 442 — pending

```text
    "அது எப்போ நடக்கும்?",
```

### packages/shared/src/vocabulary.ts line 444 — pending

```text
    "எப்போது|எப்போ",
```

### packages/shared/src/vocabulary.ts line 453 — pending

```text
    "ஏன்?",
```

### packages/shared/src/vocabulary.ts line 455 — pending

```text
    "அது ஏன்?",
```

### packages/shared/src/vocabulary.ts line 457 — pending

```text
    "ஏன்|எதுக்கு",
```

### packages/shared/src/vocabulary.ts line 466 — pending

```text
    "எப்படி?",
```

### packages/shared/src/vocabulary.ts line 468 — pending

```text
    "அதை எப்படி செய்யணும்?",
```

### packages/shared/src/vocabulary.ts line 470 — pending

```text
    "எப்படி",
```

### packages/shared/src/vocabulary.ts line 479 — pending

```text
    "எவ்வளவு?",
```

### packages/shared/src/vocabulary.ts line 481 — pending

```text
    "இதுக்கு எவ்வளவு ஆகும்?",
```

### packages/shared/src/vocabulary.ts line 483 — pending

```text
    "விலை|எவ்வளவு",
```

### packages/shared/src/vocabulary.ts line 494 — pending

```text
    "வேற வழி?",
```

### packages/shared/src/vocabulary.ts line 496 — pending

```text
    "எனக்கு வேற என்ன வழி இருக்கு?",
```

### packages/shared/src/vocabulary.ts line 498 — pending

```text
    "வேற வழி|வேற தேர்வு",
```

### packages/shared/src/vocabulary.ts line 510 — pending

```text
    "தண்ணி வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 512 — pending

```text
    "எனக்கு தண்ணி வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 514 — pending

```text
    "தண்ணி வேண்டாம்|தண்ணீர் வேண்டாம்|தண்ணி வேணாம்",
```

### packages/shared/src/vocabulary.ts line 525 — pending

```text
    "சாப்பாடு வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 527 — pending

```text
    "எனக்கு சாப்பாடு வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 529 — pending

```text
    "சாப்பாடு வேண்டாம்|சாப்பிட வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 540 — pending

```text
    "டீ வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 542 — pending

```text
    "எனக்கு டீ வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 544 — pending

```text
    "டீ வேண்டாம்|தேநீர் வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 555 — pending

```text
    "காபி வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 557 — pending

```text
    "எனக்கு காபி வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 559 — pending

```text
    "காபி வேண்டாம்|காப்பி வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 570 — pending

```text
    "தொட வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 572 — pending

```text
    "என்னை தொட வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 574 — pending

```text
    "தொடாதீங்க|தொட வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 585 — pending

```text
    "இப்போ பார்க்க வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 587 — pending

```text
    "இப்போ யாரையும் பார்க்க வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 589 — pending

```text
    "யாரையும் பார்க்க வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 600 — pending

```text
    "போக வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 602 — pending

```text
    "எனக்கு போக வேண்டாம்.",
```

### packages/shared/src/vocabulary.ts line 604 — pending

```text
    "போக வேண்டாம்|போக விருப்பம் இல்லை",
```

### packages/shared/src/vocabulary.ts line 615 — pending

```text
    "நிறுத்துங்க",
```

### packages/shared/src/vocabulary.ts line 617 — pending

```text
    "தயவுசெய்து நிறுத்துங்க.",
```

### packages/shared/src/vocabulary.ts line 619 — pending

```text
    "நிறுத்து|நிறுத்துங்க",
```

### packages/shared/src/vocabulary.ts line 631 — pending

```text
    "வணக்கம்",
```

### packages/shared/src/vocabulary.ts line 633 — pending

```text
    "வணக்கம்!",
```

### packages/shared/src/vocabulary.ts line 635 — pending

```text
    "வணக்கம்",
```

### packages/shared/src/vocabulary.ts line 644 — pending

```text
    "போயிட்டு வாங்க",
```

### packages/shared/src/vocabulary.ts line 646 — pending

```text
    "மறுபடியும் பார்க்கலாம்.",
```

### packages/shared/src/vocabulary.ts line 648 — pending

```text
    "போயிட்டு வாங்க|பார்க்கலாம்",
```

### packages/shared/src/vocabulary.ts line 657 — pending

```text
    "நன்றி",
```

### packages/shared/src/vocabulary.ts line 659 — pending

```text
    "நன்றி.",
```

### packages/shared/src/vocabulary.ts line 661 — pending

```text
    "நன்றி|ரொம்ப நன்றி",
```

### packages/shared/src/vocabulary.ts line 670 — pending

```text
    "மன்னிச்சுக்கோங்க",
```

### packages/shared/src/vocabulary.ts line 672 — pending

```text
    "மன்னிச்சுக்கோங்க.",
```

### packages/shared/src/vocabulary.ts line 674 — pending

```text
    "மன்னிக்கவும்|மன்னிச்சுக்கோங்க",
```

### packages/shared/src/vocabulary.ts line 683 — pending

```text
    "எப்படி இருக்கீங்க?",
```

### packages/shared/src/vocabulary.ts line 685 — pending

```text
    "எப்படி இருக்கீங்க?",
```

### packages/shared/src/vocabulary.ts line 687 — pending

```text
    "எப்படி இருக்கீங்க|நலமா",
```

### packages/shared/src/vocabulary.ts line 696 — pending

```text
    "பார்த்ததில் சந்தோஷம்",
```

### packages/shared/src/vocabulary.ts line 698 — pending

```text
    "உங்களை பார்த்ததில் சந்தோஷம்.",
```

### packages/shared/src/vocabulary.ts line 700 — pending

```text
    "பார்த்ததில் சந்தோஷம்",
```

### packages/shared/src/vocabulary.ts line 709 — pending

```text
    "உங்க நினைப்பு",
```

### packages/shared/src/vocabulary.ts line 711 — pending

```text
    "உங்களை ரொம்ப நினைக்கிறேன்.",
```

### packages/shared/src/vocabulary.ts line 713 — pending

```text
    "உங்க நினைப்பு|உங்களை நினைக்கிறேன்",
```

### packages/shared/src/vocabulary.ts line 722 — pending

```text
    "உங்களை நேசிக்கிறேன்",
```

### packages/shared/src/vocabulary.ts line 724 — pending

```text
    "நான் உங்களை நேசிக்கிறேன்.",
```

### packages/shared/src/vocabulary.ts line 726 — pending

```text
    "நேசிக்கிறேன்|அன்பு",
```

### packages/shared/src/vocabulary.ts line 735 — pending

```text
    "சும்மா சொன்னேன்",
```

### packages/shared/src/vocabulary.ts line 737 — pending

```text
    "சும்மா ஜாலியா சொன்னேன்.",
```

### packages/shared/src/vocabulary.ts line 739 — pending

```text
    "சும்மா சொன்னேன்|ஜோக்",
```

### packages/shared/src/vocabulary.ts line 748 — pending

```text
    "ஒண்ணு சொல்லணும்",
```

### packages/shared/src/vocabulary.ts line 750 — pending

```text
    "உங்ககிட்ட ஒண்ணு சொல்லணும்.",
```

### packages/shared/src/vocabulary.ts line 752 — pending

```text
    "ஒண்ணு சொல்லணும்|சொல்ல இருக்கு",
```

### packages/shared/src/vocabulary.ts line 761 — pending

```text
    "பிடிச்சிருக்கு",
```

### packages/shared/src/vocabulary.ts line 763 — pending

```text
    "எனக்கு இது பிடிச்சிருக்கு.",
```

### packages/shared/src/vocabulary.ts line 765 — pending

```text
    "பிடிச்சிருக்கு|பிடிக்கும்",
```

### packages/shared/src/vocabulary.ts line 774 — pending

```text
    "பிடிக்கல",
```

### packages/shared/src/vocabulary.ts line 776 — pending

```text
    "எனக்கு இது பிடிக்கல.",
```

### packages/shared/src/vocabulary.ts line 778 — pending

```text
    "பிடிக்கல|பிடிக்காது",
```

### packages/shared/src/vocabulary.ts line 789 — pending

```text
    "சந்தோஷம்",
```

### packages/shared/src/vocabulary.ts line 791 — pending

```text
    "எனக்கு சந்தோஷமா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 793 — pending

```text
    "சந்தோஷம்|மகிழ்ச்சி",
```

### packages/shared/src/vocabulary.ts line 804 — pending

```text
    "வருத்தம்",
```

### packages/shared/src/vocabulary.ts line 806 — pending

```text
    "எனக்கு வருத்தமா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 808 — pending

```text
    "வருத்தம்|சோகம்",
```

### packages/shared/src/vocabulary.ts line 819 — pending

```text
    "கவலை",
```

### packages/shared/src/vocabulary.ts line 821 — pending

```text
    "எனக்கு கவலையா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 823 — pending

```text
    "கவலை|பதட்டம்",
```

### packages/shared/src/vocabulary.ts line 834 — pending

```text
    "பயம்",
```

### packages/shared/src/vocabulary.ts line 836 — pending

```text
    "எனக்கு பயமா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 838 — pending

```text
    "பயம்|பயமா",
```

### packages/shared/src/vocabulary.ts line 849 — pending

```text
    "கோபம்",
```

### packages/shared/src/vocabulary.ts line 851 — pending

```text
    "எனக்கு கோபமா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 853 — pending

```text
    "கோபம்|எரிச்சல்",
```

### packages/shared/src/vocabulary.ts line 864 — pending

```text
    "தனிமை",
```

### packages/shared/src/vocabulary.ts line 866 — pending

```text
    "எனக்கு தனிமையா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 868 — pending

```text
    "தனிமை|தனியா",
```

### packages/shared/src/vocabulary.ts line 879 — pending

```text
    "போர் அடிக்குது",
```

### packages/shared/src/vocabulary.ts line 881 — pending

```text
    "எனக்கு போர் அடிக்குது.",
```

### packages/shared/src/vocabulary.ts line 883 — pending

```text
    "போர் அடிக்குது|சலிப்பு",
```

### packages/shared/src/vocabulary.ts line 894 — pending

```text
    "சோர்வு",
```

### packages/shared/src/vocabulary.ts line 896 — pending

```text
    "எனக்கு சோர்வா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 898 — pending

```text
    "சோர்வு|களைப்பு",
```

### packages/shared/src/vocabulary.ts line 909 — pending

```text
    "நிம்மதி",
```

### packages/shared/src/vocabulary.ts line 911 — pending

```text
    "எனக்கு நிம்மதியா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 913 — pending

```text
    "நிம்மதி|அமைதி",
```

### packages/shared/src/vocabulary.ts line 924 — pending

```text
    "குழப்பம்",
```

### packages/shared/src/vocabulary.ts line 926 — pending

```text
    "எனக்கு குழப்பமா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 928 — pending

```text
    "குழப்பம்|புரியாம இருக்கு",
```

### packages/shared/src/vocabulary.ts line 940 — pending

```text
    "தண்ணி",
```

### packages/shared/src/vocabulary.ts line 942 — pending

```text
    "எனக்கு தண்ணி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 944 — pending

```text
    "தண்ணி|தண்ணீர்|தண்ணி வேணும்",
```

### packages/shared/src/vocabulary.ts line 955 — pending

```text
    "டீ",
```

### packages/shared/src/vocabulary.ts line 957 — pending

```text
    "எனக்கு டீ வேணும்.",
```

### packages/shared/src/vocabulary.ts line 959 — pending

```text
    "டீ|தேநீர்",
```

### packages/shared/src/vocabulary.ts line 970 — pending

```text
    "காபி",
```

### packages/shared/src/vocabulary.ts line 972 — pending

```text
    "எனக்கு காபி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 974 — pending

```text
    "காபி|காப்பி",
```

### packages/shared/src/vocabulary.ts line 985 — pending

```text
    "பால்",
```

### packages/shared/src/vocabulary.ts line 987 — pending

```text
    "எனக்கு பால் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 989 — pending

```text
    "பால்|பாலு",
```

### packages/shared/src/vocabulary.ts line 1000 — pending

```text
    "பாட்டில்",
```

### packages/shared/src/vocabulary.ts line 1002 — pending

```text
    "பாட்டிலை எடுத்து குடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1004 — pending

```text
    "பாட்டில்|புட்டி",
```

### packages/shared/src/vocabulary.ts line 1015 — pending

```text
    "சாப்பாடு",
```

### packages/shared/src/vocabulary.ts line 1017 — pending

```text
    "எனக்கு சாப்பிட ஏதாவது வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1019 — pending

```text
    "சாப்பாடு|சாப்பிட|உணவு",
```

### packages/shared/src/vocabulary.ts line 1030 — pending

```text
    "சாதம்",
```

### packages/shared/src/vocabulary.ts line 1032 — pending

```text
    "எனக்கு கொஞ்சம் சாதம் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1034 — pending

```text
    "சாதம்|சோறு",
```

### packages/shared/src/vocabulary.ts line 1045 — pending

```text
    "ரசம்",
```

### packages/shared/src/vocabulary.ts line 1047 — pending

```text
    "எனக்கு ரசம் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1049 — pending

```text
    "ரசம்",
```

### packages/shared/src/vocabulary.ts line 1060 — pending

```text
    "இட்லி",
```

### packages/shared/src/vocabulary.ts line 1062 — pending

```text
    "எனக்கு இட்லி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1064 — pending

```text
    "இட்லி|இட்லீ",
```

### packages/shared/src/vocabulary.ts line 1075 — pending

```text
    "தோசை",
```

### packages/shared/src/vocabulary.ts line 1077 — pending

```text
    "எனக்கு தோசை வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1079 — pending

```text
    "தோசை|தோச",
```

### packages/shared/src/vocabulary.ts line 1090 — pending

```text
    "பாத்ரூம்",
```

### packages/shared/src/vocabulary.ts line 1092 — pending

```text
    "எனக்கு பாத்ரூம் போகணும்.",
```

### packages/shared/src/vocabulary.ts line 1094 — pending

```text
    "பாத்ரூம்|கழிப்பறை|டாய்லெட்",
```

### packages/shared/src/vocabulary.ts line 1105 — pending

```text
    "கழுவ",
```

### packages/shared/src/vocabulary.ts line 1107 — pending

```text
    "கழுவிக்க உதவி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1109 — pending

```text
    "கழுவ|கழுவிக்க",
```

### packages/shared/src/vocabulary.ts line 1120 — pending

```text
    "குளிக்க",
```

### packages/shared/src/vocabulary.ts line 1122 — pending

```text
    "குளிக்க உதவி வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1124 — pending

```text
    "குளிக்க|குளியல்",
```

### packages/shared/src/vocabulary.ts line 1135 — pending

```text
    "துணி மாத்த",
```

### packages/shared/src/vocabulary.ts line 1137 — pending

```text
    "துணி மாத்தணும்.",
```

### packages/shared/src/vocabulary.ts line 1139 — pending

```text
    "துணி|உடை|துணி மாத்த",
```

### packages/shared/src/vocabulary.ts line 1150 — pending

```text
    "ஓய்வு",
```

### packages/shared/src/vocabulary.ts line 1152 — pending

```text
    "எனக்கு கொஞ்சம் ஓய்வு வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1154 — pending

```text
    "ஓய்வு|ஓய்வெடுக்க",
```

### packages/shared/src/vocabulary.ts line 1165 — pending

```text
    "தூங்க",
```

### packages/shared/src/vocabulary.ts line 1167 — pending

```text
    "எனக்கு தூங்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1169 — pending

```text
    "தூங்க|தூக்கம்",
```

### packages/shared/src/vocabulary.ts line 1180 — pending

```text
    "அமைதியா",
```

### packages/shared/src/vocabulary.ts line 1182 — pending

```text
    "கொஞ்சம் அமைதியா இருக்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1184 — pending

```text
    "சத்தம் வேண்டாம்|அமைதியா",
```

### packages/shared/src/vocabulary.ts line 1195 — pending

```text
    "பாட்டு",
```

### packages/shared/src/vocabulary.ts line 1197 — pending

```text
    "பாட்டு கேக்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1199 — pending

```text
    "பாட்டு|இசை",
```

### packages/shared/src/vocabulary.ts line 1210 — pending

```text
    "டிவி",
```

### packages/shared/src/vocabulary.ts line 1212 — pending

```text
    "டிவி பார்க்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1214 — pending

```text
    "டிவி|தொலைக்காட்சி",
```

### packages/shared/src/vocabulary.ts line 1225 — pending

```text
    "என் ஃபோன்",
```

### packages/shared/src/vocabulary.ts line 1227 — pending

```text
    "என் ஃபோனை எடுத்து குடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1229 — pending

```text
    "ஃபோன்|போன்|கைப்பேசி",
```

### packages/shared/src/vocabulary.ts line 1240 — pending

```text
    "என் கண்ணாடி",
```

### packages/shared/src/vocabulary.ts line 1242 — pending

```text
    "என் கண்ணாடியை எடுத்து குடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1244 — pending

```text
    "கண்ணாடி|மூக்குக்கண்ணாடி",
```

### packages/shared/src/vocabulary.ts line 1255 — pending

```text
    "போர்வை",
```

### packages/shared/src/vocabulary.ts line 1257 — pending

```text
    "எனக்கு போர்வை வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1259 — pending

```text
    "போர்வை",
```

### packages/shared/src/vocabulary.ts line 1270 — pending

```text
    "தலையணை",
```

### packages/shared/src/vocabulary.ts line 1272 — pending

```text
    "எனக்கு தலையணை வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1274 — pending

```text
    "தலையணை",
```

### packages/shared/src/vocabulary.ts line 1285 — pending

```text
    "ஃபேன்",
```

### packages/shared/src/vocabulary.ts line 1287 — pending

```text
    "ஃபேனை போடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1289 — pending

```text
    "ஃபேன்|விசிறி",
```

### packages/shared/src/vocabulary.ts line 1300 — pending

```text
    "ஃபேனை நிறுத்த",
```

### packages/shared/src/vocabulary.ts line 1302 — pending

```text
    "ஃபேனை நிறுத்துங்க.",
```

### packages/shared/src/vocabulary.ts line 1304 — pending

```text
    "ஃபேனை நிறுத்த|ஃபேன் வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 1315 — pending

```text
    "லைட்",
```

### packages/shared/src/vocabulary.ts line 1317 — pending

```text
    "லைட்டை போடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1319 — pending

```text
    "லைட்|விளக்கு",
```

### packages/shared/src/vocabulary.ts line 1330 — pending

```text
    "லைட்டை அணைக்க",
```

### packages/shared/src/vocabulary.ts line 1332 — pending

```text
    "லைட்டை அணைங்க.",
```

### packages/shared/src/vocabulary.ts line 1334 — pending

```text
    "லைட்டை அணைக்க|லைட் வேண்டாம்",
```

### packages/shared/src/vocabulary.ts line 1345 — pending

```text
    "வெளியே போக",
```

### packages/shared/src/vocabulary.ts line 1347 — pending

```text
    "வெளியே போகணும்.",
```

### packages/shared/src/vocabulary.ts line 1349 — pending

```text
    "வெளியே|வெளில",
```

### packages/shared/src/vocabulary.ts line 1360 — pending

```text
    "வீட்டுக்கு போக",
```

### packages/shared/src/vocabulary.ts line 1362 — pending

```text
    "வீட்டுக்கு போகணும்.",
```

### packages/shared/src/vocabulary.ts line 1364 — pending

```text
    "வீடு|வீட்டுக்கு",
```

### packages/shared/src/vocabulary.ts line 1375 — pending

```text
    "பிரார்த்தனை",
```

### packages/shared/src/vocabulary.ts line 1377 — pending

```text
    "பிரார்த்தனை பண்ண நேரம் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1379 — pending

```text
    "பிரார்த்தனை|வழிபாடு",
```

### packages/shared/src/vocabulary.ts line 1391 — pending

```text
    "வலி",
```

### packages/shared/src/vocabulary.ts line 1393 — pending

```text
    "எனக்கு வலி இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 1395 — pending

```text
    "வலி|வலிக்குது",
```

### packages/shared/src/vocabulary.ts line 1406 — pending

```text
    "வலி இல்ல",
```

### packages/shared/src/vocabulary.ts line 1408 — pending

```text
    "எனக்கு வலி இல்ல.",
```

### packages/shared/src/vocabulary.ts line 1410 — pending

```text
    "வலி இல்ல|வலி இல்லை|வலிக்கல",
```

### packages/shared/src/vocabulary.ts line 1421 — pending

```text
    "சூடா இருக்கு",
```

### packages/shared/src/vocabulary.ts line 1423 — pending

```text
    "எனக்கு சூடா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 1425 — pending

```text
    "சூடா|வெயில்",
```

### packages/shared/src/vocabulary.ts line 1436 — pending

```text
    "குளிருது",
```

### packages/shared/src/vocabulary.ts line 1438 — pending

```text
    "எனக்கு குளிருது.",
```

### packages/shared/src/vocabulary.ts line 1440 — pending

```text
    "குளிருது|குளிர்",
```

### packages/shared/src/vocabulary.ts line 1451 — pending

```text
    "தலை சுத்துது",
```

### packages/shared/src/vocabulary.ts line 1453 — pending

```text
    "எனக்கு தலை சுத்துது.",
```

### packages/shared/src/vocabulary.ts line 1455 — pending

```text
    "தலை சுத்துது|தலை சுற்றுது",
```

### packages/shared/src/vocabulary.ts line 1466 — pending

```text
    "குமட்டுது",
```

### packages/shared/src/vocabulary.ts line 1468 — pending

```text
    "எனக்கு வாந்தி வர மாதிரி இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 1470 — pending

```text
    "குமட்டுது|வாந்தி",
```

### packages/shared/src/vocabulary.ts line 1481 — pending

```text
    "அரிக்குது",
```

### packages/shared/src/vocabulary.ts line 1483 — pending

```text
    "எனக்கு அரிக்குது.",
```

### packages/shared/src/vocabulary.ts line 1485 — pending

```text
    "அரிக்குது|அரிப்பு",
```

### packages/shared/src/vocabulary.ts line 1496 — pending

```text
    "வசதியா இல்ல",
```

### packages/shared/src/vocabulary.ts line 1498 — pending

```text
    "இந்த நிலையில் வசதியா இல்ல.",
```

### packages/shared/src/vocabulary.ts line 1500 — pending

```text
    "வசதியா இல்ல|அசௌகரியம்",
```

### packages/shared/src/vocabulary.ts line 1511 — pending

```text
    "வசதியா இருக்கு",
```

### packages/shared/src/vocabulary.ts line 1513 — pending

```text
    "இப்போ வசதியா இருக்கு.",
```

### packages/shared/src/vocabulary.ts line 1515 — pending

```text
    "வசதியா இருக்கு",
```

### packages/shared/src/vocabulary.ts line 1526 — pending

```text
    "டாக்டரிடம் பேச",
```

### packages/shared/src/vocabulary.ts line 1528 — pending

```text
    "டாக்டர்கிட்ட பேசணும்.",
```

### packages/shared/src/vocabulary.ts line 1530 — pending

```text
    "டாக்டர்|மருத்துவர்",
```

### packages/shared/src/vocabulary.ts line 1541 — pending

```text
    "நர்ஸை கூப்பிட",
```

### packages/shared/src/vocabulary.ts line 1543 — pending

```text
    "நர்ஸை கூப்பிடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1545 — pending

```text
    "நர்ஸ்|செவிலியர்",
```

### packages/shared/src/vocabulary.ts line 1556 — pending

```text
    "விளக்கி சொல்ல",
```

### packages/shared/src/vocabulary.ts line 1558 — pending

```text
    "என்ன செய்யப் போறீங்கன்னு விளக்கி சொல்லுங்க.",
```

### packages/shared/src/vocabulary.ts line 1560 — pending

```text
    "என்ன செய்யப் போறீங்க|சிகிச்சை விளக்கம்",
```

### packages/shared/src/vocabulary.ts line 1571 — pending

```text
    "மருந்து பற்றி கேட்க",
```

### packages/shared/src/vocabulary.ts line 1573 — pending

```text
    "என் மருந்து பற்றி கேக்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1575 — pending

```text
    "மருந்து பற்றி|மாத்திரை பற்றி",
```

### packages/shared/src/vocabulary.ts line 1586 — pending

```text
    "இன்னும் விளக்கம்",
```

### packages/shared/src/vocabulary.ts line 1588 — pending

```text
    "முடிவு பண்ண முன்னாடி இன்னும் விளக்கம் வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1590 — pending

```text
    "முடிவு பண்ண முன்னாடி|இன்னும் விளக்கம்",
```

### packages/shared/src/vocabulary.ts line 1602 — pending

```text
    "என் முடிவு",
```

### packages/shared/src/vocabulary.ts line 1604 — pending

```text
    "இந்த முடிவை நானே எடுக்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1606 — pending

```text
    "என் முடிவு|நானே முடிவு",
```

### packages/shared/src/vocabulary.ts line 1615 — pending

```text
    "என்கிட்டயும் பேசுங்க",
```

### packages/shared/src/vocabulary.ts line 1617 — pending

```text
    "இந்த பேச்சுல என்னையும் சேர்த்துக்கோங்க.",
```

### packages/shared/src/vocabulary.ts line 1619 — pending

```text
    "என்கிட்ட பேசுங்க|என்னையும் சேர்த்து",
```

### packages/shared/src/vocabulary.ts line 1628 — pending

```text
    "என் குடும்பம்",
```

### packages/shared/src/vocabulary.ts line 1630 — pending

```text
    "என் குடும்பத்தினரை பார்க்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1632 — pending

```text
    "குடும்பம்|என் குடும்பம்",
```

### packages/shared/src/vocabulary.ts line 1643 — pending

```text
    "என் நண்பர்",
```

### packages/shared/src/vocabulary.ts line 1645 — pending

```text
    "என் நண்பரை பார்க்கணும்.",
```

### packages/shared/src/vocabulary.ts line 1647 — pending

```text
    "நண்பர்|தோழி|நண்பன்",
```

### packages/shared/src/vocabulary.ts line 1658 — pending

```text
    "தனியா இருக்க",
```

### packages/shared/src/vocabulary.ts line 1660 — pending

```text
    "எனக்கு கொஞ்சம் தனிமை வேணும்.",
```

### packages/shared/src/vocabulary.ts line 1662 — pending

```text
    "தனியா இருக்கணும்|தனிமை வேணும்",
```

### packages/shared/src/vocabulary.ts line 1673 — pending

```text
    "தமிழ்ல பேசுங்க",
```

### packages/shared/src/vocabulary.ts line 1675 — pending

```text
    "என்கிட்ட தமிழ்ல பேசுங்க.",
```

### packages/shared/src/vocabulary.ts line 1677 — pending

```text
    "தமிழ்|தமிழ்ல பேசுங்க",
```

### packages/shared/src/vocabulary.ts line 1688 — pending

```text
    "ஆங்கிலத்தில் பேசுங்க",
```

### packages/shared/src/vocabulary.ts line 1690 — pending

```text
    "என்கிட்ட ஆங்கிலத்தில் பேசுங்க.",
```

### packages/shared/src/vocabulary.ts line 1692 — pending

```text
    "ஆங்கிலம்|இங்கிலீஷ்",
```

### packages/shared/src/vocabulary.ts line 1703 — pending

```text
    "என் கதை",
```

### packages/shared/src/vocabulary.ts line 1705 — pending

```text
    "என்னைப் பற்றி சொல்லணும்.",
```

### packages/shared/src/vocabulary.ts line 1707 — pending

```text
    "என்னைப் பற்றி|என் கதை",
```

### packages/shared/src/vocabulary.ts line 1717 — pending

```text
    "நேரம் குடுங்க",
```

### packages/shared/src/vocabulary.ts line 1719 — pending

```text
    "பேச கொஞ்சம் நேரம் குடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1721 — pending

```text
    "நேரம் குடுங்க|பேச நேரம்",
```

### packages/shared/src/vocabulary.ts line 1730 — pending

```text
    "மறுபடியும் சொல்லுங்க",
```

### packages/shared/src/vocabulary.ts line 1732 — pending

```text
    "அதை மறுபடியும் சொல்லுங்க.",
```

### packages/shared/src/vocabulary.ts line 1734 — pending

```text
    "மறுபடியும் சொல்லுங்க|திரும்ப சொல்லுங்க",
```

### packages/shared/src/vocabulary.ts line 1743 — pending

```text
    "மெதுவா பேசுங்க",
```

### packages/shared/src/vocabulary.ts line 1745 — pending

```text
    "கொஞ்சம் மெதுவா பேசுங்க.",
```

### packages/shared/src/vocabulary.ts line 1747 — pending

```text
    "மெதுவா பேசுங்க|மெதுவா",
```

### packages/shared/src/vocabulary.ts line 1756 — pending

```text
    "ஒரு கேள்வி",
```

### packages/shared/src/vocabulary.ts line 1758 — pending

```text
    "ஒரு நேரத்துல ஒரு கேள்வி கேளுங்க.",
```

### packages/shared/src/vocabulary.ts line 1760 — pending

```text
    "ஒரு கேள்வி|ஒவ்வொரு கேள்வியா",
```

### packages/shared/src/vocabulary.ts line 1769 — pending

```text
    "அப்படி சொல்லல",
```

### packages/shared/src/vocabulary.ts line 1771 — pending

```text
    "நான் அப்படி சொல்ல வரல.",
```

### packages/shared/src/vocabulary.ts line 1773 — pending

```text
    "அப்படி சொல்லல|அந்த வார்த்தை இல்ல",
```

### packages/shared/src/vocabulary.ts line 1783 — pending

```text
    "புரியுது",
```

### packages/shared/src/vocabulary.ts line 1785 — pending

```text
    "எனக்கு புரியுது.",
```

### packages/shared/src/vocabulary.ts line 1787 — pending

```text
    "புரியுது|புரிஞ்சுது",
```

### packages/shared/src/vocabulary.ts line 1796 — pending

```text
    "புரியல",
```

### packages/shared/src/vocabulary.ts line 1798 — pending

```text
    "எனக்கு புரியல.",
```

### packages/shared/src/vocabulary.ts line 1800 — pending

```text
    "புரியல|புரியவில்லை",
```

### packages/shared/src/vocabulary.ts line 1810 — pending

```text
    "மனசை மாத்திட்டேன்",
```

### packages/shared/src/vocabulary.ts line 1812 — pending

```text
    "என் மனசை மாத்திட்டேன்.",
```

### packages/shared/src/vocabulary.ts line 1814 — pending

```text
    "மனசை மாத்திட்டேன்|முடிவை மாத்திட்டேன்",
```

### packages/shared/src/vocabulary.ts line 1823 — pending

```text
    "காட்டுறேன்",
```

### packages/shared/src/vocabulary.ts line 1825 — pending

```text
    "நான் என்ன சொல்றேன்னு காட்டுறேன்.",
```

### packages/shared/src/vocabulary.ts line 1827 — pending

```text
    "காட்டுறேன்|காட்டி சொல்றேன்",
```

### packages/shared/src/vocabulary.ts line 1836 — pending

```text
    "வார்த்தைக்கு உதவி",
```

### packages/shared/src/vocabulary.ts line 1838 — pending

```text
    "வார்த்தையை கண்டுபிடிக்க உதவி பண்ணுங்க.",
```

### packages/shared/src/vocabulary.ts line 1840 — pending

```text
    "வார்த்தைக்கு உதவி|வார்த்தை வரல",
```

### packages/shared/src/vocabulary.ts line 1849 — pending

```text
    "பேசி முடிக்க விடுங்க",
```

### packages/shared/src/vocabulary.ts line 1851 — pending

```text
    "நான் பேசி முடிக்க விடுங்க.",
```

### packages/shared/src/vocabulary.ts line 1853 — pending

```text
    "பேசி முடிக்க விடுங்க|குறுக்க பேசாதீங்க",
```

### packages/shared/src/vocabulary.ts line 1862 — pending

```text
    "கொஞ்சம் நிறுத்தலாம்",
```

### packages/shared/src/vocabulary.ts line 1864 — pending

```text
    "இந்த பேச்சை கொஞ்சம் நிறுத்தலாம்.",
```

### packages/shared/src/vocabulary.ts line 1866 — pending

```text
    "பேச்சை நிறுத்தலாம்|கொஞ்சம் நிறுத்தலாம்",
```

### packages/shared/src/vocabulary.ts line 1974 — pending

```text
    /\b(?:but|except|instead|rather|unless)\b|ஆனா|ஆனால்|தவிர/u.test(raw)
```

### packages/shared/src/vocabulary.ts line 1984 — pending

```text
      /\b(?:no|not|don't|dont|never|off|vendam|vendaam|venam|illa|illai)\b|வேண்டாம்|வேணாம்|இல்லை|இல்ல|வலிக்கல|பிடிக்கல|புரியல/u.test(
```

### packages/shared/src/vocabulary.ts line 1989 — pending

```text
      /\b(?:who|where|when|why|how|what|yaaru|yaru|enga|enge|eppo|yen|eppadi|epdi|enna)\b|எங்கே|எங்க|எப்போ|ஏன்|எப்படி|யாரு/u.test(
```

### packages/shared/src/vocabulary.ts line 1995 — pending

```text
      /\p{N}|\b(?:left|right|yesterday|tomorrow|already|mg|ml)\b|இடது|வலது|நேற்று|நாளை/u.test(
```

## Review sign-off

| Language | Reviewer/date | Result | Corrections |
| --- | --- | --- | --- |
| Tamil | pending | pending | pending |
| Hindi | pending | pending, M10 | pending |
| Telugu | pending | pending, M10 | pending |


## 28 September — contextual engine additions (pending native review)

Generated sentences and their evidence translations are model-authored drafts. They are not a preapproved language corpus. The following authored Tamil source lines and fictional test fixtures are preserved for review; regex lines also appear so the review inventory is complete for these new files.

Patient label in `apps/web/src/pages/Patient.tsx`: **AI வரைவு · பொருளைச் சரிபாருங்கள்** — English: “AI draft · Check the meaning”. Pending native review.

### packages/shared/src/modelGrounding.ts

```text
36:   /\b(?:no|not|never|don['’]?t|doesn['’]?t|didn['’]?t|can['’]?t|cannot|won['’]?t|without|venam|vendam|vendaam|illai|illa)\b|வேணாம்|வேண்டாம்|இல்லை|இல்ல|முடியாது|மாட்டேன்/u.test(
40:   left: /\bleft\b|இடது|\bidathu\b/iu.test(text),
41:   right: /\bright\b|வலது|\bvalathu\b/iu.test(text),
45:   /\b(?:mg|mcg|ml|milligrams?|micrograms?|millilit(?:er|re)s?|dosage|you should|you must|diagnos(?:is|ed)|prescri(?:be|ption)|take .{0,30}(?:daily|every)|stop taking|double .{0,20}dose)\b|மில்லிகிராம்|மி\.கி|மருந்தளவு|மருந்து எடுத்துக்கொள்ள/iu;
669:     !/\b(?:yes|hello|thanks|thank)\b|ஆமா|நன்றி|வணக்கம்/iu.test(current)
716:         (context.outputLang === "ta" ? "வாக்கியம்" : "Sentence"),
```

### apps/server/tests/contextual.test.ts

```text
301:     const raw = "வழக்கமான பானம் வேண்டும்",
307:           ...routineDraft(tamil, "எனக்கு வழக்கமான காபி வேண்டும்."),
563:     const raw = "நாளை தோட்டத்தில் என் சகோதரியை பார்க்க விரும்புகிறேன்",
566:       text: "நாளை தோட்டத்தில் என் சகோதரியை பார்க்க விரும்புகிறேன்.",
581:           evidence: [{ ...item.evidence[0], quote: "நாளை" }],
594:             text: "நாளை தோட்டத்தில் என் சகோதரியை பார்க்க விரும்புகிறேன்.",
732:         response({ ...item, text: "எனக்கு சூப் வேண்டும்." }),
738:         response({ ...item, text: "எனக்கு சூப் வேண்டாம்." }),
766:         response({ ...item, text: "வலது கால் வலிக்கிறது." }),
772:         response({ ...item, text: "இடது கால் வலிக்கிறது." }),
```


## 28 September — time, place and routine context (pending native review)

Authored patient controls, context-matching cues and fictional tests below require native-speaker review. Model-authored sentences and their translations are not preapproved by this inventory.

### apps/web/src/features/context/ContextSummary.tsx

```text
10:   home: ["Home", "வீடு"],
11:   clinic: ["Clinic", "மருத்துவமனை"],
12:   hospital: ["Hospital", "மருத்துவமனை"],
13:   outside: ["Outside", "வெளியே"],
14:   other: ["Other place", "வேறு இடம்"],
32:           "இந்த வாக்கியங்களுக்கான சூழல்",
39:           "இவை குறிப்புகள் மட்டுமே. உங்கள் வார்த்தையும் தேர்வும் முக்கியம்.",
48:               signals.clock.isDemo ? "மாதிரி நேரம்" : "நேரம்",
55:             {copy(lang, "Selected place", "தேர்ந்தெடுத்த இடம்")}:{" "}
61:             {copy(lang, "Current question", "தற்போதைய கேள்வி")}:{" "}
67:             {copy(lang, "Routine clue", "வழக்கக் குறிப்பு")}:{" "}
76:               "சமீபத்தில் உறுதிசெய்த செய்திகள்",
87:             "ஒன்றுக்கு மேற்பட்ட வழக்கங்கள் பொருந்துகின்றன. எது என்று ஒரு வார்த்தை சேருங்கள்.",
```

### packages/shared/src/contextEngine.ts

```text
21:     "மருந்து",
22:     "மாத்திரை",
31:     "உணவு",
32:     "சாப்பாடு",
42:     "தண்ணீர்",
43:     "தேநீர்",
44:     "காபி",
45:     "பால்",
46:     "பானம்",
47:     "குடிக்க",
49:   toilet: ["toilet", "bathroom", "கழிப்பறை"],
50:   pain: ["pain", "hurt", "hurts", "வலி"],
51:   people: ["people", "call", "visit", "family", "பேச", "அழைக்க"],
52:   feelings: ["feelings", "happy", "sad", "worried", "மகிழ்ச்சி", "கவலை"],
53:   rest: ["rest", "sleep", "nap", "bed", "ஓய்வு", "தூக்கம்"],
54:   tv_phone: ["tv", "television", "phone", "music", "டிவி", "தொலைபேசி", "இசை"],
55:   prayer: ["prayer", "pray", "worship", "பிரார்த்தனை", "வழிபாடு"],
56:   go_out: ["outside", "walk", "garden", "out", "வெளியே", "நடை", "தோட்டம்"],
59:   ["water", "தண்ணீர்", "thanni", "tanni"],
60:   ["tea", "தேநீர்", "டீ"],
61:   ["coffee", "காபி", "kaapi"],
62:   ["juice", "சாறு"],
63:   ["milk", "பால்", "paal"],
70:   "பானம்",
71:   "உணவு",
72:   "சாப்பாடு",
73:   "குடிக்க",
104:   "எனக்கு",
105:   "வேண்டும்",
106:   "வேண்டாம்",
107:   "இல்லை",
108:   "கொஞ்சம்",
118:     aliases: ["morning", "காலை"],
122:     aliases: ["midday", "noon", "மதியம்"],
126:     aliases: ["afternoon", "பிற்பகல்"],
130:     aliases: ["evening", "மாலை"],
134:     aliases: ["night", "இரவு"],
139:   ["home", ["home", "வீடு", "வீட்டில்"]],
140:   ["hospital", ["hospital", "மருத்துவமனை", "மருத்துவமனையில்"]],
141:   ["clinic", ["clinic", "கிளினிக்"]],
142:   ["outside", ["outside", "outdoors", "வெளியே"]],
145:   /\b(?:medicin(?:e|es|al)|medications?|drugs?|tablets?|pills?|dos(?:e|es|age)|prescriptions?|injections?|therapy|treatment|mg|mcg|ml)\b|மருந்து|மாத்திரை|மருந்தளவு|சிகிச்சை|ஊசி/iu;
166:     : ["drink", "beverage", "juice", "சாறு", "பானம்"]),
241:     /\b(?:usual|routine|normally|regular)\b|வழக்கமான|வழக்கம்|வழக்கம்போல்/iu.test(
259:     /\bhere\b|இங்கே|இங்கு/iu.test(current) &&
267:     /\b(?:tomorrow|yesterday|later|tonight|last|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|நாளை|நேற்று|\b\d{1,2}:\d{2}\b|\b(?:at|around|before|after)\s+(?:\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/iu.test(
```

### packages/shared/src/contextEngine.test.ts

```text
35:     "இரவு மாத்திரை",
73:   it.each(["Morning idli", "Rice", "Meal", "காலை இட்லி"])(
132:   it.each(["drink", "want drink", "I would like a drink", "பானம் வேண்டும்"])(
336:         context({ fragment: { modality: "text", raw: "இங்கே உதவி வேண்டும்" } }),
341:   it.each(["want usual water", "no usual tea", "usual பால்"])(
```
