# Sollu · சொல்லு

Say it. In your words. In your voice.

Tamil-first communication aid prototype for BME Ignite Hackfest 2026, Team echo. A fragment, topic or photo leads to candidate sentences; the person taps the exact sentence they want spoken. Includes a caregiver view, measured picture-board comparison and local communication log.

**No paid API key is needed to run the default demo.** Mock output is deterministic and must stay visibly labelled. Free device speech and exact-phrase own-voice recordings are distinct from generative voice cloning. Tamil recognition and Tamil device voices depend on the browser/device. This is a prototype; real-phone, native-speaker and clinic acceptance are tracked in [PROGRESS.md](PROGRESS.md).

## Contextual LLM and caregiver personalization

Open **Caregiver settings → Sentence engine** (`/settings?tab=llm`), unlock with the local PIN, and choose **OpenAI**, **Anthropic Claude**, **Google Gemini**, **Groq**, **local Ollama**, or **Free vocabulary**. For OpenAI, paste your API key, review cloud text sharing, and save. You can edit the model ID and maximum waiting time. The separate synthetic connection test makes one small request and may incur provider charges. No real cloud key or paid call was used during implementation.

Pasted keys stay in server memory for the authenticated device and expire after 12 hours of inactivity or a server restart. They are never returned to the page or saved in browser storage/backups. **Forget session key** removes that source; environment keys must be removed from the server environment separately. For persistent local setup, put `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY` in the server's private `.env` and restart. Do not use `VITE_` keys. An environment key alone does not consent to cloud sharing: select the provider and enable sharing for this device in Settings. The default remains the free catalog.

Models can now compose sentences beyond the prepared vocabulary, using the current fragment and conversation question. Structured responses carry exact evidence spans and pass bounded checks for source evidence, language, negation, side, quantities, unsupported details and repeated meanings. Generated wording is labelled **AI draft · Check the meaning**. These filters cannot prove semantic correctness or translation quality; the person reviews and taps the exact sentence. Failed, invalid or timed-out requests fall back to vocabulary or clarification; there is no automatic switch to another cloud provider. Model drafts are not reused from rehearsal caches.

**Personalize** adds brief/natural/polite style, 8/12/18-word limits, a preferred first input tile, reduced motion and a communication-preference note. Optional personal context and recent conversation start off. Recent context contains at most three chosen messages explicitly marked intended/understood, from the same listener/place/language in the last ten minutes. Existing text size, contrast, speech speed, quiet mode, tap filtering, choice count and confirmation controls remain in General. Voice playback and speech recognition are separate from the sentence engine.

Provider request formats, retention caveats and model defaults are recorded in the dated [provider ledger](docs/PROVIDERS.md).

### Time, place and routine context

Open **Caregiver settings → Context engine** (`/settings?tab=context`). Choose the current place manually, use the real device clock or an explicitly labelled demo clock, and enable the context sources you want. Add activities with a time, weekdays and optional place; review each with the person before it can influence suggestions. Edit, remove and undo removal are supported. A 15/45/90-minute window bounds nearby routines, including the correct weekday across midnight. Fictional seed routines remain sample data and are excluded from real-clock use until explicitly reviewed.

The shared context engine ranks relevant routines by the person's words, time proximity and matching place. A fragment such as “want my usual drink” can become “I want my usual morning coffee” when a matching reviewed coffee routine is available. Specific words and refusals take precedence; conflicting routines lead to clarification. Schedules never prove an event happened, and medication routines cannot supply a drug or dose. The confirmation screen has an expandable view of context clues. This is contextual suggestion, not mind-reading or measured clinical accuracy.

Personal-context sharing must be enabled for the selected model to receive place/routines; it remains off by default and is separate from provider cloud permission. Recent explicitly confirmed messages use the existing separate switch. Local vocabulary remains available without an API key. [Context design and checks](docs/CONTEXT_ENGINE.md).

### Vocabulary and other communication tools

Open **My tools** (`/tools`) for a bilingual word finder with 124 controlled message meanings, personal words with aliases and descriptions, familiar photos with selectable messages, prepared conversations, a printable communication passport, and drawing/writing. Personal cards are drafted behind the caregiver lock and appear for everyday use only after the person reviews the exact words. Editing or importing a card requires fresh approval. Pin, hide and delete controls keep the word collection personal.

The persistent support strip offers Help, repair, Pause and Stop. Repair includes message editing and an explicit check of what the partner understood. Comfort phrases and a small request/refusal sentence builder work without an AI service. Pause preserves an unfinished message; drawings survive a pause in the current app session. Access settings include choice count, repeated-tap filtering, listening pauses, speech speed, two-step confirmation and a quiet screen.

All suggestion paths apply checks for negation/body side/output language, repeated or previously rejected meanings, and insufficient support. Speaking a sentence alone never approves a learned mapping. Corrections and remembered phrasing require review and are scoped to the listener, place and language. Local and cloud model drafts use the contextual generation path described above; the free catalog remains available without inference.

Caregiver messages queue encrypted on the patient device and retry with the same message ID. Help expires after 60 seconds, ordinary messages after five minutes. “Delivered” means received by the companion page; “understood” requires the person's explicit confirmation. Both pages and the relay must eventually be available. Privacy settings include an offline-readiness panel and passphrase-encrypted backup with import preview; imports preserve existing entries and do not restore credentials, pairing keys or the caregiver PIN.

