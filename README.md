# Sollu · சொல்லு

Say it. In your words. In your voice.

Tamil-first communication aid prototype for BME Ignite Hackfest 2026, Team echo. A fragment, topic or photo leads to candidate sentences; the person taps the exact sentence they want spoken. Includes a caregiver view, measured picture-board comparison and local communication log.

**No paid API key is needed to run the default demo.** Mock output is deterministic and must stay visibly labelled. Free device speech and exact-phrase own-voice recordings are distinct from generative voice cloning. Tamil recognition and Tamil device voices depend on the browser/device. This is a prototype; real-phone, native-speaker and clinic acceptance are tracked in [PROGRESS.md](PROGRESS.md).

## Communication tools added on 28 September

Open **My tools** (`/tools`) for a bilingual word finder with 124 controlled message meanings, personal words with aliases and descriptions, familiar photos with selectable messages, prepared conversations, a printable communication passport, and drawing/writing. Personal cards are drafted behind the caregiver lock and appear for everyday use only after the person reviews the exact words. Editing or importing a card requires fresh approval. Pin, hide and delete controls keep the word collection personal.

The persistent support strip offers Help, repair, Pause and Stop. Repair includes message editing and an explicit check of what the partner understood. Comfort phrases and a small request/refusal sentence builder work without an AI service. Pause preserves an unfinished message; drawings survive a pause in the current app session. Access settings include choice count, repeated-tap filtering, listening pauses, speech speed, two-step confirmation and a quiet screen.

All suggestion paths share the same meaning policy: preserve negation/body side/output language, remove repeated or previously rejected meanings, and abstain when there is not enough supported content. Speaking a sentence alone never approves a learned mapping. Corrections and remembered phrasing require review and are scoped to the listener, place and language. The optional local model selects controlled meanings; it cannot author unverified medication details or names.

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
| Candidate generation | Bundled controlled Tamil/English catalog; optional local Ollama selector | Unrecognized meanings require clarification or personal wording. The tested installed model timed out; this is not evidence of model accuracy. |
| Speech input | Browser SpeechRecognition when supported | May send audio to browser-vendor servers; language/support/offline behaviour vary. Type and Topics always provide another input route. |
| Speak a new sentence | Available device/browser speech voice | Generic voice; Tamil voice may be missing and remote voices may need internet. |
| Speak in a consenting person's actual voice | Record an exact phrase in Voice Studio and replay it for that phrase | Genuine recording, not a generative clone; it cannot say new text or translate the recording. File upload is not implemented. |
| Bottle camera input | COCO-SSD on-device after model download | Generic classes only. Personal medicine boxes/spectacles need the later object-learning feature. |

To use Ollama, install it separately, choose and download a local model suitable for your hardware, and confirm it appears in `ollama list`. Set `LLM_PROVIDER=ollama`, `MOCK_PROVIDERS=0`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, and `OLLAMA_MODEL` to that installed model's exact name in `.env`. Set `OLLAMA_NO_CLOUD=1` in the Ollama application's environment and restart Ollama for local-only operation. Sollu does not install models automatically. See [verified provider notes](docs/PROVIDERS.md) for the API and privacy limits.

The future paid upgrade path is Anthropic intent, evaluated Sarvam STT, and consented ElevenLabs cloning/TTS. **These paid adapters are not connected in this build; adding keys alone does not enable them.** The implemented intent routes are mock and local Ollama. A production server requires `ACCESS_CODE` and a persistent `SERVER_SECRET` of at least 32 bytes. Keep secrets in server configuration. Paid integration, retention and deletion need implementation and real account checks. [Provider ledger](docs/PROVIDERS.md)

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
