# Sollu · சொல்லு

Say it. In your words. In your voice.

Tamil-first communication aid prototype for BME Ignite Hackfest 2026, Team echo. A fragment, topic or photo leads to candidate sentences; the person taps the exact sentence they want spoken. Includes a caregiver view, measured picture-board comparison and local communication log.

**No paid API key is needed to run the default demo.** Mock output is deterministic and must stay visibly labelled. Free device speech and exact-phrase own-voice recordings are distinct from generative voice cloning. Tamil recognition and Tamil device voices depend on the browser/device. This is a prototype; real-phone, native-speaker and clinic acceptance are tracked in [PROGRESS.md](PROGRESS.md).

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
| Candidate generation | Deterministic mock now; optional local Ollama model | Mock is a rehearsal tool. Ollama needs an installed model and sufficient local hardware; Tamil grounding and speed need evaluation. |
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