Research, scope and verification: [approved improvement plan](docs/APHASIA_IMPROVEMENT_PLAN.md), [development challenge report](evals/intent/report.md), [installed local-model benchmark](evals/intent/report-local-selector.md), [pending human acceptance protocol](docs/IMPROVEMENTS_ACCEPTANCE.md). The 240 challenge executions are 120 authored scenarios in two output languages, not a clinical accuracy estimate. The installed `llama3:latest` did not complete any of 20 eligible requests within the eight-second budget, so the no-key controlled catalog remains the dependable default in this environment.

## Run locally

Use Node.js 22.12 or later and pnpm 11.19.0 (the repository's pinned package-manager version). In this repository:

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

Open the web address printed by Vite (normally `http://localhost:5173`). The API normally runs on port 8787. Keep `MOCK_PROVIDERS=1` for deterministic no-key development. The server is local; hosting has been deferred at the user's request.

Open `/setup?demo=1` to create the fictional family and set a caregiver PIN. Hold the top gear for two seconds, then enter the PIN to open settings. Direct family routes (`/settings`, `/therapist` and `/demo`) require the PIN without the hold; Voice Studio is under `/settings?tab=voice`. This lock uses the same browser's stored PIN and an in-memory unlock state; it prevents accidental changes and is not account authentication or disk encryption. The guarded `/demo` page warms three sentence sets and prepares seven sample scenes. Reused suggestions are labelled **CACHED**, and sample-input buttons do not test a microphone or camera. Choose a visible provider/voice mode before demonstrating. Open `/care` through its pairing link in a separate browser profile or context; the receiver must tap Enable alerts and keep that page open. A second tab sharing the patient browser's storage is not equivalent to an independent device.

For a production bundle, run `pnpm build`, then `pnpm start`. The exact available scripts and versions are in the root manifest and lockfile. Phone microphone/camera/PWA installation requires a secure context; ordinary LAN HTTP is not a substitute for HTTPS. No tunnel or deployment is created automatically.

## Free alternatives

| Need | Free route | Limit |
| --- | --- | --- |
| Candidate generation | Bundled controlled Tamil/English catalog; optional local Ollama generation | Catalog coverage is bounded. The earlier installed-model selector benchmark timed out; it does not measure the new generation path or establish model accuracy. |
| Speech input | Browser SpeechRecognition when supported | May send audio to browser-vendor servers; language/support/offline behaviour vary. Type and Topics always provide another input route. |
| Speak a new sentence | Available device/browser speech voice | Generic voice; Tamil voice may be missing and remote voices may need internet. |
| Speak in a consenting person's actual voice | Record an exact phrase in Voice Studio and replay it for that phrase | Genuine recording, not a generative clone; it cannot say new text or translate the recording. File upload is not implemented. |
| Bottle camera input | COCO-SSD on-device after model download | Generic classes only. Personal medicine boxes/spectacles need the later object-learning feature. |

To use Ollama, install it separately, choose and download a local model suitable for your hardware, and confirm it appears in `ollama list`. Set `LLM_PROVIDER=ollama`, `MOCK_PROVIDERS=0`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, and `OLLAMA_MODEL` to that installed model's exact name in `.env`. Set `OLLAMA_NO_CLOUD=1` in the Ollama application's environment and restart Ollama for local-only operation. Sollu does not install models automatically. See [verified provider notes](docs/PROVIDERS.md) for the API and privacy limits.

Cloud sentence adapters are implemented for OpenAI, Anthropic, Gemini and Groq, with settings and explicit sharing permission. **Cloud STT, generative voice cloning and paid TTS are still unimplemented.** A production server requires `ACCESS_CODE` and a persistent `SERVER_SECRET` of at least 32 bytes. Live account access, output quality and account retention settings still need checking with the chosen provider. [Provider ledger](docs/PROVIDERS.md)

## Verification and status

```powershell
pnpm test
pnpm e2e
pnpm eval
pnpm verify
pnpm build
```

E2E tests need a compatible Chromium browser. The configuration reuses a locally installed Playwright Chromium or preinstalled Puppeteer Chrome on Windows; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing executable. If none is available, run `pnpm exec playwright install chromium` once, then `pnpm e2e`. This downloads a browser; the app does not install one automatically.

Check [PROGRESS.md](PROGRESS.md) for what has actually run and what remains pending. Mock fixture evaluation is not measured LLM accuracy. Browser automation is not a phone listening test. Original full-product scope, including Hindi/Telugu, learned routines, personal objects and pilot hardening, remains in [the specification](docs/SPEC.md).

The safety rules include no speech without the person's tap, cancellation of pending audio, no ungrounded specifics, consented voice use, encrypted caregiver payloads and no server content logs. [Architecture decisions](docs/DECISIONS.md), [privacy](docs/PRIVACY.md), [language review](docs/LANGUAGE_REVIEW.md), [demo script](docs/DEMO_SCRIPT.md).

Sollu is a communication aid prototype, not a diagnostic, treatment or emergency service. “In your voice” applies only when a consented exact recording or verified clone is actually selected; all other voice modes are labelled.
