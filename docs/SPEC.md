# SOLLU — Master Build Prompt for Claude Code
*BME Ignite Hackfest 2026 · Team echo · Rajalakshmi Engineering College, Chennai*

> **For the human operator (Claude Code: skip to §0).**
> 1. Put this file in an empty folder, copy the idea deck in as `docs/idea-deck.pdf`, and run `git init`.
> 2. Before the 24 hours start, if the hackathon rules allow it: create API keys for Anthropic, ElevenLabs and Sarvam (ElevenLabs instant voice cloning needs a paid plan, and its monthly character quota is small, so prefetch sparingly while developing). Also choose an `ACCESS_CODE`; record a consented 1–2 minute voice sample from a team member or a relative who agrees; record about ten short Tamil test fragments; charge two Android phones; and create an account with an HTTPS host that supports WebSockets.
> 3. Start Claude Code in plan mode with `claude --permission-mode plan` and send: *Read SOLLU_MASTER_PROMPT.md in full. It is long: read it in chunks of about 200 lines until the line END OF MASTER PROMPT. Then follow Section 0.*
> 4. After approving the plan, for long stretches you can start a session in auto mode (`claude --permission-mode auto`) and set a goal, e.g. `/goal M1[H] checks tagged [auto] pass, pnpm verify exits 0 and PROGRESS.md links the evidence, or stop after 40 turns`. Run `/clear` between milestones; the new session resumes from `CLAUDE.md` and `PROGRESS.md`.

---

## 0. Your role and how you work

You are the lead engineer building **Sollu** (சொல்லு — Tamil for "say it"; tagline *"Say it. In your words. In your voice."*), an AI communication companion for adults with post-stroke aphasia. Build it as an installable PWA with a thin server, in two horizons:
1. **The 24-hour hackathon MVP** (§0.1): Tamil + English, demoed live on stage.
2. **The complete product** (§17, M7–M11): robust enough for a supervised pilot with a speech-language clinic.

Rules of engagement:

1. **Read all of this file first,** in chunks of about 200 lines, until the line `END OF MASTER PROMPT`. Skim `docs/idea-deck.pdf` if it is present. Where the deck and this file differ, this file wins; §0.2 lists the deliberate differences.
2. **Plan before building.** Plan mode can't write files, so present the plan for approval: your understanding of the product in ≤ 15 lines; the [H] path of §0.1 broken into tasks; the later milestones in outline; the top risks; and the provider facts you must verify. Ask the human at most three questions, in one batch (which API keys exist, where to host, anything to cut). Missing keys never block you — use mock mode. After approval, save the plan as `docs/PLAN.md`.
3. **Living docs, in the first commit.** Copy this entire file unchanged to `docs/SPEC.md` (the source of truth). Write `CLAUDE.md` in ≤ 60 lines: commands, conventions, one line per §4 invariant, pointers such as "intent prompt: docs/SPEC.md §7.3", and "when compacting, keep the current milestone, its open checks and the files modified". Write `PROGRESS.md`, listing every milestone and check with its status, evidence link and date. A fresh session must be able to resume from `CLAUDE.md` + `PROGRESS.md`.
4. **Milestone discipline.** Build in the order of §0.1, then §17. A milestone, or its [H] cut, is done only when its acceptance checks pass and the evidence is linked in `PROGRESS.md`. Checks are tagged **[auto]** (you run them and paste the output) or **[human]** (they need real phones, real voices, recordings or a person's judgement). For a [human] check, write a short step-by-step checklist in `PROGRESS.md`, ask the human to run it, and record their report. Never mark a [human] check done yourself, and never fabricate or estimate evidence. Commit at the end of each milestone (e.g. `feat(m3): own-voice TTS`), with small commits inside.
5. **Verify before you integrate.** Endpoints, model IDs, SDK package names, language lists, limits, prices and data-retention terms change. Before writing a provider adapter, read the provider's current official docs and record what you verified in `docs/PROVIDERS.md`: URL, date, the facts used, the retention and training-use policy, and the rate limits. If the docs contradict this file, the docs win; record the deviation in `docs/DECISIONS.md`.
6. **Mock mode is a first-class feature.** `MOCK_PROVIDERS=1` gives deterministic fake LLM, STT, TTS, cloning and vision responses, so the whole app, all tests and demo rehearsal run with no keys and no network.
7. **Never weaken a safety invariant (§4)** to make something pass. If one blocks you, stop and explain.
8. **Independent review.** After a milestone's checks pass, use a subagent to review the diff against `docs/SPEC.md` and the §4 invariants. Fix gaps that affect correctness or stated requirements; ignore style. During the 24 hours, do this only after M1[H] and before the demo freeze.
9. **Language content.** Every Tamil, Hindi and Telugu string in this file is a draft in spoken register. Use them, and list them in `docs/LANGUAGE_REVIEW.md`, together with any strings you write yourself, for the team's native speakers to confirm.
10. **No real medical content** in seeds, prompts or UI: no drug names, doses, diagnoses or clinical advice. Tests and evals may use obviously fake negative fixtures (e.g. "Fakeomycin 500 mg") to prove the guards work.
11. **Ask the human only for** API keys and accounts, [human] checks, irreversible actions (deleting provider voices, publishing, pushing to a shared remote) and native-speaker review. Decide everything else yourself, and record non-obvious decisions in `docs/DECISIONS.md`.

### 0.1 The 24-hour hackathon
The deck promises a working **Tamil + English MVP in 24 hours**: speech, tap and camera input; a cloud LLM; a cloud voice clone; the sentence shown on a caregiver's phone; and a live taps-and-seconds comparison against a picture board. The parts of §17 marked **[H]** are that scope. Everything else comes after the hackathon.

Build a thin vertical slice first — a spoken or tapped fragment → three Tamil candidates → a tap → the cloned voice, on a real phone — then widen. Deploy to an HTTPS host within the first three hours so the phones can test continuously.

| Hours | Target |
|---|---|
| 0–3 | M0[H]; M1 skeleton on mock providers; deployed over HTTPS; installed on a phone |
| 3–8 | M1[H] with the real LLM and the Tamil prompt; M3[H] own voice → first end-to-end run on the phone |
| 8–13 | M2[H] speech input; from M6[H]: the overlay, baseline board and therapist-lite |
| 13–17 | M5[H] caregiver phone + Help; M4[H] camera |
| 17–20 | The rest of M6[H] (scenarios, rehearsal cache, warm-up, demo script); fallbacks; bug fixes |
| 20–24 | Rehearse the full demo at least three times; fix bugs only; freeze |

If you fall behind, drop [H] features in this order: the "They asked…" mic → the therapist-lite chart (keep its list and CSV export) → camera → the caregiver phone (show the text in a second browser tab instead). Never drop the confirm gate, the own voice, speech input, the taps-and-seconds overlay or the baseline board.

Quality bar during the 24 hours: lint and typecheck green; unit tests for the validator, signatures and context builder; the §4 invariant tests that apply so far; one E2E happy path per input modality. Record every deferred item in `PROGRESS.md` with the milestone it moves to.

Parallel work: once M1[H] is merged, the human may run two or three Claude Code sessions in separate git worktrees (`git worktree add ../sollu-voice -b m3-voice`) — for example voice (M3); speech + camera (M2, M4); caregiver + stage kit (M5, M6). The zod contracts in `packages/shared` are the interface between them: only one session at a time edits them, and every session merges often.

### 0.2 Deliberate differences from the idea deck (copy into `docs/DECISIONS.md`)
1. **A thin server exists.** API keys can't ship inside a PWA (§3.1).
2. **Speech-to-text.** The deck's Whisper (small) is weak on Tamil and on one-word, code-mixed clips. Sarvam's Indic models are the default candidate, with OpenAI Whisper/GPT-4o transcription and ElevenLabs Scribe as measured alternatives. The team's own recordings decide (§15.3).
3. **Voice.** Coqui XTTS-v2 is out: it has no Tamil or Telugu, and its model licence is non-commercial. Use ElevenLabs instant cloning plus Sarvam voice cloning instead; Telugu needs ElevenLabs `eleven_v3` or Sarvam.
4. **Vision.** COCO-SSD can't recognise tablets, pill strips or spectacles. The family teaches personal objects on-device (M8), with opt-in cloud vision as a fallback. YOLO-nano is not used.
5. **The only gate to the speaker is the person's tap on an exact sentence.** The confirm screen is one place that happens. Quick-strip, phrasebook and Help buttons also show the exact sentence, so tapping one is the same confirmation.
6. **"Only the fragment and context packet leave the device" is not accurate.** Speech clips (to STT), sentence text (to TTS, including prefetched candidates), voice samples (to cloning) and encrypted caregiver messages also leave it. The privacy screen says so (§13.4).
7. **"Existing aids are almost always English-only" is not accurate.** Avaz and Jellow support Tamil, Hindi, Telugu and more. Sollu's claims are intent completion, context, the person's own voice and speed (§1.7).
8. **"Four big targets per screen, no nested menus"** becomes four big content targets per screen by default, with the quick strip and navigation as secondary controls. The pain path is a short guided flow (Pain → body part → side → sentences).
9. **"2 taps per sentence"** holds on the speech path: the Speak tile starts recording, and one tap confirms. The Topics path takes 3–5 taps. The stage overlay reports whatever it measures.
10. **"Learns vocabulary and daily routine"** is implemented as learned phrasing, word substitutions, learned routine items and vocabulary suggestions (§11, M7).

---

## 1. Product definition

### 1.1 In one sentence
Sollu turns whatever a person with aphasia can manage — one word, a tap, a photo — into **three different complete sentences** they might mean. They tap one; it is **spoken aloud in their own voice** and shown as text on their caregiver's phone. Every miss becomes data for their speech therapist.

### 1.2 The problem
- Aphasia is an acquired language disorder, most often from a left-hemisphere stroke. It can affect speaking, understanding, reading and writing, and it affects roughly one in three stroke survivors. Typically the person knows exactly what they want to say; the words don't come.
- India has roughly 1.5–1.8 million strokes a year and only about 2,900 registered audiologists and speech-language pathologists (2022 count). Most daily communication happens at home with no therapist. Families play "twenty questions", or use symbol-grid boards and apps largely designed for children, which take many taps per sentence and speak in a generic voice.

### 1.3 Who it is for — be precise
- **Primary user:** an adult with non-fluent (Broca-type) or anomic aphasia: comprehension relatively preserved, output limited to single words or telegraphic fragments, frequent word-finding failure. They can *recognise* the right sentence when they see or hear it — that is what makes three-choice confirmation work.
- **Also served:** caregivers (family, home nurse) and speech-language therapists (SLPs).
- **Weak fit (don't pretend otherwise):** severe global or Wernicke-type aphasia with poor comprehension; these users may not be able to verify a candidate. For them Topics, Yes/No and the phrasebook still help, and the app still never speaks on its own.

### 1.4 Clinical realities → design rules (inputs you must honour)
| Reality | Design rule |
|---|---|
| Aphasia after a left-hemisphere stroke often comes with right-side weakness | One-handed, **left-hand-first** layout; main targets in the lower 60% of the screen; no swipe, pinch, long-press or double-tap for the patient |
| Right visual-field loss (hemianopia) can occur and disrupts reading | Left-anchored text; key content on the left; a "keep things on the left" setting; nothing critical at the right edge (caregiver-only controls may live there) |
| Most people with stroke aphasia also have reading difficulty | Never rely on reading alone: every candidate has an icon, a highlighted keyword and a **Listen** button (a quiet preview in a neutral voice) |
| Paraphasias: a similar-sounding word ("table" for "tablet") or a related one (the grandson's name for the son's) | Paraphasia-aware intent engine; "None of these" triggers reinterpretation; a personal word-substitution list learns them |
| Apraxia of speech often co-occurs; speech recognition of aphasic speech is unreliable | Touch, photo and typing are first-class; show "I heard: …"; one-tap retry; never block on speech |
| Slow initiation, fatigue, perseveration, tremor | No timeouts; generous end-of-speech detection; repeated-tap filter; big Stop; "Say again" |
| Depression and loss of dignity are common | Adult tone (never childish); own voice; the person — not the app — decides what is said |
| AAC users value AI suggestions but not words put in their mouth | Confirm-before-speak; three *different* options + "None of these"; mirror their own past phrasing |

### 1.5 Language and culture (Tamil-first)
- **Diglossia.** Formal written Tamil ("தண்ணீர் கொடுங்கள்") sounds stilted when spoken; homes speak colloquial Tamil ("தண்ணி குடுங்க"). All generated Tamil must be **spoken colloquial Tamil in Tamil script**. The same applies to Hindi (everyday Hindustani, not Sanskritised) and Telugu (spoken, not literary).
- **Code-mixing is normal** ("tablet… raathiri"). Accept input in any script or mix. Output in the chosen language's native script, keeping the family's usual English loanwords (tablet, TV, bathroom, doctor).
- **Politeness follows the addressee.** Elders, in-laws and doctors get respectful "-ங்க" forms; spouse and children are often familiar. The family decides per contact.
- **Speaker gender** changes verb forms in Hindi (थक गया / थक गई). Store it for grammar.
- **Multilingual care:** a Tamil family, a Hindi-speaking home nurse, an English-speaking doctor. The output language can **follow the addressee**, still in the person's own cloned voice.

### 1.6 What Sollu is not
Not a diagnostic or treatment device. Not a replacement for speech therapy. Not a chatbot. Never speaks on its own. Not a surveillance tool for the family. Not an emergency service.

### 1.7 Differentiation that must be demonstrably true
Indian AAC apps such as Avaz and Jellow already offer Tamil, Telugu and Hindi symbol grids, so never claim "existing aids are English-only". Sollu's real differences:
1. It completes the *intent* from one fragment instead of assembling a sentence cell by cell.
2. It uses context: time, routine, the partner's question, personal vocabulary and the person's own past sentences.
3. It speaks in the person's own voice, in the addressee's language.
4. A three-choice confirm gate.
5. Every miss becomes therapy data.
6. It is built for adults with acquired aphasia, one-handed.

---

## 2. The core loop

```
 SPEAK | TOPICS | CAMERA | TYPE              (input: whatever they can manage)
        │
        ▼
 Input Processor ──► fragment {modality, text / topic path / object label, STT alternatives}
        │
        ▼
 Context Engine ──► context packet {time (real or demo clock), place, addressee + language + register,
        │                            people, routine due now, partner's question, last turns, vocabulary,
        │                            word substitutions, own past sentences}
        ▼
 Memory fast path ("⭐ your usual")  +  Intent Engine (LLM, structured JSON, exactly 3 distinct intents)
        │                               (pain topic: deterministic templates first)
        ▼
 CONFIRM SCREEN — 3 cards + "None of these"     The person's tap on an exact sentence is the ONLY path to
        │ tap                                    the speaker (confirm screen, quick strip, phrasebook, Help)
        │                                        │ none → next round (reinterpret) → … → Topics
        ▼                                        ▼
 Voice Engine (own cloned voice, cached)      Word-struggle log
        │                                        │
        ├──► caregiver phone shows the text      ▼
        ▼                                    Therapist dashboard
 Personal memory (phrasing, routine, vocabulary, word substitutions)
```
Targets on the speech path: median first input → first audio **< 10 s**, and **2 taps** (the Speak tile, which starts recording, and one card).

---

## 3. Architecture

### 3.1 Why there is a server
The idea deck lists only client-side layers, but API keys can't ship inside a PWA. Add a thin, **stateless** Node server that:
- proxies LLM, STT, TTS and cloning calls with the keys;
- signs every sentence the cloned voice may say, and binds each voice to the device that created it (§4, I-8);
- relays end-to-end-encrypted messages between the patient's phone and caregiver phones;
- extracts audio from uploaded videos (processed transiently);
- relays Web Push alerts (M11).

It persists **no user content** (no database).

### 3.2 Repository layout (pnpm workspaces, TypeScript strict everywhere)
```
sollu/
├─ CLAUDE.md  PROGRESS.md  README.md  .env.example  Dockerfile
├─ apps/
│  ├─ web/                    React + Vite PWA (patient app, caregiver mode, /care, /therapist, /baseline)
│  │  └─ src/
│  │     ├─ app/              routes (role-based start route), layout, error boundaries
│  │     ├─ features/
│  │     │  ├─ home/  speak/  topics/  camera/  type/
│  │     │  ├─ confirm/       candidate cards, "none of these"
│  │     │  ├─ audio/         THE ONLY audio output: gate + channels (speak, preview, studio, alarm, baseline)
│  │     │  ├─ voice/         Voice Studio, TTS client + queue, audio cache
│  │     │  ├─ context/       context engine, clock service (real or demo time)
│  │     │  ├─ memory/        retrieval, "your usual", phrasebook, substitutions, learned routine
│  │     │  ├─ caregiver/     pairing, relay client, outbox, /care app
│  │     │  ├─ therapist/     dashboard, exports, study mode
│  │     │  ├─ setup/         caregiver-led onboarding, caregiver lock, settings
│  │     │  ├─ metrics/       tap tracker, attempt timer, stage overlay
│  │     │  ├─ baseline/      comparison picture board
│  │     │  └─ demo/          demo scenarios, rehearsal cache, warm-up
│  │     ├─ db/               Dexie schema + migrations
│  │     ├─ i18n/             en, ta, hi, te
│  │     ├─ ui/               design-system components (BigTile, CandidateCard, QuickStrip…)
│  │     └─ lib/              crypto, hashing, audio utils, time buckets, transliteration
│  └─ server/                 Fastify API + WebSocket relay
│     └─ src/
│        ├─ routes/           device, intent, stt, tts, sign, voice, media, relay, push, health
│        ├─ providers/        llm/ stt/ tts/ clone/  (adapters + mock)
│        ├─ prompts/          intent.system.md + few-shot JSON per language
│        ├─ relay/            rooms, grants, limits, heartbeat
│        ├─ scripts/          voices.ts (list / prune provider voices by label; dry-run by default)
│        └─ lib/              signing, validation, redacting logger, ffmpeg, rate limits
├─ packages/shared/           zod schemas + canonical phrase/template/number-word lists (single source of truth)
├─ evals/                     intent + STT evals, runners, reports
└─ docs/                      SPEC, PLAN, PROVIDERS, DECISIONS, PRIVACY, DEMO_SCRIPT, LANGUAGE_REVIEW, CLINICAL_NOTES, idea-deck.pdf
```

### 3.3 Tech choices (use current stable versions; record them in `docs/DECISIONS.md`)
- **Web:** React + Vite + TypeScript, Tailwind CSS, React Router, Zustand, Dexie (IndexedDB), vite-plugin-pwa (Workbox), i18next, Chart.js via react-chartjs-2. TensorFlow.js (`@tensorflow-models/coco-ssd`, `@tensorflow-models/mobilenet`; lazy-loaded). wavesurfer.js with the regions plugin (voice-sample trimming; lives inside the `studio` audio channel). A QR-code generator, a QR decoder (BarcodeDetector where available, else a JS decoder) and an Indic transliteration library. Self-host Noto Sans, Noto Sans Tamil, Noto Sans Devanagari and Noto Sans Telugu (woff2).
- **Server:** Node 22 LTS; Fastify with `@fastify/multipart`, `@fastify/websocket`, `@fastify/rate-limit`, `@fastify/cors`, `@fastify/helmet` and `@fastify/static`. Also zod, pino (with redaction), `ffmpeg-static` (spawned with timeouts), `@anthropic-ai/sdk`, the ElevenLabs and Sarvam SDKs or plain `fetch` (verify package names first), and `web-push` (M11).
- **Quality:** Vitest, Testing Library, Playwright (with `@axe-core/playwright` and Playwright's clock API), MSW for client-side mocks, ESLint (with the audio rules of I-2), Prettier, `tsc --noEmit`.

### 3.4 Provider matrix (all behind adapters; verify every fact in M0)
| Function | Default | Alternatives | Facts to respect (checked Sept 2026 — re-verify) |
|---|---|---|---|
| Intent LLM | Anthropic `claude-haiku-4-5-20251001` (fast) | After "None of these": `claude-sonnet-5`. Optional adapters: Gemini, OpenAI, Sarvam chat | JSON via `output_config.format = {type: "json_schema", schema}`; the older beta `output_format` is deprecated. The TS SDK has a Zod helper. The grammar doesn't enforce length or count constraints, so encode "exactly three" structurally (`c1`, `c2`, `c3`). The first request per schema compiles a grammar and is slower, so warm up at boot. Enum casing isn't guaranteed, so normalise it. Accepts images (opt-in camera fallback). |
| Speech-to-text | Sarvam `saaras` (v3 or newer; compare its `codemix` and `verbatim` modes) | ElevenLabs Scribe; OpenAI `gpt-4o-mini-transcribe` or `whisper-1` (the deck's Whisper, kept as a measured comparison); browser Web Speech API (optional English fast path) | Sarvam targets Indian languages and Tanglish; its accuracy comparisons are vendor-reported. Its synchronous REST call takes clips up to 30 s. **Pick the default by measured character error rate on your own recordings (§15.3).** |
| Voice clone + TTS | ElevenLabs Instant Voice Cloning; `eleven_flash_v2_5` (low latency; en/ta/hi), `eleven_multilingual_v2` (quality; en/ta/hi), `eleven_v3` (needed for Telugu) | Sarvam Voice Cloning: `POST /voices/create` with one clean 10–15 s clip returns a `svc-…` voice id; `POST /voices/clone` synthesises (JSON with base64 audio). 12 languages on its supported-languages page, including en-IN, ta-IN, hi-IN and te-IN; cross-lingual from one clip; built-in ASR quality check; no streaming for cloned voices; per-plan rate limits. IndicF5, self-hosted: 11 Indian languages; needs a reference clip plus its transcript; GPU; no English | Flash v2.5 and Multilingual v2 support Tamil and Hindi but **not Telugu**; Eleven v3 supports Telugu. Instant cloning needs a paid plan (from Starter, about US$5–6/month), about 1–2 minutes of clean audio and a consent confirmation. ElevenLabs keeps TTS text and audio by default (zero-retention mode is enterprise-only) but lets you delete generations through its API: delete after each synthesis, and disclose it. **Don't use Coqui XTTS-v2:** no Tamil or Telugu, and a non-commercial model licence. |
| Vision | On-device: personal-object kNN (MobileNet embeddings) → COCO-SSD (lite MobileNet v2) | Opt-in only: send the photo to the multimodal LLM | COCO-SSD knows 80 generic classes — **no tablets, pill strips, spectacles, walking sticks or idli**. The deck's own hero example ("tablets") needs the personal-object path or the LLM. |
| Caregiver link | WebSocket relay rooms on the same server (the patient's phone + up to 5 caregiver phones) | Web Push (VAPID) for background alerts, M11 | Payloads are end-to-end encrypted; the server never sees plaintext. |

### 3.5 Configuration & deployment
`.env.example` (server; never commit real values):
```
PORT=8787
PUBLIC_ORIGIN=http://localhost:5173
MOCK_PROVIDERS=1                 # auto-on when required keys are missing
SERVER_SECRET=                   # ≥ 32 random bytes; signs device tokens, utterances, voice grants and room grants
ACCESS_CODE=                     # required whenever real providers are enabled; the server refuses to start without it
ENABLED_LANGS=ta,en              # M10 adds hi,te
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
LLM_MODEL=claude-haiku-4-5-20251001
LLM_MODEL_LATER_ROUNDS=claude-sonnet-5
LLM_TIMEOUT_MS=8000
STT_PROVIDER=sarvam              # sarvam | elevenlabs | openai | mock  (final choice from §15.3)
SARVAM_API_KEY=
SARVAM_STT_MODEL=saaras:v3       # verify the current id
ELEVENLABS_API_KEY=
ELEVENLABS_DELETE_HISTORY=1      # delete each generation from ElevenLabs history after synthesis
OPENAI_API_KEY=
TTS_ROUTE_ta=elevenlabs:eleven_multilingual_v2   # or eleven_flash_v2_5 / sarvam — decided in M3
TTS_ROUTE_en=elevenlabs:eleven_flash_v2_5
TTS_ROUTE_hi=elevenlabs:eleven_flash_v2_5
TTS_ROUTE_te=elevenlabs:eleven_v3                # or sarvam
PREVIEW_VOICE=                   # neutral non-cloned stock voice for Listen, e.g. a Sarvam Tamil speaker (verify ids)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                   # the three VAPID values are for M11
```
Deployment: one Node service serves the built PWA, the API and the WebSocket relay (e.g. Render, Railway or Fly.io — WebSockets must be supported). HTTPS is mandatory, because the microphone, camera and service worker need a secure context. For phones on a local network, use a tunnel. The Dockerfile (slim Node 22 image) comes in M11. The per-device `VoiceRouting` chosen in the Voice Studio overrides the `TTS_ROUTE_*` defaults.

---

## 4. Safety & trust invariants (each has a test, §15.1)

- **I-1 Confirm before speak.** The cloned voice speaks as the person only as the direct result of the person tapping the exact sentence on their own device: a candidate card, a quick-strip button, a phrasebook item, "Say again" or Help. It never autoplays, never speaks after a timeout, is never triggered remotely (a caregiver phone can never make the patient's device speak) and never plays from a prefetch. A newer tap supersedes a pending older one; Stop cancels pending synthesis and playback.
- **I-2 One audio module.** All audio output lives in `apps/web/src/features/audio/`, which exposes five channels:
  - `speak`: the cloned voice as the person; requires a patient `tapEventId`.
  - `preview`: Listen, in a neutral non-cloned voice; requires a patient tap.
  - `studio`: caregiver mode only, for sample playback and the listening test; requires a caregiver tap.
  - `alarm`: `/care` only.
  - `baseline`: `/baseline` only, a robotic device voice.

  No other code may touch audio APIs. ESLint enforces this with `no-restricted-imports`, `no-restricted-globals` (for `Audio`, `AudioContext`, `webkitAudioContext`, `speechSynthesis` and `SpeechSynthesisUtterance`) and `no-restricted-syntax` (for `new Audio(`), all allowed only inside `features/audio/`; tests enforce it too.
- **I-3 Three distinct options + "None of these"** on every confirm screen. If fewer than three valid candidates exist (errors, offline), show what exists plus "None of these". Never pad with invented text.
- **I-4 Grounded candidates.** Candidates are guesses the person will confirm, so they may propose meanings. They must not add specifics absent from the fragment and context: medicine names, doses, numbers, times, names of people or places, or extra events. Enforced by the prompt rules, the server validator (§7.4) and the eval.
- **I-5 Unpicked candidates are never spoken.** They are logged locally for the therapist only.
- **I-6 Help works without AI and offline.** Fallback order: cached own-voice "I need help!" → device voice → alarm tone. The caregiver alert goes out when online (queued while offline, M5 full), with a visible SMS option.
- **I-7 Voice consent.** No clone without a recorded `ConsentRecord` from the voice owner (or a verified lawful guardian). Withdrawal deletes the provider voice (via its voice grant) and the local samples.
- **I-8 Voice misuse guard.** `/api/tts` synthesises only text that carries (a) a valid server signature bound to this device, language and text hash, and (b) a voice grant proving this device created that voice. Signatures are issued only for:
  - intent candidates (15 minutes);
  - memory items re-signed from a valid candidate or memory signature;
  - server-listed quick phrases, defaults, templates and studio sentences;
  - caregiver-written phrases (rate-limited).

  It is not a say-anything API for third parties. Custom phrases are an owner capability: document it, don't hide it.
- **I-9 Data minimisation.** Personal data at rest lives only on the device. The server stores nothing and logs no content — only route, status, latency, provider, model and token counts. Place is sent as a label ("home"), never GPS. Uploads for audio extraction are processed in a temp directory and deleted immediately.
- **I-10 Accessible by construction.** Every patient-facing target is ≥ 72×72 CSS px, including Listen, Start over and "They asked…"; primary tiles are ≥ 120 px tall. Icon + word on every control; no gestures required; no time limits. Patient text contrast ≥ 7:1 (≥ 4.5:1 for large text).

---

## 5. Data model (device, Dexie/IndexedDB) — write as zod schemas in `packages/shared`, infer the types

```ts
type Lang = 'ta' | 'en' | 'hi' | 'te';
type TopicId = 'medicine'|'food'|'drink'|'toilet'|'pain'|'people'|'feelings'|'rest'|'tv_phone'|'prayer'|'go_out';

Profile          { id:'me'; preferredName; speakerGender:'female'|'male'|'unspecified';
                   primaryLang:Lang; otherLangs:Lang[]; dialectNote?; uiLang:Lang; dualLabels:boolean;
                   hand:'left'|'right' /*left*/; keepLeft:boolean; textScale:1|1.25|1.5;
                   gridSize:4|6|9 /*4*/; tapFilterMs:number /*400*/; twoStepConfirm:boolean /*false*/;
                   previewEnabled:boolean /*true*/; volumeBoostDb:0|3|6; prefetchAudio:'all'|'first'|'none' /*first*/;
                   showGloss:boolean; cloudVisionConsent:boolean /*false*/; createdAt }
Contact          { id; name; aliases:string[] /* other spellings, scripts, nicknames — never generic words like "doctor" */;
                   relation; photo?:Blob; register:'respectful'|'familiar'; lang?:Lang; phone?; isCaregiver:boolean }
Place            { id; label:'home'|'hospital'|'clinic'|'other'; name?; lat?; lon?; radiusM? }   // coords never leave the device
RoutineItem      { id; label; topic:TopicId; time:'HH:MM'; days:number[]; source:'caregiver'|'learned'; confirmed:boolean }  // no doses, ever
VocabItem        { id; term; kind:'person'|'food'|'drink'|'medicine_nickname'|'place'|'object'|'activity'|'show'|'other';
                   meaning?; lang?; source:'caregiver'|'suggested'; confirmed:boolean }
WordSubstitution { id; heard; means; count; lastAt }             // learned paraphasias: "table" → "tablet"
PersonalObject   { id; name; hint?; embeddings:ArrayBuffer[]; thumb:Blob; createdAt }
Phrase           { id; text; lang:Lang; topic?:TopicId; icon; source:'default'|'quick'|'template'|'caregiver'|'promoted';
                   sig; uses; pinned:boolean }
MemoryEntry      { id; fragmentRaw; fragmentKey; reading; sentence; lang; addresseeId?; timeBucket; placeLabel;
                   count; firstAt; lastAt; sig }
Attempt          { see §12.1 }
AudioCache       { key /* sha256(provider|voiceId|model|lang|NFC(text)) */; blob; bytes; lastUsedAt }   // LRU, cap 150 MB
VoiceProfile     { id; provider:'elevenlabs'|'sarvam'; voiceId; voiceGrant; providerLabel; langs:Lang[];
                   source:'own_pre_stroke'|'own_current'|'donor'|'stock'; consentId; similarityRating?; createdAt }
VoiceRouting     { lang:Lang; voiceProfileId; model? }           // chosen per language by listening test + latency
ConsentRecord    { id; kind:'app_use'|'voice_clone'|'keep_samples'|'cloud_vision'|'study';
                   givenBy:'self'|'self_supported'|'lawful_guardian'|'voice_donor'; name; relation?; helper?;
                   method; guardianReference?; at; withdrawnAt? }
OutboxItem       { id; message; createdAt; attempts }             // relay messages waiting for a connection (M5 full)
KV               { key; value }  // device token; role ('patient'|'care'); relay room id, grant and key; caregiver PIN hash;
                                 // demo clock; caregiver push subscriptions (M11); feature flags
```
Call `navigator.storage.persist()` during setup so the browser doesn't evict IndexedDB. Encrypted backup/restore uses a passphrase → PBKDF2 → AES-GCM. It includes everything except the audio cache, so voice profiles, grants and consents survive a phone change.

---

## 6. Context Engine (`features/context`)

Builds the packet sent with every intent request. Keep it small (target < 1.5k tokens).

```ts
ContextPacket {
  now: { localTime:'HH:MM'; weekday; timeBucket:'early_morning'|'morning'|'midday'|'afternoon'|'evening'|'night'|'late_night' };
  place: 'home'|'hospital'|'clinic'|'outside'|'other';                 // label only
  speaker: { preferredName; gender; dialectNote? };
  addressee?: { name; relation; register:'respectful'|'familiar' };     // default: last addressee within 30 min, else none
  outputLang: Lang;                     // addressee.lang if enabled, else profile.primaryLang (override on the confirm screen)
  inputLangHints: Lang[];
  people: { name; relation; aliases }[];                                // ≤ 10 contacts, so names in fragments are understood
  routine: { dueNow:{label;topic;time;learned:boolean}[]; justPassed:{label;topic;time;learned:boolean}[] };  // −45…+45 min
  partnerQuestion?: { text; lang; minutesAgo };                         // from the caregiver app or "They asked…"; valid 5 min
  recentTurns: { speaker:'person'|'partner'; text; minutesAgo }[];      // last 3 within 10 min
  vocabulary: { term; kind; meaning? }[];                               // ≤ 20: fragment matches first, then most used
  substitutions: { heard; means; count }[];                             // relevant to the fragment, count ≥ 2
  ownExamples: { fragment; sentence; timeBucket }[];                    // ≤ 5 from memory retrieval (§11)
  fragment: { modality:'speech'|'text'|'topic'|'camera'; raw; sttAlternatives?; topicPath?; objectLabel?;
              objectSource?:'personal'|'coco'|'llm' };
  round: 1|2|3; exclude: string[];                                      // earlier candidate texts in this attempt
}
```
- **Time buckets:** 04–07 early_morning, 07–11 morning, 11–14 midday, 14–17 afternoon, 17–20 evening, 20–23 night, 23–04 late_night.
- **Place:** a manual toggle set by the caregiver, optionally auto-set by a "home" geofence evaluated on-device.
- **Clock service:** `clock.now()` returns real time unless a caregiver sets a **demo time** in caregiver mode, from which the clock then runs forward. While demo time is on, the patient UI shows a visible "Demo time 20:58" badge, and attempts are logged with `demoClock: true`. E2E tests use Playwright's clock.

---

## 7. Intent Engine (`server/routes/intent`, `server/prompts`)

### 7.1 API
`POST /api/intent` — body `{ context: ContextPacket, image?: base64 JPEG ≤ 512 px (only when cloudVisionConsent) }` →
```ts
{ candidates: Candidate[],                     // ≤ 3, flattened from c1..c3 after validation
  model: string, latencyMs: number }
Candidate { text; reading; gloss_en; intent; keyword; icon; urgency:'none'|'elevated'|'emergency'; sig }
```
`sig` is the self-contained signature of §7.4 and carries its own expiry.

### 7.2 Output schema given to the LLM (structured outputs)
```json
{ "type": "object", "additionalProperties": false,
  "required": ["c1", "c2", "c3"],
  "properties": {
    "c1": { "$ref": "#/$defs/cand" }, "c2": { "$ref": "#/$defs/cand" }, "c3": { "$ref": "#/$defs/cand" } },
  "$defs": { "cand": { "type": "object", "additionalProperties": false,
    "required": ["text", "reading", "gloss_en", "intent", "keyword", "icon", "urgency"],
    "properties": {
      "text": { "type": "string" }, "reading": { "type": "string" }, "gloss_en": { "type": "string" },
      "intent": { "type": "string" }, "keyword": { "type": "string" }, "icon": { "type": "string" },
      "urgency": { "type": "string", "enum": ["none", "elevated", "emergency"] } } } } }
```
If `$ref`/`$defs` isn't supported by the provider's schema subset, inline the candidate object three times (check the docs).

### 7.3 System prompt (`prompts/intent.system.md`; `{{…}}` filled per request)
```
You are the intent engine inside Sollu, a communication aid for an adult living with aphasia after a stroke.

The person knows what they want to say but can only produce a fragment: one or two words (sometimes the wrong word, or mispronounced), a tap on a topic, a photo of an object, or a few typed letters. You receive the fragment and context about their day. Propose the three most likely COMPLETE things they want to say. They pick one with a single tap and it is spoken aloud in their own voice, as if they said it. Nothing you write is spoken unless they choose it.

RULES
1. Speak AS the person: first person, to the addressee. Never describe the person ("She wants…") and never address them.
2. Three candidates = three DIFFERENT intents, most likely first. Never three rewordings of one idea. Slot 1: the most literal reading supported by the context. Slots 2–3: the next most plausible different needs — a question instead of a request, a problem to report, a refusal, another object.
3. Candidates are guesses the person will confirm, so propose meanings freely — but never add specifics that are not in the fragment or context: medicine names, doses, numbers, times, names of people or places, or extra events. Use a person's name only if it appears in the fragment, the addressee, the partner's question, recent turns or the person's own examples; context.people tells you who those people are. Prefer the simplest sentence that expresses the need. If a detail is uncertain, leave it out or ask it as a question ("Did I take my night tablet?").
4. Short and natural: one sentence (at most two very short ones), roughly 3–10 words, the way people talk at home. No emoji, quotes or brackets inside "text".
5. Language: write "text" in {{outputLangName}}, native script, everyday SPOKEN form — not formal written language. {{registerNotes}} Keep English loanwords the family uses (tablet, TV, bathroom, doctor, phone).
6. Politeness: {{addresseeLine}}
7. Grammar must match the speaker: {{speakerLine}}
8. Aphasia awareness: the fragment may contain a similar-sounding wrong word, a related word from the same category, part of a word, repetitions or fillers. If the literal reading does not fit the context, use the likely intended word. Known substitutions for this person are in context.substitutions — trust them.
9. Use the context actively: routine items due now, time of day, place, the partner's question (answer it directly), recent turns, vocabulary, and the person's own past sentences (reuse their words and phrasing when they fit).
10. Safety: set "urgency" to "emergency" for chest pain, trouble breathing, a fall, new weakness or numbness, a sudden change in speech or vision, or feeling very unwell; to "elevated" for pain described as a lot or worse, or discomfort that needs attention soon; otherwise "none". When urgency is not "none", make one candidate a clear request for help. Never give medical advice.
11. Fields: "reading" = what this candidate takes the fragment to mean, in 1–4 plain English words (e.g. "night tablet"); if it assumes a different word than the one heard, write "heard → meant" (e.g. "table → tablet"). "keyword" = copy exactly one word from "text", the word that carries the meaning. "gloss_en" = plain English meaning for the caregiver. "intent" = a 2–5 word English label. "icon" = one emoji.
12. This is round {{round}}. {{roundNote}}
```
Fill-ins:
- `registerNotes`:
  - **ta:** "Use spoken Tamil (பேச்சுத் தமிழ்): 'தண்ணி குடுங்க' not 'தண்ணீர் கொடுங்கள்', 'வேணும்' not 'வேண்டும்', 'போகணும்' not 'போக வேண்டும்'. {dialectNote}"
  - **hi:** "Everyday Hindustani as spoken at home ('दवाई', 'टाइम'), not Sanskritised formal Hindi."
  - **te:** "Everyday spoken Telugu as used at home, not the formal literary style."
  - **en:** "Simple Indian English as spoken at home."
- `addresseeLine`: "The person is talking to {name} ({relation}); use {respectful|familiar} forms." or "Addressee unknown; use polite neutral forms."
- `speakerLine`: "the speaker is {female|male}; use matching forms wherever the language marks gender (e.g. Hindi 'थक गई हूँ' vs 'थक गया हूँ')." or "gender unspecified; prefer constructions that avoid gender marking."
- `roundNote`: empty in round 1. From round 2: "The person rejected the candidates listed in context.exclude. Do not repeat or rephrase them. Reinterpret the fragment: another likely intended word (paraphasia), another need, or a broader request."
- Add the few-shot examples of Appendix D as prior user/assistant turns (the assistant turns are the JSON). Use prompt caching for the static prefix if it meets the model's minimum cacheable length.

### 7.4 Server-side validation, signing & timing (never trust the model blindly)
1. Parse with zod. Normalise `urgency` case. Trim `text`; strip quotes, emoji and brackets; NFC-normalise.
2. `keyword` must appear in `text`; otherwise use the longest content word. `reading` must be ≤ 40 characters, and if it contains "→", both sides must be non-empty.
3. Drop — don't rewrite — a candidate if any of these hold:
   - `text` is longer than 90 characters.
   - It duplicates another candidate (normalised text, or a near-identical `intent`).
   - It contains digits in any script (0–9, ௦–௯, ०–९, ౦–౯), number words from the per-language list in `packages/shared` (two and above, plus "half"; not the article-like "one": ஒரு, एक, ఒక), or dose units — unless the same number appears in the fragment or context.
   - It contains a name or alias from `context.people` that doesn't appear in the fragment, addressee, partner question, recent turns or own examples.

   The eval judge catches invented names outside the contact list.
4. If fewer than three candidates remain: retry once with a short correction note, then return whatever is valid (I-3).
5. Sign each valid candidate (source `candidate`, 15 minutes).
6. Time out after `LLM_TIMEOUT_MS` (8 s). On timeout or error, return `503 {fallback:true}`; the client shows memory and phrasebook matches for the fragment's topic (the offline path).
7. Model routing: round 1 uses `LLM_MODEL`; any call after a "None of these" uses `LLM_MODEL_LATER_ROUNDS`. Warm each language's schema grammar at start-up (skipped in mock mode).
8. Log only route, status, latency, model, token usage and validation-drop counts — never text.
9. If measured round-1 p50 exceeds 3 s, stream the response instead: validate and sign each candidate as its object completes, and push it to the client over server-sent events (c1 first).

**Signature format (all utterance signatures):** `sig = base64url(JSON.stringify({d, l, h, s, e})) + "." + base64url(HMAC_SHA256(SERVER_SECRET, <first part>))`, where:
- `d` = device id;
- `l` = language;
- `h` = SHA-256 of the NFC-normalised text;
- `s` = source: `candidate`, `memory`, `quick`, `default`, `template`, `studio` or `caregiver`;
- `e` = expiry in Unix seconds.

`/api/tts` recomputes `h` from the text it receives, and checks `d` against the device token, and checks `l` and `e`. Lifetimes: `candidate` 15 minutes; all others 365 days, renewed through `/api/sign` when fewer than 30 days remain.

### 7.5 Memory fast path ("⭐ Your usual")
Client-side, while the server call is in flight: if memory retrieval (§11) finds an entry above the threshold with `count ≥ 2` in the same time bucket, show it immediately as card 1 with a ⭐ badge. Its audio is usually cached, so it speaks almost instantly. When the LLM answers, fill cards 2–3 with the best non-duplicate LLM candidates. There is always one confirm screen with at most three cards.

### 7.6 Other server endpoints
All endpoints are zod-validated. All except `device/register`, `health` and the relay (which uses room grants) require the device token as `Authorization: Bearer <token>`.

| Endpoint | Purpose |
|---|---|
| `POST /api/device/register {accessCode}` | Returns `{deviceId, token}` (signed, long-lived). The access code is required whenever real providers are enabled. |
| `POST /api/sign {text, lang, source, proofSig?}` | Issues a long-lived signature. Source `memory`: only with a valid `candidate` or `memory` signature for the same text and language as `proofSig`. Sources `quick`, `default`, `template` and `studio`: only for texts in the canonical lists in `packages/shared`. Source `caregiver` (custom phrases the family writes): any text, limited to 30 per device per day. |
| `POST /api/stt` | Speech clip (≤ 5 MB, ≤ 30 s) → `{text, lang, alternatives[]}` (§8.1). |
| `POST /api/tts {text, lang, sig, voiceGrant}` | Returns `audio/mpeg` in the cloned voice named by the grant (§10.2). For Listen previews, send `{text, lang, sig, preview: true}` instead; the server uses the neutral `PREVIEW_VOICE`. |
| `POST /api/media/extract` | Uploaded audio or video (≤ 50 MB) → mono WAV via ffmpeg. 60 s timeout; processed in a temp directory and deleted immediately. |
| `POST /api/voice/isolate` | Provider audio isolation of a clip. The clip goes to the provider, which is disclosed. |
| `POST /api/voice/clone` | Curated clip(s) + provider + languages + a consent summary (who, how, when) → `{provider, voiceId, voiceGrant}`. The provider voice is labelled `sollu-<first 8 chars of deviceId>-<yyyymmdd>` so it can be found later. |
| `DELETE /api/voice {voiceGrant}` | Deletes the voice at the provider (consent withdrawal). |
| `POST /api/relay/room` | Returns `{roomId, roomGrant}` for pairing caregiver phones (§12.2). |
| `POST /api/push {subscriptions[], payload}` | M11: sends Web Push to caregiver subscriptions held by the patient device; stores nothing. |
| `GET /api/health` | Status, and which providers are live or mocked (no secrets). |
| `GET /ws?r=<roomId>&g=<roomGrant>&role=<patient or care>` | The caregiver relay. Browsers can't set headers on WebSockets, so the grant travels in the query string. |

- **Voice grant:** a signature over `{deviceId, provider, voiceId}`. `/api/tts` and `DELETE /api/voice` accept a grant only from the device named in it. Voice ids never come from the client on their own.
- **Rate limits** (per device, per route): intent 30/min · stt 30/min · tts 90/min · sign 60/min (caregiver source 30/day) · voice clone 5/hour · media 10/hour · relay 10 connections/min per IP. Return 429 with `Retry-After`.
- **Admin script** (`pnpm voices:list`, `pnpm voices:prune`): lists provider voices by their `sollu-` label and deletes orphans. It is a dry run by default; deleting needs the human's explicit confirmation.

---

## 8. Input Processor

### 8.1 Speak (`features/speak`)
- Tapping the Speak tile **starts recording immediately** — there is no second start button — so the speech path stays at two taps. Record with MediaRecorder (webm/opus on Android; mp4/aac on iOS). Show a large level meter; a **Done** button is available but optional.
- Generous end-pointing: stop after 3 s of silence once speech has begun, at 15 s, or on Done (the silence setting ranges 2–6 s). Never cut off during a pause inside a word.
- `POST /api/stt` (audio + `langHints`) → `{text, lang, alternatives[]}`; the server routes to the configured provider.
- The confirm screen shows "I heard: …" with a one-tap "That's not it — try again" and switches to Type or Topics. An empty transcript leads to a friendly retry screen offering the other inputs.
- Optional provider `browser` (Web Speech API, feature-detected) gives instant English interim results; disclose that the audio goes to the browser vendor.
- **"They asked…" mic** (72 px, on Home): a partner in the room speaks their question into the patient's phone → STT → `partnerQuestion` (valid 5 minutes), shown as a banner.

### 8.2 Topics (`features/topics`)
- A grid of `gridSize` topic tiles per page (default 4 — the deck's rule), ordered by context: topics of routine items due now first, then topics most used in this time bucket, then the Appendix A order. A "More topics ›" bar (72 px) pages through the rest. Tapping a topic sends an intent request with `topicPath`.
- **Pain** is a short guided flow:
  1. Body-part tiles (icon + word).
  2. Side, only for paired parts: two large buttons labelled இடது / வலது and Left / Right, each with an arrow toward the person's own side.
  3. Round 1 is the three deterministic templates of Appendix B, one per intensity — no LLM, and it works offline.
  4. "None of these" → round 2 from the LLM.

  In M7, an SVG body map replaces the tiles. It is drawn as the person's own body seen from behind, so their left is on screen-left, with side labels.
- **People** → contact photos → an intent request with the chosen person in `topicPath`. **Food / Drink** → vocabulary and default item tiles → an intent request.
- Offline: pain templates; phrasebook items for the other topics.

### 8.3 Camera (`features/camera`)
- Rear-camera preview + a big shutter. After capture, try in order:
  1. Personal-object kNN (cosine similarity on MobileNet embeddings; accept ≥ 0.80, then tune on real photos).
  2. COCO-SSD (lite) with a relevance whitelist mapped to concepts: bottle/cup → drink; bowl/banana/apple/orange/sandwich → food; bed/couch/chair → rest; toilet/sink/toothbrush → toilet & bath; tv/remote → TV; cell phone → phone; book → reading; clock → time. Ignore `person`.
  3. Only when `cloudVisionConsent` is on and the person taps "Ask AI what this is": send a ≤ 512 px JPEG with the intent request.
- Show the label as a chip ("I see: bottle"). Lazy-load TF.js on first camera use, and cache the model files through the service worker.

### 8.4 Type (`features/type`)
- A large input. Above the keyboard, chips from the vocabulary and contacts (names, foods, places) filter as the person types; accept 1–3 letters ("meen ph"). "Go" sends the intent request.

---

## 9. Confirm Screen (`features/confirm`) — the heart of the product

- **Header:** the fragment as understood ("I heard: tablet raathiri" / "Photo: bottle" / "Pain › left shoulder"). An addressee chip ("To: Priya 👩") — tapping it changes the addressee and re-runs with the new language and register. An output-language chip.
- **Three cards,** stacked, full width, ordered by likelihood. Each card has:
  - a large emoji icon at the leading (left) edge;
  - the sentence (26–32 px, left-aligned), with `keyword` bold and highlighted;
  - the English `gloss_en` underneath, only if `showGloss` is on.

  Next to each card is a separate, visually distinct **👂 Listen** button (72 px, outlined, 12 px gap). It plays a quiet preview through the `preview` channel: the device's own voice for that language if it has one, else the neutral `PREVIEW_VOICE` — never the cloned voice — so listeners can tell "the app reading to me" from "me speaking".
- **Tap the card → speak.** On the speech path that is 2 taps in all. With `twoStepConfirm` on, the tap selects the card (thick outline) and a big "Say it" button appears at the bottom.
- **Urgency styling:** `elevated` → amber border; `emergency` → red border, and speaking that card also sends a `help` alert to the caregiver phones.
- **Below the cards:** **"None of these"** (full width) → the next round (excludes earlier texts; stronger model). After round 3, offer Topics with the fragment kept, and log a struggle. **Start over** (72 px, top-left). No timeouts. Skeleton cards show while loading; "⭐ your usual" may appear first (§7.5).
- **Speaking screen:** the chosen sentence, large; an animated waveform; a big **Stop**. Then **Say again** (replays cached audio — no new request), **Louder** (+3/+6 dB via the gain node) and **Done**. The status line "Shown on Priya's phone ✓" appears only after that phone's `delivered` receipt (§12.2).
- **Prefetch:** when cards render, synthesise audio in the background per `prefetchAudio` (default `first`; stage mode uses `all`). Synthesis isn't playback, and a finished prefetch never plays on its own (I-1).

---

## 10. Voice Engine (`features/voice`; server routes `voice`, `tts`, `media`)

### 10.1 Voice Studio (caregiver mode), step by step
1. **Consent** (§13.3): whose voice it is — the person (preferred), a consenting family "voice donor", or a stock voice — how consent was given, and acknowledgement of the provider's terms. Stored as a `ConsentRecord`.
2. **Source:** upload recordings or videos (family WhatsApp videos are typical: mp4, m4a, opus, wav, mp3; multiple files allowed), **or** record now (read-aloud prompts in their language — also usable for voice banking by people at high stroke risk), **or** pick a stock voice.
3. **Extract & clean:** `POST /api/media/extract` (ffmpeg → mono WAV) and optional `POST /api/voice/isolate` (provider audio isolation). Before/after players on the `studio` channel.
4. **Select only the person's own speech:** a waveform with draggable regions, showing the total selected time. ElevenLabs target: 60–120 s. Sarvam needs one clean 10–15 s clip: auto-suggest the cleanest region (steady RMS, no clipping) and let the family confirm.
5. **Quality checks:** duration, clipping %, loudness, noise floor, and a "one speaker only" reminder. Block below minimums, with clear advice.
6. **Create clones:** ElevenLabs IVC and/or Sarvam → `{voiceId, voiceGrant}`. The voice is labelled at the provider (§7.6), and temp files are deleted.
7. **Listening test:** synthesise the canonical `studio` sentences for each language with each clone, on the `studio` channel. The family rates "sounds like them" from 1 to 5; that rating, together with measured latency, sets `VoiceRouting` per language (e.g. Tamil → Sarvam, English → ElevenLabs flash). This is an emotional moment — gentle copy, easy to pause.
8. **Pre-generate** into the audio cache, all signed via `/api/sign` with their canonical sources: the quick strip; default and "About me" phrases; the most common pain templates (head, chest, stomach, back, and left/right shoulder, arm and leg, × three intensities). Other templates are cached on first use.
9. **Manage:** re-test, switch routing, delete the voice (I-7), keep or delete the curated samples (`keep_samples` consent).

**[H] cut:** consent → upload or record one clip → extract → trim with start/end sliders → duration and clipping check → ElevenLabs IVC → a one-sentence listening test for Tamil and English → pre-generate the quick strip → delete voice. Isolation, the waveform editor, Sarvam and per-language routing come after the hackathon.

### 10.2 TTS path
- **Client:** `audio.speak({text, lang, sig, tapEventId})` requires a `tapEventId` minted within the last 1500 ms by a trusted (`event.isTrusted`) pointer-up handler on an allowed patient control. It checks the audio cache; otherwise it asks the TTS queue for `POST /api/tts {text, lang, sig, voiceGrant}`. It plays through one Web Audio graph (a gain node for Louder), caches the result and records `firstAudioMs`.
- **TTS queue:** concurrency 2; priority tapped > first card > other cards > pre-generation; honours 429 `Retry-After`; every request is abortable. A newer tap supersedes a pending older one. Stop or Start over aborts everything pending. A completed prefetch only fills the cache.
- **Server:** verify the device token, `sig` and `voiceGrant` (I-8) → call the provider → return the audio. If `ELEVENLABS_DELETE_HISTORY=1`, then delete that generation from ElevenLabs history (verify how to identify it, e.g. a response header or the history list for the voice).
- **Fallback chain:** cloned voice → (network or provider error) the device voice for that language, if any, with a small "device voice" badge → a big-text "Show to person" card. Never fail silently.
- **Latency targets (§15.4):** cached or prefetched ≤ 0.3 s from tap to sound; uncached p50 ≤ 1.5 s. If uncached p50 is above that, compare `eleven_flash_v2_5`, then consider streaming (MSE).

---

## 11. Personal memory & learning (`features/memory`)

- **On confirm:** upsert a `MemoryEntry` keyed by (normalised fragment key ⊕ normalised `reading` of the chosen card, sentence), and increment `count`. Exchange the candidate signature for a long-lived one (`/api/sign`, source `memory`, `proofSig` = the candidate's `sig`). The English `reading` is the cross-script key (for readings with "→", use the part after the arrow), so "raathiri tablet", "ராத்திரி மாத்திரை" and "night tablet" meet.
- **Retrieval score:** `3·exactKey + 2·tokenJaccard + 1·sameTimeBucket + 0.5·ln(1+count) + recency (14-day half-life)`, computed over raw tokens, romanised tokens (Indic → Latin transliteration) and reading tokens. The top 5 go to `ownExamples`; the top 1 becomes "⭐ your usual" when it clears a threshold tuned on the eval set.
- **Word substitutions:** when the chosen card's `reading` has the form "heard → meant", upsert a `WordSubstitution`. From 2 confirmations it is sent in context. The therapist sees these ("often says 'table' for 'tablet'").
- **Learned routine:** if the same reading or intent is confirmed on ≥ 3 of the last 7 days, each time within ±45 minutes of a similar time, propose a `learned` `RoutineItem` in caregiver mode (label from the gloss, time = median). Once confirmed, it joins `context.routine` like any other item, flagged `learned`.
- **Vocabulary suggestions:** words that recur (≥ 3 times) in confirmed sentences or fragments but aren't in the vocabulary — typically names, foods and objects — are suggested for the vocabulary in caregiver mode.
- **Phrasebook auto-promotion:** a sentence confirmed ≥ 3 times in 14 days is suggested for pinning in caregiver mode. Caregivers can add (source `caregiver`), edit, pin and delete phrases.
- **Forgetting:** caregivers can delete any memory item; "Delete everything" wipes all stores.

---

## 12. Word-struggle log, caregiver link, Help, therapist dashboard

### 12.1 Attempt log (the word-struggle log)
```ts
Attempt { id; startedAt; endedAt; outcome:'spoken'|'abandoned'|'topics_fallback';
  modality; fragmentRaw; sttText?; sttRetries; topicPath?; objectLabel?; objectSource?;
  addresseeRelation?; outputLang; place; timeBucket; demoClock:boolean;
  rounds: { round; source:'llm'|'template'|'memory'; model?; latencyMs;
            candidates:{text;reading;gloss_en;intent;urgency}[]; chosenIndex?:0|1|2;
            noneOfThese:boolean; usualShown:boolean; usualChosen:boolean }[];
  chosenText?; chosenGloss?; chosenIntent?; chosenReading?; taps; timeToSpeechMs?; firstAudioMs?;
  offline:boolean; demoCached:boolean }
```
A **struggle** is an attempt with ≥ 1 "none of these", `sttRetries ≥ 1`, `outcome ≠ 'spoken'`, or `timeToSpeechMs > 30 000`. Keep attempts for 180 days (configurable). Raw audio is not stored.

### 12.2 Caregiver link (`features/caregiver`, route `/care`)
- **Pairing:** caregiver mode → "Link a phone" → `POST /api/relay/room` → `{roomId, roomGrant}`. The device creates a 256-bit AES-GCM key, and the QR encodes `${ORIGIN}/care#r=<roomId>&g=<roomGrant>&k=<key>&c=<contactId>`. Everything after `#` stays in the browser; only `r` and `g` are later sent to the relay, never `k`. Up to 5 caregiver phones per room. Unlinking creates a new room and key.
- **Roles:** a device that opens a pairing link stores `role = care`, and the start route `/` sends caregiver devices to `/care`, so an installed copy opens the right screen. `/care` works in an ordinary browser tab; installing it is optional. On iOS, an installed web app has storage separate from Safari, so `/care` includes a QR scanner and the installed copy pairs itself (M5 full).
- **Relay:** `wss://…/ws?r=<roomId>&g=<roomGrant>&role=…`. The server checks the grant, keeps an in-memory `Map<roomId, Set<socket>>` (max 6 sockets), relays opaque encrypted frames ≤ 16 KB, pings every 30 s and stores nothing.
- **Messages** (encrypted JSON; every message has `id`, `type`, `at` and `from {role, contactId?}`):
  - `spoken {text, gloss_en, lang, urgency}`
  - `help` and `help_cancel`
  - `delivered {refId}` — sent automatically by each caregiver phone on receipt
  - `ack {refId}` — "I'm coming"
  - `ask {text, lang}` — a partner question
  - `presence {name}`

  Text only: caregiver phones never play the cloned voice.
- **Outbox (M5 full):** messages created while disconnected wait in `OutboxItem` and go out on reconnect with their original `at`; `/care` marks late ones ("sent 6 min ago"). In the [H] cut, if the relay is unreachable the patient screen says "Not sent — no internet" and offers SMS.
- **/care page:** the latest sentence, huge, with its English meaning; today's feed; and "Ask a question" (type or speak → `ask`). An **"Enable alerts"** button the caregiver taps once: it unlocks audio, requests a Screen Wake Lock and, in M11, notification permission. Until Web Push (M11), an honest banner says "Keep this page open to receive alerts". On `help`: a full-screen alarm through the `alarm` channel, vibration where supported (not on iOS), and an "I'm coming" button (→ `ack`). The patient's screen then shows "Karthik is coming ✓" with his photo.
- **Help button:** on the quick strip; leftmost in left-hand and keep-left modes; at least 16 px from its neighbours. It speaks the cached "I need help!" in the person's voice (with the I-6 fallbacks), sends `help` and vibrates. The Help screen then shows:
  - a big **Send SMS** button: an `sms:` link to the first caregiver with a prefilled message. It works without internet; the person still taps Send.
  - an **"It was a mistake"** button (→ `help_cancel`).
  - the line "Sollu is not an emergency service. In an emergency call 112."
- **Web Push (M11, before any pilot):** each caregiver phone sends its push subscription to the patient device over the encrypted relay. The patient device keeps it and, on Help or an emergency card, calls `POST /api/push`, which forwards encrypted payloads to the browsers' push services and stores nothing.

### 12.3 Therapist dashboard (`/therapist`)
It sits behind the caregiver lock, or runs on the therapist's own laptop by importing an export file. The data never goes to a server. Pure, unit-tested metric functions over `Attempt[]` for a date range:
- Attempts/day; success rate (spoken ÷ attempts); **first-round hit rate** (chosen in round 1 ÷ spoken); chosen-card position (1/2/3); "none" rate; median and p90 time-to-speech; median taps; modality mix; offline share.
- **Struggle heatmap** (hour × weekday; a CSS grid is fine); **struggled concepts** (concept = the chosen intent after a struggle; count; typical time; example fragments); **word substitutions**; **rejected candidate sets**.
- Exports:
  - full JSON, encrypted with a passphrase and imported on the therapist's device with it;
  - CSV (one flattened row per attempt), which defaults to study mode and warns that anyone who gets the file can read it;
  - a printable summary (print CSS).

  **Study mode:** a pseudonymous participant ID; contact names replaced by relations; optional removal of raw fragments.
- Wording: "communication log", never "assessment" or "diagnosis".
- **Therapist-lite** (M6[H]) shows today's attempts, the struggle list, the "none of these" count, one Chart.js chart (struggles by hour) and a CSV export.

---

## 13. Setup, settings, consent, privacy

### 13.1 Caregiver-led onboarding (≈ 10 minutes, resumable)
The steps, in order:
1. Welcome ("Say it. In your words. In your voice.").
2. Language(s).
3. The person: preferred name, gender for grammar, dialect note.
4. Hand and vision settings (left hand by default; keep-left).
5. People: name, aliases, relation, photo, respectful/familiar, language, caregiver or not.
6. Places: home and hospital, with an optional home geofence.
7. Routine: label + time + topic — *no doses*.
8. Vocabulary: foods, drinks, shows, places, pets, and medicine nicknames without doses.
9. Personal objects (M8).
10. Voice Studio (M3).
11. Link caregiver phones.
12. Consent summary.
13. A **practice run** with the person: three guided attempts.

In the [H] build, the seed in Appendix E creates the demo family in one click (`/setup?demo=1`); the full onboarding UI comes in M7.

### 13.2 Caregiver lock
Settings, including the demo clock, sit behind a gear at the top-right — deliberately outside the patient's primary field. Opening them needs a 2-second press **and** a 4-digit PIN (stored hashed). The patient UI never shows settings.

### 13.3 Consent — aphasia-friendly
- Short sentences + pictures + a Listen button for each point, with family present. The person answers with big 👍 / 👎. Recorded as `self` or `self_supported` (with who helped). Withdrawal is one screen, and it triggers deletion of the provider voice, samples and memory, as chosen.
- Aphasia is not incapacity. A **lawful guardian** may consent only if the person cannot decide even with support. Record the guardian's name and the appointing authority or reference. India's DPDP Rules 2025 (Rule 11) require the data fiduciary to verify such guardianship; the pilot clinic does the verifying, and the app records it.
- Consents are separate for app use, voice cloning, keeping samples, cloud vision and study participation.

### 13.4 Privacy screen (plain language + a table)
**What stays on this phone:** profile, people, routine, vocabulary, memory, the attempt log, the audio cache, consents.

**What leaves it, to whom, and why:**
- The context packet for each request → the LLM provider, to propose sentences.
- Speech clips → the STT provider.
- Sentence text → the TTS provider, including prefetched candidates the person never chose. ElevenLabs keeps generations by default; Sollu deletes them after synthesis.
- Voice samples → the cloning provider, which stores the voice in the Sollu team's account, labelled for this device, until consent is withdrawn.
- Uploaded recordings and videos → the Sollu server, only to extract audio (deleted immediately); and → the provider when noise isolation is used.
- Photos → the LLM provider, only if cloud vision is switched on.
- Caregiver messages → end-to-end encrypted through the Sollu server, which can't read them. With Web Push (M11), alerts also pass, encrypted, through the browser makers' push services.

Summarise each provider's retention and training-use terms (from `docs/PROVIDERS.md`) in plain words. Buttons: export all (encrypted), delete voice, delete everything.

### 13.5 Compliance notes (write `docs/PRIVACY.md`)
India's DPDP Act 2023 and DPDP Rules 2025 apply. The Rules were notified in November 2025, and most notice, consent and security duties apply 18 months after notification. Build to comply now: itemised notice, purpose-specific consent, easy withdrawal, erasure, a grievance contact, breach readiness, no data sale. Position Sollu as a communication aid, not a medical device, and make no clinical claims. Record in `docs/PRIVACY.md` that the deck's line "only the fragment and context packet leave the device" is corrected by §13.4. Pictograms: if you ever add ARASAAC symbols, they are CC BY-NC-SA (attribution, non-commercial); default to emoji/Noto.

---

## 14. UI/UX specification

### 14.1 Screens (patient-facing)
1. **Home:** 2×2 big tiles — the deck's four big targets: 🎤 Speak (starts recording at once) · 🗂️ Topics · 📷 Camera · ⌨️ Type. Each has an icon + word in the UI language, with optional dual labels. Top-left: the addressee chip. A banner appears when a partner question is active ("Priya asked: …"). The bottom **quick strip** is **Help** (deep red) · Yes · No · Wait; Help stays leftmost in left-hand and keep-left modes, and the strip mirrors only in right-hand mode with keep-left off. Also the "They asked…" mic (72 px) and the caregiver-lock gear at the top-right.
2. **Listening** · 3. **Topics** (+ pain flow, people, food/drink) · 4. **Camera** · 5. **Type** · 6. **Confirm** (§9) · 7. **Speaking** · 8. **Help active** ("Help is coming ✓", Send SMS, It was a mistake, 112 line).

Caregiver mode: onboarding, Voice Studio, People, Routine, Vocabulary, Objects, Phrasebook, Link phones, Therapist, Privacy & data, Settings (including the demo clock), Demo/Stage.

### 14.2 Interaction rules
- Every patient target ≥ 72 px (tiles ≥ 120 px), spacing ≥ 12 px (≥ 16 px around Help). Activation on pointer-up. A repeated-tap filter (`tapFilterMs`, default 400); optional hold-to-activate for tremor (off by default). No gestures, no time limits, no auto-dismiss.
- **Left-hand mode (default):** primary actions weighted bottom-left; right-hand mode mirrors. **Keep-left mode:** left-aligned text, card lines of ≤ ~28 characters, and a coloured left-edge bar as a reading anchor.
- Haptics (`navigator.vibrate`, where supported) plus a clear pressed state. Screen Wake Lock during active use.
- An adult visual tone; no cartoon mascots on patient screens.
- **Adaptive suggestion:** if ≥ 30% of taps in a session are followed by Back within 2 s, suggest a different grid size in caregiver mode. Never change the layout mid-session.

### 14.3 Visual design tokens (match the deck)
`--ink #231040` (deep aubergine) · `--brand #7B1FA2` (purple) · `--coral #FF6B4A` · `--lavender #F3EDFB` · `--mint #13A37A` · `--help #A01818` · body text `#1B1030`.
- **Contrast rules:** white text only on ink, brand or help. Coral and mint are accents or large-text backgrounds, and carry ink text, never white. Patient text ≥ 7:1, and large text (≥ 24 px, or ≥ 19 px bold) ≥ 4.5:1. Axe runs `color-contrast-enhanced` on patient screens.
- **Fonts:** Noto Sans + Noto Sans Tamil/Devanagari/Telugu; base 20 px; candidates 26–32 px; `textScale` multiplies.
- High-contrast mode is required; dark mode is optional.

### 14.4 PWA
- **Manifest:** name "Sollu", description = the tagline, standalone, portrait, maskable icons, theme `--ink`, `start_url: "/"` (role-based routing, §12.2).
- **Precache** the shell, fonts, icons, i18n and quick-strip audio. Runtime-cache TF.js models on first use.
- **Offline:** the quick strip, phrasebook, "your usual" and cached pain templates speak in the own voice from cache. Anything not cached uses the device voice with a badge. Speech and LLM features show "Offline — use Topics or My phrases".

---

## 15. Testing, evaluation, verification

### 15.1 Automated tests (all runnable in mock mode; `pnpm verify` = lint + typecheck + unit + e2e)
- **Unit:** time buckets and routine windows; the clock service; the context builder; the prompt builder (snapshot per language); the response validator (keyword-in-text, reading format, dedupe, number-word/dose/name guard with fake fixtures, length); signature create/verify/expiry and the `/api/sign` source rules; voice grants; memory scoring, substitutions and learned-routine detection; metric functions (hand-computed fixtures); the tap filter; the audio-cache LRU; the TTS queue (priority, abort, supersede); relay crypto round-trip, envelope and receipts; the outbox; backup encrypt/decrypt.
- **Component:** the confirm screen renders ≤ 3 cards + "None of these", with correct roles and labels and no autoplay; the Home quick strip order in each hand mode.
- **E2E (Playwright, Android-sized viewport, mock providers):**
  - each input modality → confirm → speak, with the Playwright clock at 20:58 for the night-tablet flow;
  - the pain flow → templates → "None of these" → LLM round;
  - "your usual";
  - the offline quick strip and cached templates;
  - two browser contexts: pairing, `spoken` → `delivered` → "Shown on … ✓", the `ask` banner, `help` → `ack`;
  - therapist numbers after a scripted session.
- **Invariant tests:**
  - **I-1 / I-2:** spy on `HTMLMediaElement.prototype.play`, `AudioBufferSourceNode.prototype.start`, `OscillatorNode.prototype.start` and `speechSynthesis.speak`. The audio module logs every playback with its channel and `tapEventId`. Each E2E flow asserts that every `speak` and `preview` playback maps to a trusted tap on an allowed control within 1500 ms, that nothing plays after Stop, and that a finished prefetch never plays. A lint fixture that uses `new Audio()` outside `features/audio` must fail ESLint.
  - **I-3:** when the server returns fewer than three candidates, no filler appears.
  - **I-4:** validator unit tests, plus the eval's grounding metric.
  - **I-5:** unpicked candidates never reach the audio module (spy) and appear only in the attempt log.
  - **I-6:** Help speaks offline (cached → device voice → tone).
  - **I-7:** the clone step is unreachable without a `ConsentRecord`; withdrawal calls `DELETE /api/voice` and removes the local samples.
  - **I-8:** `/api/tts` rejects missing, expired, tampered, wrong-device and wrong-language signatures, and a voice grant from another device; `/api/sign` rejects requests that break its source rules.
  - **I-9:** capture server logs during E2E and assert that no request text appears.
  - **I-10:** every `[data-tap]` element on patient screens measures ≥ 72×72 CSS px (primary tiles ≥ 120 px tall); axe finds no serious or critical violations, and passes `color-contrast-enhanced`.

### 15.2 Intent eval (`evals/intent`) — start in M1, grow to ≥ 60 cases with the team's Tamil speakers
- **Case format (JSONL):** `{id, context: ContextPacket, acceptable_intents: string[], must_not?: string[], notes}`.
- **Scoring:** the runner calls the real engine, then a judge model (`claude-sonnet-5`, structured output, strict rubric) scores:
  - JSON validity;
  - three distinct intents;
  - top-1 / top-3 hit against `acceptable_intents`;
  - grounding violations, including invented names;
  - reading format ("heard → meant" whenever a different word was assumed);
  - register (a Tamil formal-marker heuristic flags e.g. "தண்ணீர்", "கொடுங்கள்", "வாருங்கள்", "வேண்டும்");
  - latency p50/p95.

  Output goes to `evals/intent/report.md`.
- **Targets:** validity 100%; distinct 100%; top-3 ≥ 80%; top-1 ≥ 55%; grounding violations 0; Tamil formal-register flags ≤ 10%; round-1 p50 ≤ 3.0 s and p95 ≤ 6 s.
- **[H]:** run the 13 [H] cases of Appendix G.

### 15.3 STT eval (`evals/stt`) — M2
- **[H]:** a quick check with about ten of the team's clips.
- **Full:** with consent, record ≥ 20 short fragments per language from team members — in a quiet and a noisy room, including Tanglish and deliberately slow, effortful speech. Compute CER (more meaningful than WER for agglutinative Tamil) and latency per provider, including Sarvam's `codemix` vs `verbatim` modes. Then pick `STT_PROVIDER`.
- Keep audio only with the speakers' agreement, and never commit audio to git.

### 15.4 Performance budgets (the single source for latency targets)
- **Initial JS** ≤ 200 KB gzipped; TF.js, charts, wavesurfer and the caregiver, therapist and baseline routes are lazy-loaded.
- **Home interactive** < 3 s on a ~₹8,000 Android phone over 4G.
- **STT:** p50 ≤ 1.5 s for a 2 s clip.
- **Intent round 1:** p50 ≤ 3.0 s, p95 ≤ 6 s.
- **Tap to first audio:** cached or prefetched ≤ 0.3 s; uncached p50 ≤ 1.5 s.
- **Speech path**, first input → first audio: median < 10 s.

Record the measured numbers in `PROGRESS.md`.

---

## 16. Stage kit: metrics overlay, baseline, demo

- **Tap tracker & timer:** every patient control carries `data-tap`. An attempt starts at the first input action and ends when the audio starts `playing`. The overlay chip reads "👆 2 taps · ⏱ 6.4 s". **Stage mode** shows it large, keeps a session table (median, p90, n) and prefetches all cards.
- **Demo clock:** set from caregiver mode, with the visible badge (§6).
- **Baseline board** (`/baseline`): an honest, typical English core-word picture board (I, want, need, go, eat, drink, water, tablet, toilet, pain, help, yes, no, more, …) with a sentence strip and a robotic device voice, measured by the same tracker — a live, fair comparison, not a strawman.
- **Therapist-lite** (§12.3).
- **Demo scenarios** (Appendix F), runnable from caregiver mode with the demo family.
- **Rehearsal cache:** records real responses during rehearsal and replays them if the network fails on stage. Every cached result is visibly badged "CACHED" and logged with `demoCached` — **never present cached timings as live measurements.**
- **Warm-up** button: pings the server, warms the LLM schema grammar, pre-generates audio for the scenario sentences, loads TF.js.
- **Demo voice:** clone a consenting team member's voice, or that of a relative who agrees. Never clone a real patient's voice without consent arranged through the partner clinic. Say on stage whose voice it is.
- `docs/DEMO_SCRIPT.md`: a minute-by-minute script, the device setup (two phones + projector mirroring) and the failure plan.

---

## 17. Milestones (in order; [H] = hackathon scope; each ends with checks + evidence + commit, with review per §0 rule 8)

**— The 24-hour MVP: the [H] parts of M0–M6 (Tamil + English) —**

**M0 Foundations**
- **[H]:**
  - a pnpm monorepo in TypeScript strict, with ESLint (including the I-2 rules) and Prettier;
  - the shared zod schemas;
  - a Fastify server with health, device registration and tokens, and per-route rate limits;
  - mock providers for everything;
  - the Dexie schema; i18n (en, ta); design tokens and base components;
  - the PWA manifest and service worker, and the role-based start route;
  - the caregiver lock (PIN);
  - `.env.example` and the scripts `pnpm dev | test | e2e | eval | verify | build | start`;
  - `CLAUDE.md`, `PROGRESS.md` and `docs/*`;
  - deployed to an HTTPS host.
- **Full:** the Dockerfile, backup/restore, `voices:list` and `voices:prune`.
- **Accept:**
  - [auto] `pnpm verify` is green.
  - [auto] Provider facts are recorded in `docs/PROVIDERS.md`.
  - [human] The app installs on an Android phone from the HTTPS URL. The microphone and camera need a secure context; for local testing use a tunnel such as `cloudflared tunnel --url http://localhost:<port>`.

**M1 Core loop**
- **[H]:**
  - Home;
  - Topics with context ordering, the pain flow (tiles → side → templates → LLM) and the People/Food/Drink sub-screens;
  - Type;
  - the context engine, with the clock service (demo time + badge) and the seeded demo family (`/setup?demo=1`; the addressee chip takes its language and register from the seed);
  - `/api/intent` (Anthropic + mock; schema, validation, signing, timeout, fallback);
  - the confirm screen;
  - the audio module with its `speak` and `preview` channels (the device voice stands in until M3);
  - the speaking screen and the attempt log;
  - the intent eval on the [H] cases.
- **Full:** the eval grown to ≥ 20 cases.
- **Accept:**
  - [auto] With the demo clock at 20:58, Topics › Medicine yields three distinct colloquial-Tamil candidates, both in an E2E test (mock) and in one real-provider run (output pasted).
  - [auto] The invariant tests for I-1, I-2, I-3, I-4, I-5, I-9 and I-10 pass.
  - [auto] The eval report is committed.
  - [human] On a phone, tapping a card speaks (in the device voice).

**M2 Speech input**
- **[H]:** the recorder (the Speak tile starts recording; generous end-pointing); `/api/stt` with Sarvam + mock; "I heard"; retry; the "They asked…" mic → partner question; a quick STT check with about ten of the team's clips.
- **Full:** ElevenLabs Scribe and OpenAI adapters (+ the optional browser provider); the STT eval (≥ 20 clips per language, comparing providers and Sarvam modes); the provider choice recorded.
- **Accept:**
  - [human] Saying "tablet… raathiri" on a phone reaches the confirm screen with night-tablet candidates.
  - [auto] The STT report is committed (without audio).

**M3 Own voice**
- **[H]:**
  - the Voice Studio [H] cut of §10.1;
  - `/api/tts` with signatures and voice grants, and `/api/sign` with its source rules;
  - the audio cache, the TTS queue and prefetch (first card);
  - the quick strip (Help · Yes · No · Wait) in the own voice;
  - Say again / Louder / Stop; the fallbacks;
  - delete voice; ElevenLabs history deletion.
- **Full:** the complete Voice Studio — isolation, the waveform editor, the auto-suggested clean region, Sarvam, per-language routing chosen by listening test and latency, template pre-generation and the manage screen.
- **Accept:**
  - [auto] The I-6, I-7 and I-8 tests pass.
  - [auto] Measured tap-to-sound for cached audio is ≤ 0.3 s (instrumented log pasted).
  - [human] A candidate plays in the cloned voice on a phone; the listening test rates it; delete voice works.

**M4 Camera**
- **[H]:** the camera screen, COCO-SSD with the whitelist, the label chip.
- **Full:** opt-in cloud vision ("Ask AI what this is").
- **Accept:**
  - [human] A photo of a water bottle yields water candidates.
  - [auto] A test proves that no image leaves the device while `cloudVisionConsent` is off.

**M5 Caregiver link**
- **[H]:** the pairing QR with room grants; the E2E-encrypted relay; the `/care` feed; `delivered` receipts; the Help alarm with "Enable alerts", `ack` and "Karthik is coming ✓"; the Send SMS button; "It was a mistake".
- **Full:** `ask` from the caregiver phone → partner-question context; the outbox; the QR scanner in `/care`.
- **Accept:**
  - [auto] A two-browser-context E2E test covers pairing, `spoken` → `delivered` → "Shown on … ✓", and `help` → `ack`.
  - [human] With two phones, a spoken sentence appears on the caregiver phone within about 1 s, and the Help round trip works.

**M6 Stage kit**
- **[H]:** the overlay and stage mode; the baseline board; the demo-clock badge; therapist-lite; the [H] scenarios of Appendix F; the rehearsal cache with badges; warm-up; `docs/DEMO_SCRIPT.md`.
- **Accept:**
  - [human] The [H] demo runs twice in a row on real phones. It then runs once more with the patient phone's network off, using the rehearsal cache: every cached result is badged, and the caregiver-phone steps are skipped.
  - [auto] For a scripted E2E run, the overlay's tap and time numbers match the attempt log.

**— After the hackathon: the complete product (the deck's 0–3 month and 3–12 month roadmap) —**

**M7 Personal memory & full context**
- The full onboarding UI (people with aliases, places, routine, vocabulary); addressee selection; memory retrieval + "⭐ your usual"; word substitutions; learned routine and vocabulary suggestions; the phrasebook with auto-promotion; the SVG body map; backup/restore.
- **Accept:**
  - [auto] E2E: after the same sentence is confirmed twice at night, it appears as "your usual" instantly; after two round-2 recoveries of "table → tablet", round 1 offers the tablet reading; choosing Dr. Rao yields English in the same voice (mock).
  - [auto] The learned-routine detection unit tests pass.

**M8 Personal objects**
- "Teach Sollu my things": 5–10 photos per object; embeddings; kNN; thresholds; a management UI.
- **Accept:** [human] The demo family's tablet box and spectacles are recognised on-device with ≥ 80% top-1 on a 20-photo holdout taken by the team.

**M9 Therapist dashboard**
- The full metrics, heatmap, struggled concepts, substitutions and rejected sets; exports (encrypted JSON, CSV, print); import on another device; study mode.
- **Accept:** [auto] The metrics match hand-computed fixtures, and export → import round-trips identically.

**M10 Hindi & Telugu**
- UI strings, register notes, few-shots, pain templates (with Hindi and Telugu grammar, e.g. Hindi oblique forms), quick phrases, TTS routing (Telugu → `eleven_v3` or Sarvam), and ≥ 15 eval cases each; every string is listed for native review.
- **Accept:**
  - [auto] The eval targets are met for hi and te, or the gaps are documented.
  - [human] Scenario 4b — Pain › shoulder › left, to Nurse Anjali — yields Hindi in the same voice, and native speakers sign off the review checklist.

**M11 Hardening & pilot readiness**
- Web Push alerts; an accessibility audit (axe + manual testing with TalkBack); the left-hand, keep-left, tremor and grid settings verified; an offline matrix; a security review (rate limits, access code, body limits, upload MIME checks, ffmpeg timeouts, CORS, headers); the privacy screen, encrypted exports and erase-all; the performance budgets; evals grown to ≥ 60 cases; the Dockerfile; a README (setup, accounts and keys, costs, deployment, phone testing); final acceptance (§18).
- **Accept:**
  - [auto] `pnpm verify` and `pnpm eval` meet their targets.
  - [human] §18 passes on real devices.

**Roadmap hooks (stub interfaces only; don't build unless asked):**
- a self-hosted IndicF5 TTS (Python microservice);
- a small on-device LLM for offline fragments;
- a therapist cloud portal with clinic accounts;
- validation-study tooling (communication success rate, taps and seconds per sentence);
- a voice-banking drive;
- more Indian languages;
- other conditions (dysarthria, ALS, laryngectomy, late-stage Parkinson's);
- an open-source core (e.g. Apache-2.0), with third-party asset licences listed, so hospitals can self-host.

---

## 18. Final end-to-end acceptance (real devices; record results in `PROGRESS.md`)

On a ~₹8,000 Android phone (patient) and a second phone (caregiver), deployed over HTTPS:
1. [human] Install the PWA; complete onboarding for the demo family; clone the voice from a real ~90 s sample, with consent.
2. [human] At ~21:00 (real time or the demo clock), say "tablet… raathiri" → three distinct colloquial-Tamil candidates → tap #1 → hear it in the cloned voice. The caregiver phone shows it with the English meaning. Taps = 2; time-to-speech < 10 s.
3. [human] Say "table" → "None of these" → round 2 offers the tablet reading → confirm. Repeat once; the next time, round 1 offers it.
4. [human] Pain › shoulder › left, with the addressee set to the Hindi-speaking nurse → Hindi sentences in the same voice, with amber borders on the stronger ones.
5. [human] The caregiver asks "மதியம் என்ன சாப்பிடணும்?" from their phone → a banner on the patient's phone → say "ரசம்" → answer candidates.
6. [human] A photo of the (taught) tablet box → medicine candidates, recognised on-device.
7. [human] In airplane mode, the quick strip, phrasebook, "your usual" and cached pain templates still speak in the own voice; Help speaks; the Send SMS button opens. Back online, the queued Help reaches the caregiver phone, marked late.
8. [human] The therapist dashboard reflects all of the above, and the CSV export opens in a spreadsheet.
9. [auto] `pnpm verify` is green; `pnpm eval` meets the §15.2 targets; axe is clean; the server logs contain no sentence text.

---

## Appendix A — Topics and core labels (drafts — confirm with native speakers)
| id | icon | Tamil | English | Sub-screen / items |
|---|---|---|---|---|
| medicine | 💊 | மாத்திரை | Medicine | none — context decides |
| food | 🍛 | சாப்பாடு | Food | இட்லி, தோசை, சாதம், ரசம், தயிர் சாதம், பழம், டிபன் + vocabulary |
| drink | 🥤 | குடிக்க | Drink | தண்ணி, சுடு தண்ணி, காபி, டீ, பால், ஜூஸ் |
| toilet | 🚻 | பாத்ரூம் | Toilet & bath | — |
| pain | 🤕 | வலி | Pain | body part → side (paired parts) → templates |
| people | 👨‍👩‍👧 | ஆட்கள் | People | contact photos |
| feelings | 😊 | மனசு | Feelings | சந்தோஷம், வருத்தம், கோபம், களைப்பு, பயம், போர் அடிக்குது, தனியா இருக்கு, எரிச்சல் |
| rest | 🛏️ | ஓய்வு | Rest & comfort | தூக்கம், படுக்கணும், உட்காரணும், ஃபேன், ஏசி, லைட், போர்வை, ரொம்ப சூடு, ரொம்ப குளிர் |
| tv_phone | 📺 | டிவி / ஃபோன் | TV & phone | — |
| prayer | 🙏 | சாமி | Prayer | optional per family |
| go_out | 🚶 | வெளியே | Go out | — |

UI labels:
- **Home tiles:** 🎤 பேசு (Speak) · 🗂️ வகைகள் (Topics) · 📷 கேமரா (Camera) · ⌨️ எழுது (Type).
- **Confirm screen:** "இதுல எதுவும் இல்ல" (None of these) · 👂 "கேளு" (Listen) · "மறுபடி சொல்லு" (Say again) · "நிறுத்து" (Stop).
- **Help screen:** "SMS அனுப்பு" (Send SMS) · "தெரியாம அழுத்திட்டேன்" (It was a mistake) · "அவசரத்துக்கு 112-க்கு கூப்பிடுங்க." (In an emergency call 112).

## Appendix B — Pain flow: parts, sides and round-1 templates
- **Parts without a side:** தலை head · வாய் / பல் mouth / teeth · தொண்டை throat · நெஞ்சு chest · வயிறு stomach · முதுகு back.
- **Paired parts (ask the side):** கண் eye · காது ear · தோள் shoulder · கை arm/hand · இடுப்பு hip · முட்டி knee · கால் leg · பாதம் foot.
- **Sides:** இடது left · வலது right.

Round 1 is always these three cards; the person picks the intensity by picking the card:

| intensity | ta | en | urgency |
|---|---|---|---|
| a little | {side} {part} கொஞ்சம் வலிக்குது. | My {side} {part} hurts a little. | none |
| a lot | {side} {part} ரொம்ப வலிக்குது. | My {side} {part} hurts a lot. | elevated |
| unbearable | {side} {part} வலி தாங்க முடியல, உடனே உதவி வேணும். | The pain in my {side} {part} is unbearable — I need help now. | elevated |

- For parts without a side, omit `{side}` (e.g. "தலை ரொம்ப வலிக்குது." / "My head hurts a lot.").
- **Chest replaces all three**, all `emergency`: "நெஞ்சு வலிக்குது, உடனே உதவி வேணும்." / "My chest hurts — I need help now." · "நெஞ்சு அடைக்குற மாதிரி இருக்கு." / "My chest feels tight." · "மூச்சு விட கஷ்டமா இருக்கு." / "I'm finding it hard to breathe." Speaking any emergency card also sends `help` (§9).
- These strings are the canonical `template` list in `packages/shared`. Hindi and Telugu templates, with correct case agreement, come in M10 and are listed for review.

## Appendix C — Quick strip and default phrases (Help first in left-hand and keep-left modes)
| key | ta | en | hi (review) | te (review) |
|---|---|---|---|---|
| help | உதவி வேணும்! | I need help! | मुझे मदद चाहिए! | నాకు సహాయం కావాలి! |
| yes | ஆமா | Yes | हाँ | అవును |
| no | இல்ல | No | नहीं | కాదు |
| wait | கொஞ்சம் இருங்க | Wait a moment, please | एक मिनट रुकिए | ఒక్క నిమిషం ఆగండి |

Default "About me" phrases (ta / en):
- "எனக்கு ஸ்ட்ரோக் வந்ததால பேச கஷ்டமா இருக்கு. கொஞ்சம் நேரம் குடுங்க." / "I had a stroke and find it hard to speak. Please give me time."
- "ஆமா, இல்லன்னு பதில் சொல்ற மாதிரி கேளுங்க." / "Please ask me yes-or-no questions."
- "நன்றி." / "Thank you."

## Appendix D — Few-shot examples (use as prior turns; all drafts for native review)
Format per candidate: text — reading · gloss · intent · keyword · icon · urgency (where not given: keyword = the key noun, urgency = none).

1. **Speech** "tablet… raathiri" · 20:58 · home · routine due: Night tablets 21:00 · to Priya (daughter-in-law, respectful) · speaker female · out ta
   - c1 "ராத்திரி மாத்திரை போடணும், கொஞ்சம் எடுத்துட்டு வாங்க." — night tablet · I need to take my night tablet, please bring it · request night medicine · மாத்திரை · 💊 · none
   - c2 "நான் ராத்திரி மாத்திரை போட்டேனா?" — night tablet · Did I take my night tablet? · ask if medicine taken · போட்டேனா · ❓ · none
   - c3 "ராத்திரி மாத்திரை தீர்ந்து போச்சு." — night tablet · The night tablets have run out · report medicine finished · தீர்ந்து · 📦 · none
2. **Camera** COCO "bottle" · 14:10 · home · to Karthik (son, familiar) · out ta — reading "water" for all three
   - "கார்த்திக், கொஞ்சம் தண்ணி குடு." (request water · 💧) · "தண்ணி பாட்டில் காலியா இருக்கு, நிரப்பி வை." (bottle empty, refill · 🚰) · "சுடு தண்ணி வேணும்." (want warm water · ♨️)
3. **Partner question** "மதியம் என்ன சாப்பிடணும்?" + speech "ரசம்" · 12:40 · to Priya (respectful) · out ta — reading "rasam"
   - "ரசம் சாதம் போதும்." (choose rasam rice · 🍲) · "கொஞ்சம் ரசம் மட்டும் குடிக்கணும்." (only drink some rasam · 🥣) · "ரசம் வேணாம், வேற ஏதாவது குடுங்க." (refuse rasam · 🙅)
4. **Topic, round 2** pain › shoulder › left · the three pain templates were rejected (exclude: "My left shoulder hurts a little.", "My left shoulder hurts a lot.", "The pain in my left shoulder is unbearable — I need help now.") · 07:30 · to Dr. Rao (doctor, respectful) · out en — reading "left shoulder pain"
   - "Please help me move my left arm." (ask for help moving · 🤲 · elevated) · "Can you put a pillow under my left arm?" (ask for support · 🛏️ · none) · "Can I have something for the pain?" (ask for pain relief · 💊 · elevated)
5. **Type** "meena ph" · 19:00 · people: Meena = daughter (Bengaluru) · to Karthik (son, familiar) · out en — reading "Meena phone"
   - "I want to call Meena." (📞) · "Has Meena called?" (❓) · "Please ask Meena to call me." (📲)
6. **Round 2, paraphasia** · speech "table" · 16:30 · no routine due · no addressee · exclude ["டேபிள துடைக்கணும்.", "டேபிள் இங்க கொண்டு வாங்க.", "டேபிள் மேல என்ன இருக்கு?"] · out ta
   - "என் மாத்திரை எங்க? எடுத்து குடுங்க." — table → tablet · where are my tablets · 💊
   - "டிவி கேபிள் வேலை செய்யல." — table → cable · the TV cable isn't working · 📺
   - "டேப்லெட்ல வீடியோ போட்டு குடுங்க." — table → tablet device · put a video on the tablet · 📱
7. **Urgency** · speech "நெஞ்சு" · 10:00 · to Karthik (familiar) · out ta — reading "chest"
   - "நெஞ்சு வலிக்குது, உடனே டாக்டர கூப்பிடு." (chest pain, call the doctor · 🚨 · emergency) · "நெஞ்சு அடைக்குற மாதிரி இருக்கு." (chest feels tight · ⚠️ · emergency) · "நெஞ்சுல சளி கட்டியிருக்கு." (chest congestion · 🤧 · elevated)
8. **Hindi (M10)** · speech "दवाई" · 21:00 · to son (familiar) · speaker male · out hi — reading "medicine"
   - "रात की दवाई का टाइम हो गया, ला दो।" · "मैंने रात की दवाई ले ली क्या?" · "दवाई खत्म हो गई है।"
9. **English (the deck's own example)** · speech "tablet… night" · 21:00 · home · routine due: Night tablets 21:00 · to Priya (respectful) · out en — reading "night tablets"
   - "It's time for my night tablets — can you bring them?" · "Did I take my night tablets?" · "My night tablets have run out."

## Appendix E — Demo family seed (fictional)
```json
{
  "profile": { "preferredName": "Amma", "speakerGender": "female", "primaryLang": "ta", "otherLangs": ["en"],
               "dialectNote": "Chennai Tamil", "hand": "left", "keepLeft": true },
  "contacts": [
    { "name": "Karthik", "aliases": ["கார்த்திக்", "Karthi"], "relation": "son", "register": "familiar", "lang": "ta", "isCaregiver": true },
    { "name": "Priya", "aliases": ["ப்ரியா"], "relation": "daughter-in-law", "register": "respectful", "lang": "ta", "isCaregiver": true },
    { "name": "Meena", "aliases": ["மீனா"], "relation": "daughter (Bengaluru)", "register": "familiar", "lang": "ta", "isCaregiver": false },
    { "name": "Aadhav", "aliases": ["ஆதவ்"], "relation": "grandson", "register": "familiar", "lang": "ta", "isCaregiver": false },
    { "name": "Nurse Anjali", "aliases": ["Anjali", "अंजलि"], "relation": "home nurse", "register": "respectful", "lang": "hi", "isCaregiver": false },
    { "name": "Dr. Rao", "aliases": ["Rao", "ராவ்"], "relation": "doctor", "register": "respectful", "lang": "en", "isCaregiver": false }
  ],
  "places": [ { "label": "home" } ],
  "routine": [
    { "label": "Morning coffee", "topic": "drink", "time": "07:00" },
    { "label": "Morning tablets", "topic": "medicine", "time": "08:30" },
    { "label": "Lunch", "topic": "food", "time": "13:00" },
    { "label": "Evening walk / physio", "topic": "go_out", "time": "16:00" },
    { "label": "Evening lamp & prayer", "topic": "prayer", "time": "18:30" },
    { "label": "TV serial", "topic": "tv_phone", "time": "19:30" },
    { "label": "Night tablets", "topic": "medicine", "time": "21:00" },
    { "label": "Sleep", "topic": "rest", "time": "21:30" }
  ],
  "vocabulary": [
    { "term": "filter coffee", "kind": "drink" }, { "term": "idli", "kind": "food" },
    { "term": "rasam rice", "kind": "food" }, { "term": "Aadhav's school", "kind": "place" },
    { "term": "balcony chair", "kind": "object" }, { "term": "TV serial", "kind": "show" }
  ]
}
```
Seed routine items are `source: "caregiver", confirmed: true`, with all days. Until M10 enables Hindi, a contact whose language isn't in `ENABLED_LANGS` gets the primary language.

## Appendix F — Demo scenarios (stage order; [H] = in the hackathon demo)
1. **[H] Night tablets:** demo clock 20:58 → speech "tablet… raathiri" → Tamil candidates → own voice → Priya's phone shows the text (✓ receipt). The overlay shows taps and seconds.
2. **[H] The same task on the baseline board** (`/baseline`), measured by the same counter.
3. **[H] Photo:** point the camera at a water bottle → water candidates.
4. **[H] Language follows the addressee:** switch the addressee to Dr. Rao → Pain › shoulder › left → English sentences in the same voice; pick "hurts a lot" (amber border). *4b (after M10):* the same to Nurse Anjali → Hindi.
5. **[H] Partner question:** Priya asks "மதியம் என்ன சாப்பிடணும்?" into Amma's phone ("They asked…") → Amma says "ரசம்" → answer candidates. After M5 full, Priya sends the question from her own phone.
6. **[H] Recovery:** "table" → "None of these" → round 2 reinterprets → therapist-lite lists the struggle. After M7/M9, the dashboard also shows the learned substitution.
7. **[H] Help:** Amma taps Help → her voice says "உதவி வேணும்!" → Karthik's phone alarms → "I'm coming" → "Karthik is coming ✓". After M5 full, the same works with the patient's phone offline first: the alert arrives, marked late, once it reconnects.

## Appendix G — Starter eval cases (expand to ≥ 60; all except e11 are [H])
| id | lang | modality & fragment | context | acceptable intents (any) | must not |
|---|---|---|---|---|---|
| e01 | ta | speech "tablet raathiri" | 20:58, night tablets due | request night tablets · ask if taken · report run out | dose, drug name |
| e02 | ta | speech "table" | 21:00, night tablets due | tablet reading within top 3 | — |
| e03 | ta | speech "தண்ணி" | 14:00 | want water · warm water · refill | — |
| e04 | ta | speech "தலை… வலி" | 07:30 | head hurts a lot (elevated) · want to lie down · ask for help | drug name |
| e05 | ta | partner "காபி வேணுமா?" + speech "ஆமா… சக்கரை" | 07:05 | yes with sugar · yes, less sugar · yes, no sugar | medical advice |
| e06 | ta | camera personal "spectacles" | 10:00 | give me my glasses · can't find glasses · clean glasses | — |
| e07 | en | text "meena ph" | 19:00, Meena = daughter | call Meena · has Meena called · ask Meena to call | invented phone number |
| e08 | ta | speech "Karthik" | 18:00 | where is Karthik · call Karthik · tell Karthik to come | — |
| e09 | ta | speech "fan" | 13:00 | switch on the fan · switch it off · change speed | — |
| e10 | ta | speech "நெஞ்சு" | 10:00 | chest pain + help (emergency) | medical advice |
| e11 | hi | topic toilet, to the nurse (M10) | 11:00 | need the toilet · help getting up · want to wash | — |
| e12 | ta | speech "Aadhav school" | 16:00 | has Aadhav come back from school · want to talk to Aadhav · pick him up | invented time |
| e13 | en | speech "tablet… night" (the deck's example) | 21:00, night tablets due | request night tablets · ask if taken · report run out | dose, drug name |
| e14 | en | topic pain › shoulder › left, round 2 (templates excluded) | 07:30, to Dr. Rao | help moving the arm · support or pillow · ask for pain relief | drug name |

END OF MASTER PROMPT