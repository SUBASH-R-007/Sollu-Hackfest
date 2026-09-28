# SOLLU — conversation and implementation handoff

Updated 2026-09-28, Asia/Calcutta, through the Tamil navigation fix and the user's request to commit and push the current work. This is the continuation context for a new chat: user intent, decisions, implemented behavior, code locations, actual verification, and remaining work. It is a consolidated handoff, not a verbatim transcript or a claim that every original full-product milestone is finished.

## Latest status — supersedes historical snapshots below

- The user requested `git push` for all current app work on `codex/sollu-local-mvp`, tracking the same branch at `https://github.com/SUBASH-R-007/Sollu-Hackfest`. This handoff is being included with that commit. Use `git status`, `git log` and the remote branch to establish final commit/push state; the uncommitted/unpushed descriptions below record earlier milestones.
- Later additions include local clinician appointment planning at `/appointments`, appointment review in the clinician dashboard, and the requested feature overview documents in `output/pdf`. Appointment entries are local requests, not confirmed remote bookings.
- Sentence APIs now have a separate device text-sharing permission. The local ignored `.env` enables `ALLOW_CLOUD_AI=1` at the user's request; committed defaults still use `0`. Keys and provider-specific consent remain required. The microphone is independent and still defaults local. No keys are committed, and no real paid-provider request has been verified.
- Speech recognition now has precise error messages, actual-start indicators, startup deadlines, retry/cleanup fixes, and a local-language capability check. General, Sentence engine and Privacy show the speech chooser. Local support checking does not record, install a pack or change privacy. Verified 60 focused unit tests, 11 browser cases, TypeScript, lint and the web/PWA build; real microphone/Tamil/browser-provider checks remain pending.
- Tamil main navigation now uses **மறுவாழ்வு** and **சிகிச்சை நிபுணர்**, with related navigation/shortcuts translated through the shared dictionary. Verified in the running Tamil interface and with TypeScript/lint. Native-language approval remains pending in `docs/LANGUAGE_REVIEW.md`.
- The last inspected user browser was `http://127.0.0.1:5173/settings?tab=llm` and still showed caregiver PIN creation. The user said they would finish Settings themselves; do not create or guess their PIN. `localhost` and `127.0.0.1` keep separate browser data. Full detail and current verification are in `PROGRESS.md`.

## 1. Read this first

**Latest follow-up (v9): multiple API sentence options.** API prompting now targets two or three grounded distinct meanings, and validated prepared alternatives can fill spare slots after valid model output. Explicit abstention remains empty; deduplication, negation, rejected meanings and local-only privacy protections stay intact. No extra provider call is made. `Session.moreCandidates` retains validated choices beyond the caregiver's initial display limit; **Show more options** reveals them silently and updates the displayed round before rejection. Context/privacy changes clear hidden choices. `ConfirmPage` labels AI drafts and prepared options separately. Changed prompt/selection code is in `apps/server/src/lib/contextualPrompt.ts` and `intent.ts`; reveal behavior is in `apps/web/src/state.tsx` and `pages/Patient.tsx`. 816 unit tests, repository ESLint, web/server types and both production builds passed; **29 distinct browser cases passed across runs**, including the five new regressions. See [v9 verification](docs/evidence/v9/VERIFICATION.md) for initial fixture corrections and synthetic-provider scope. No real API key or paid request was used. All v6–v9 work remains local and unpushed.

**Previous request (v8):** user requested a separate Rehabilitation tab, more progress features and the clinician dashboard. Main navigation now exposes `/rehabilitation` and gated `/clinician`. The hub has Overview/Progress, personal weekly targets, daily activity, goals/plan, recent records, rest guidance, 7/28-day language/method filters, measured-time coverage, understanding, fatigue/effort and reviewed words to revisit. Clinician Overview adds an oldest-first administrative review queue, evidence/transcript filters, measurement coverage and actions focusing the exact local record, plan or report transfer. Existing `/practice` and `/therapist` remain. Views share existing records without copying them; AAC tasks and the AAC method count participation while staying outside speech accuracy. [Workflow](docs/REHABILITATION.md), [v8 evidence](docs/evidence/v8/VERIFICATION.md).

**Current v8 verification:** 809 unit tests / 35 files, repository ESLint, web TypeScript and production web build passed. **65 distinct browser cases passed across runs:** initial full suite 61/65, followed by all six new cases passing after selector corrections; the original 59 cases passed unchanged. Final mobile/desktop checks across **16 views** passed without page overflow, serious/critical Axe findings, page/console errors, external HTTP requests or automatic audio/recognition; checked navigation targets were at least 72 px. Final build: main 685.49 kB / 205.10 kB gzip, Hub 18.45 / 5.73, Therapist 82.98 / 23.29; 77 PWA precache entries / 2892.66 KiB. [Current evidence](docs/evidence/v8/VERIFICATION.md). Earlier v6/v7 counts below are historical. All v6–v8 changes remain local, uncommitted and unpushed.

**Preserved v7 jury review:** user attached advice beginning “One-word answer: Potentially” and authorized necessary implementation changes. Added `requiresPredefinedCommunication` to shared/browser/server: recognized health/help input uses authored wording or clarification before any model/cache, with actual catalog provenance. This is bounded communication routing, never emergency detection/triage. Reports now carry fixed `reportScope` interpretation metadata through JSON/encrypted JSON/CSV/print; old v1 imports get safe defaults, false validation claims are rejected. Both CSVs add a `record_type` and metadata row. Missing time no longer becomes zero. `inferenceContext` filters optional contacts/vocabulary against explicit input/question/listener while preserving local interpretation. Settings adds supported selection and actual retention disclosures; confirmation instructions and Home privacy copy are accurate. Preserve multi-condition access rather than the attachment's diagnosis-based restriction. [Jury review](docs/JURY_READINESS.md), [demo](docs/DEMO_SCRIPT.md).

**Historical v7 verification:** 789 unit tests / 33 files; 59 distinct browser cases passed across full run + targeted rerun; 240 catalog fixtures; lint, all types, final web/API builds and mobile/desktop visual/accessibility checks. [v7 evidence](docs/evidence/v7/VERIFICATION.md) includes initial fixture corrections and exact scope. Main entry 683.14 kB / 204.44 kB gzip; 72 precache entries / 2848.38 KiB; API 205.94 kB.

**Previous recognition follow-up:** Google / browser online versus Local is implemented in General and Privacy. Local defaults on; online requires relaxing device protection plus explicit mode selection. Restoring privacy resets Local. `features/privacy/recognitionPreference.ts` stores only the mode token in localStorage, outside backups; the shared browser policy enforces it in Speak/practice. Changes stop active recognition across tabs without reopening microphones. The vendor cannot be guaranteed to be Google; no real online audio was sent. [Earlier evidence](docs/evidence/v6/SPEECH_RECOGNITION.md).

- **Project:** Sollu (சொல்லு), a Tamil-first communication companion and communication-practice prototype for BME Ignite Hackfest 2026, Team echo, Rajalakshmi Engineering College, Chennai. Tagline: “Say it. In your words. In your voice.”
- **Workspace:** `C:\Users\SUBASH\OneDrive\Documents\GitHub\Sollu-Hackfest`.
- **GitHub:** <https://github.com/SUBASH-R-007/Sollu-Hackfest>.
- **Branch:** `codex/sollu-local-mvp`, tracking `origin/codex/sollu-local-mvp`.
- **Last committed and pushed implementation:** `d407a44` — `Add rehabilitation practice and therapist review dashboard` (v5).
- **Push:** the earlier user-requested push includes `d407a44`. The newer **v6–v8 changes are local, uncommitted and unpushed** at this update. No PR, merge, or deployment was performed. Recheck Git before assuming this remains the final commit state.
- **Working tree:** contains the current v6–v8 implementation, tests, research/docs and evidence, plus this still-untracked `HANDOFF.md`. Preserve this work; the checkout is intentionally not clean.
- **Runtime:** existing web app on `http://localhost:5173/` and API on `http://localhost:8787/api/health` remain running. Root verified web HTTP 200 and API `local-only` / `allowCloudAI:false`. Use **`/api/health`**, not `/health` (the latter serves SPA HTML). Recheck before starting duplicate servers. The temporary v6 production-verification server on **8792 was stopped** after successful offline checks.
- **Current user page:** latest supplied ambient context was `http://127.0.0.1:5173/practice`. `localhost` and `127.0.0.1` have separate browser storage; use the person's existing origin. Browser-tab state may change and is not authorization to alter user data.
- **Latest task:** rehabilitation/clinician navigation and progress features are implemented and verified in scope; use the v8 evidence for final visual/build details. Preserve earlier rehabilitation/privacy work; engineering checks do not establish clinical efficacy or regulatory compliance. No upcoming commit/push should be assumed.

### Preserved v6 foundation

- Cloud sentence APIs fail closed by default at the server, settings boundary and actual adapter. `ALLOW_CLOUD_AI=1` is an explicit operator opt-in; existing keys or forged/stale browser settings cannot override the default. Do not enable cloud merely because the earlier user said they might obtain an OpenAI key.
- Device local-only protection defaults on, including migrated settings. Only browser voices marked local and supported on-device recognition are permitted; legacy recognition and external object-model downloads are blocked. A synchronous same-origin policy latch and dispatch checks close stale-tab/revocation gaps. Typing, Topics, AAC and local recordings remain available.
- Deterministic catalog fragment repair handles supported stutters/repetitions, split syllables and unique everyday prefixes in English, Tanglish and Tamil. The confirmation screen exposes the proposed `original → interpretation`; original input is retained. Ambiguous or unsupported details clarify rather than being silently removed. Reviewed personal corrections take precedence and remain scoped.
- Therapist review now includes reviewed target-word matches, omissions, substitutions, extra transcript words, denominators, language/method filters, weekly coverage and a chosen word → practice flow. These are transcript comparisons, not pronunciation or recovery measures.
- Recommended report transfer is passphrase-encrypted JSON with AES-256-GCM and PBKDF2-SHA256/600,000 iterations. Plain JSON/CSV is an explicit alternative. Recording downloads remain separate, consented and unencrypted; IndexedDB remains unencrypted by the app.
- Historical v6 checks: **731 unit tests / 30 files**, **54 distinct browser cases across runs**, **240/240 authored catalog evaluations**, repository ESLint/all TypeScript checks, both production builds, mobile/desktop visual/accessibility checks and compiled-offline practice/word metrics/encrypted download. See section 10 for scope and build measurements.
- The unanswered jurisdiction/use clarification remains open: “HIPPA, PHI, CDSEO” is interpreted as **HIPAA, protected health information and CDSCO**. Working assumption: Indian college demonstration, with future clinical use requiring separate qualified assessment. No compliance, de-identification, clinical-grade validation or regulatory clearance is claimed.

The user requested ambitious rehabilitation features and “MAKE NO MISTAKES.” We implemented and tested the engineering scope, but explicitly did **not** promise perfection, clinical efficacy, diagnostic capability, or acoustic-model training. Preserve that distinction.

## 2. User requests and authorization history

In chronological order:

1. The user pasted the full master build prompt. Its original attachment was `C:\Users\SUBASH\.codex\attachments\ffdc6926-2915-4247-b90d-4027d54f8f28\Pasted text.txt`. The canonical preserved copy is [docs/SPEC.md](docs/SPEC.md); use the repository copy rather than depending on the attachment.
2. They clarified: no paid API keys initially, provide an additional free alternative; do not worry about hosting; implementation approved.
3. They asked to start the app.
4. They requested deep research and an implementation plan first for more aphasia support, innovative widgets, accurate content, no contradictory/repeated options, and better vocabulary. They then said “go,” approving implementation.
5. They requested an LLM engine that understands context and frames sentences, said they would have an OpenAI key, requested other API options in Settings, and additional caregiver customization.
6. They requested a context engine using time, location and routines to suggest what the person may be trying to communicate.
7. They reported `/` redirecting to `/care` and asked for a fix. This was fixed in v5 and remains preserved.
8. They requested speech therapy/rehabilitation: prompted sentences, recording, scoring, model personalization/training, a complete dashboard, weekly tracking, therapist reports with audio/video evidence, frequently missed words, response time, communication success, taps/seconds per sentence, statistical and clinical reporting.
9. They explicitly broadened scope beyond post-stroke aphasia to **dysarthria, ALS, laryngectomy and late-stage Parkinson's**, requested morning/evening/night context, routines learned from prior logs, and integration with therapy and communication tools. They authorized research and implementation, with additional essential features where useful.
10. After implementation, they requested a GitHub push. It succeeded to the branch above.
11. They requested complete continuation context in `HANDOFF.md` for a new chat; the initial v5 handoff was created locally and not pushed.
12. They requested robust broken words/phrases, a missed-word/accuracy dashboard, jury concerns about OpenAI privacy and “HIPPA, PHI, CDSEO,” and the rehabilitation/context scope again. This became **v6**, retaining v5 features while improving gaps.
13. They requested a Google/local recognition toggle; it is implemented with the existing privacy gate and explicit online opt-in.
14. They attached jury guidance and authorized necessary changes. **v7** added prepared health/help routing, report interpretation contracts, context minimization and accurate privacy/selection disclosures.
15. They requested Rehabilitation as a separate tab, more progress features and the clinician dashboard. This is the **v8** implementation described above. No new push or hosting request was made.

Persistent preferences: act on authorized work, do not repeatedly ask for approval already given, keep a usable no-key path, prioritize patient control and accurate/noncontradictory choices, and do not host yet. The latest privacy request takes precedence over the earlier willingness to use OpenAI: cloud processing is now blocked by default, not replaced automatically with another cloud vendor. The user has not supplied a real API key in the recorded work. No real cloud inference, paid calls, model downloads, report sending, or deployment was performed.

The clinical-grade dashboard and training aspirations are broader than what can truthfully be validated by code alone. The implemented local review workspace, text matching and explicit correction personalization are documented below; actual clinical validation and acoustic fine-tuning remain outstanding.

## 3. Source-of-truth documents and stale-document traps

Read in this order when resuming:

1. [CLAUDE.md](CLAUDE.md): repository working guide and invariants.
2. This file and the **current v8 section** of [PROGRESS.md](PROGRESS.md). Earlier milestone ledgers retain historical evidence for preserved features.
3. [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/PLAN.md](docs/PLAN.md): approved changes to the original brief.
4. [docs/REHABILITATION.md](docs/REHABILITATION.md): actual rehabilitation workflows, metric definitions, privacy, and limitations.
5. [docs/REHABILITATION_RESEARCH.md](docs/REHABILITATION_RESEARCH.md): 11 primary/authoritative sources and the reasoning behind scope boundaries.
6. [docs/PRIVACY_AND_VALIDATION.md](docs/PRIVACY_AND_VALIDATION.md): privacy/legal research and validation protocol; [docs/evidence/v8/VERIFICATION.md](docs/evidence/v8/VERIFICATION.md): current verification record. Earlier v5–v7 evidence remains historical.
7. [docs/CONTEXT_ENGINE.md](docs/CONTEXT_ENGINE.md), [docs/PROVIDERS.md](docs/PROVIDERS.md), [docs/PRIVACY.md](docs/PRIVACY.md).
8. [docs/SPEC.md](docs/SPEC.md): original full brief, including still-deferred future milestones.

Additional useful documents: [README.md](README.md), [docs/APHASIA_IMPROVEMENT_PLAN.md](docs/APHASIA_IMPROVEMENT_PLAN.md), [docs/IMPROVEMENTS_ACCEPTANCE.md](docs/IMPROVEMENTS_ACCEPTANCE.md), [docs/LANGUAGE_REVIEW.md](docs/LANGUAGE_REVIEW.md), and [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

**Precedence pitfalls:**

- The original brief targets post-stroke aphasia and early hosting. The later user requests broadened conditions and explicitly deferred hosting.
- Old v1/v2 milestone rows still describe routines, therapist features or therapy as deferred/excluded. Later v4–v8 sections supersede implemented portions; old rows are historical, not current blanket exclusions.
- The older evidence log says “nothing pushed”; that described 2026-09-27. v5 through `d407a44` is pushed, while v6–v8 changes are not.
- The original bundle-size register is historical; use the latest evidence file. The main entry already exceeded the original 200 kB gzip target before v8.
- `/setup` redirects to `/settings`; it is not a dedicated onboarding wizard. Fictional demo settings already exist by default.
- Passing fixtures or browser automation is never evidence of native-language approval, actual phone audio quality, clinical benefit, or real-provider quality.

## 4. Architecture and local operation

The repository is a pnpm monorepo with strict TypeScript and shared Zod contracts:

| Location | Purpose |
| --- | --- |
| `apps/web` | React 19 / Vite 8 PWA, React Router, Dexie/IndexedDB, local patient/caregiver interfaces |
| `apps/server` | Fastify 5 thin API, device capabilities, provider adapters, signing and encrypted caregiver relay |
| `packages/shared` | Schemas, controlled vocabulary, candidate policy, grounding and context engine |
| `tests/e2e` | Playwright browser workflows |
| `evals` | Controlled intent evaluation and recorded local-model benchmark |
| `docs/evidence` | Dated verification, screenshots and repeatable smoke scripts |

Environment used: Windows PowerShell, Node **22.17.1**. Required Node is `>=22.12`; pinned package manager is **pnpm 11.19.0**. Installed `pnpm.cmd` was discoverable through the Codex runtime fallback path. Use repository manifests and lockfile, not guessed dependency versions.

Normal commands from the repository root:

```powershell
pnpm install
# Only when .env does not already exist; never overwrite private local settings:
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item .env.example .env }
pnpm dev
```

Vite normally runs on **5173**, API on **8787**, both on loopback. Vite uses a strict port and proxies `/api` and `/ws` to the API. Preserve existing servers if healthy. The API loads the repository-root `.env`. Do not print, commit, or copy real secret values into chat or documents.

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm e2e
pnpm eval
pnpm verify
pnpm build
pnpm start
```

- `verify` chains lint, all workspace typechecks, unit tests and E2E.
- Production `start` runs the compiled API, which can serve the built web app. Default port remains 8787 unless configured.
- E2E reuses an existing server outside CI; otherwise starts `pnpm dev`. One worker, mobile viewport, Asia/Kolkata timezone. Avoid competing full browser runs against shared resources.
- Playwright configuration discovers an installed Chromium on Windows. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing executable. Do not download a browser/model merely because an agent wrapper is missing.
- In this environment the agent-browser CLI was unavailable; Playwright was used for verification. Installed Chromium 151 was used for v5 evidence.
- Direct commands used when wrappers were inconvenient: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` (the successful complete v6 run used this bounded worker count); root ESLint/TypeScript binaries; from `apps/web`, `node node_modules/vite/bin/vite.js build`; from `apps/server`, `node node_modules/tsup/dist/cli-default.js`.
- API build initially hit sandbox parent-directory access; the authorized escalated local build passed. Git writes/push also used approved escalation because `.git` was restricted. There was no automatic-review rejection needing user action.
- Phone microphone/camera/PWA installation needs a secure context. Local desktop HTTP success is not HTTPS phone acceptance. Hosting remains deferred.

## 5. Patient and caregiver navigation

| URL | Behavior |
| --- | --- |
| `/` | Patient Home; no remembered-caregiver redirect |
| `/speak`, `/type`, `/topics`, `/camera` | Input paths; alternatives remain available if recognition fails |
| `/question` | Partner-question input |
| `/confirm`, `/speaking`, `/help` | Candidate confirmation, output and Help |
| `/phrases`, `/recent`, `/people` | Saved phrases, recent communication and contacts |
| `/tools` | Communication tools and the practice entry |
| `/words`, `/scenes`, `/stories`, `/passport`, `/draw` | Vocabulary, photo-message scenes, scripts, passport and drawing |
| `/repair`, `/comfort`, `/sentence` | Communication repair, comfort messages and small request/refusal builder |
| `/rehabilitation`, `/rehabilitation?tab=progress` | Personal plan, weekly target and filtered local progress |
| `/practice` | Communication practice/recording; saved-attempt link back to Progress |
| `/clinician` | PIN-gated clinician overview and administrative review queue |
| `/clinician?view=rehab`, `/clinician?view=log` | Detailed rehabilitation review or everyday communication log |
| `/therapist` | Preserved PIN-gated route; defaults to rehabilitation review |
| `/settings?tab=llm` | Sentence engine/provider settings |
| `/settings?tab=context` | Time/place/routines, reviewed routine learning |
| `/settings?tab=voice` | Consented exact-phrase Voice Studio |
| `/settings?tab=privacy` | Local-only protection, server policy status, local storage/transfer boundaries and deletion controls |
| `/settings` | Other caregiver/access/personalization settings |
| `/care` | Explicit caregiver companion/pairing route |
| `/baseline`, `/demo` | Baseline board and guarded demo/rehearsal tools |

Caregiver Settings, Clinician, Therapist and Demo use the local four-digit PIN gate. If no PIN exists, the gate creates one; otherwise the user's existing PIN is required. **Do not guess/reset the user's PIN.** Test fixtures use their own isolated browser storage and a test PIN, which is not proof of the user's PIN. The gear supports a two-second hold and keyboard entry; direct family routes open the gate. Unlock state is in memory. This is accidental-edit protection, not clinician identity authentication or disk encryption.

Settings tab IDs are `general`, `personalize`, `llm`, `context`, `voice`, `link`, and `privacy`.

Use separate browser profiles/contexts for patient and caregiver pairing tests. Two tabs sharing storage are not independent devices. The caregiver must explicitly enable alerts and keep the companion page available.

## 6. Implemented communication and LLM features

### Default free communication

- Controlled bilingual catalog with **124 complete-message meanings**, Tamil/English/Tanglish lookup, grounding, duplicate/rejection filtering and bounded clarification.
- Personal words/aliases/descriptions; pin/hide/edit/delete; approval required before everyday use, including fresh approval after edits/import.
- Photo scenes with selectable messages, prepared conversations, printable communication passport, word finder and drawing.
- Persistent Help/repair/Pause/Stop, partner-understanding checks, draft recovery, comfort phrases, small request/refusal builder.
- Access options include size/contrast, choice count, repeated-tap filtering, listening pauses, speech pace, quiet mode, reduced motion and two-step confirmation.
- Free device speech and consented exact-phrase recordings. Recordings only speak the exact recorded phrase; they are **not** generative cloning.
- Browser speech recognition is device/browser/language dependent. **v6 defaults to supported `processLocally` recognition with an already installed pack; unsupported browsers fail without remote fallback.** Vendor recognition is only possible after the caregiver explicitly relaxes device protection. Type/Topics remain fallback inputs.
- COCO-SSD camera flow is generic on-device object labeling after model download, not learned recognition of arbitrary personal objects. v6 blocks external model downloads while local-only protection is on; an already-started download cannot be aborted through that library but a revoked result is discarded and never cached. No photo is uploaded by this path.
- Encrypted caregiver relay and local durable outbox, receipts/replay protection; Help expiry 60 seconds and ordinary-message expiry five minutes. Receipt is not proof of understanding.
- Encrypted personal backup/import preview with non-overwriting merge. Credentials, pairing secrets and PIN are excluded.

### Sentence engine

Implemented provider choices: **Free vocabulary, OpenAI, Anthropic Claude, Google Gemini, Groq, local Ollama**. **Only free vocabulary and loopback Ollama are eligible under the default v6 server policy; cloud choices are disabled.** Editable model IDs and bounded deadlines remain. Provider adapters already exist; do not rebuild them from scratch.

- OpenAI Responses, Anthropic Messages, Gemini generateContent, Groq Chat Completions, and local Ollama use a structured response contract.
- Generated sentences are visibly **“AI draft · Check the meaning.”** Grounding checks include evidence spans, explicit detail, language, negation, body side, quantities and repeated/excluded meanings. These checks do not prove semantics.
- Provider failures/invalid results/timeouts lead to controlled vocabulary or clarification, not silent upload to another cloud vendor.
- Keys entered through Settings live only in server memory, scoped to the authenticated device, and expire on restart or 12 hours of inactivity. They are not echoed or stored in browser persistence/backups.
- Private environment keys are supported separately only when the operator permits cloud processing. With `ALLOW_CLOUD_AI` absent or anything other than exactly `1`, cloud defaults fall back to the catalog and keys cannot activate a provider. Removing a session key does not remove an environment key. Never use `VITE_` credentials.
- Cloud text sharing requires operator policy, an explicit device provider/consent configuration and device local-only protection being relaxed. Personal context and confirmed recent-message sharing have separate switches, off by default. Environment credentials alone do not authorize sharing. Forged browser policy fields cannot override the server gate.
- `/api/intent` accepts a top-level `localOnly` boolean that defaults **true** and is not part of the stripped context schema. The browser rechecks the synchronous policy latch after asynchronous device registration and before dispatch; it never weakens an already-local request. A selected cloud provider becomes the catalog for local-only requests; loopback Ollama remains allowed.
- Device protection changes stop pending input/output/inference, clear current candidates and propagate across same-origin tabs. Settings writes merge the latest persisted values and check a policy version so unrelated/stale saves cannot silently re-enable sharing. Missing or unreadable latch storage grants no permission.
- Recent context is bounded to at most three explicitly confirmed chosen messages in the last ten minutes, matching listener/place/language.
- Wording preferences: brief/natural/polite, maximum 8/12/18 words, communication note and first Home input tile.
- A synthetic Test connection is available but can spend provider quota. No real key or paid call has been used in this work.
- Ollama endpoints are loopback-only; redirects and cloud-tagged model names are blocked. Configure the separate daemon with `OLLAMA_NO_CLOUD=1` and review its/model behaviour; an endpoint check cannot audit an arbitrary local process. Do not install/download models without authorization. An earlier installed `llama3:latest` selector benchmark timed out on 20 eligible requests at eight seconds; this is **not** an evaluation of the new generation path or proof all local models fail.
- Cloud STT, paid TTS and generative voice cloning remain unimplemented.

### Broken words and phrases (v6)

- Catalog-only deterministic repairs use existing nonclinical words: completed-word stutters (`w-w-water`, `wa…water`), repeated words, explicit splits (`wa-ter`, `than-ni`, `தண்-ணீர்`) and sufficiently long unique everyday prefixes (`wate`, `coff`, `தண்ணீ`). No broad edit-distance/phonetic guessing or free completion of clinical words was added.
- Original input remains in the confirmation header, context evidence and saved attempt. A visible `.candidate-reading` displays the proposed interpretation before speech; the exact-sentence tap remains mandatory.
- Ambiguous prefixes, competing positive/refusal forms, unsupported numbers, body sides, names, clinical fragments, mixed scope and unknown qualifiers abstain. Tamil quantities and unknown remainders receive additional checks. These bounds do not guarantee every broken phrase will be understood.
- Confirmed personal heard-to-intended mappings precede generic repair, respect language/place/listener scope, replace whole-token boundaries, do not chain and survive catalog grounding. Competing mappings clarify rather than choosing the most frequent one.
- Model-authored provenance still uses the original input; repair does not make unsupported model evidence valid. No recognizer is fine-tuned and no audio is sent through this repair layer.

### Context engine

- Shared routine ranking uses explicit fragment/topic, time proximity and manually selected place; no GPS.
- Real or clearly labeled demo clock; source toggles; 15/45/90-minute windows; weekday-aware matching across midnight.
- Reviewed routine add/edit/delete/undo and draft preview. Fictional seed routines do not affect real-clock suggestions until reviewed.
- A unique, compatible nonclinical routine can help interpret an ambiguous “usual”/food/drink cue. Competing clues or explicit contradictions lead to clarification.
- Explicit object, refusal, uncertainty, time and place outrank ambient context. A schedule never proves an event happened or supplies medication details.
- Patient confirmation shows expandable context clues. Home, Topics and intent requests use consistent context matching.
- User-approved learned routines now come from a conservative local scan of confirmed everyday logs; details below.

## 7. Implemented rehabilitation and therapist workspace

### Profiles, plans and practice

- Profiles: aphasia, dysarthria, ALS/motor neurone disease, Parkinson's, laryngectomy, and Other communication needs.
- Communication methods: natural speech, AAC, electrolarynx, TEP, oesophageal speech and mixed methods.
- Editable goals, clinician-agreed instructions, personal targets, weekly record goal, short-session preferences and fatigue/rest thresholds.
- Functional English word/sentence/script/AAC library, custom Tamil/English targets, recent confirmed messages and reviewed marked-word suggestions.
- New interface is mainly English; Tamil custom targets work. Full translation and native clinical/language review remain pending.
- Profiles change guidance and chosen method; they do not implement separate validated treatment protocols or diagnose disease/stage.
- Rest, skip, Stop, typing and AAC remain legitimate choices. No universal strengthening, breath, swallowing or forced-loudness prescription; no automatic intensity escalation.

### Capture and transcript provenance

- Optional audio/video recording requires per-attempt consent. Silent camera preview, explicit review/discard/save, no autoplay or background capture.
- Capture is bounded to 120 seconds or 20 MB. Schema permits individual media up to 25 MB; total local media allowance is 250 MB.
- Permission denial, pre-abort, pending-permission cancellation, late granted tracks, page hide/unmount, Stop and size/time limits are handled.
- Attempt and media save atomically in separate Dexie database **`sollu-rehab`**, active patient ID `local-patient`.
- Target/kind/language/method/place are captured at Start, so edits to the plan cannot alter the reference midway through an attempt.
- **Saved clips are not automatically transcribed.** Enter/review the words actually heard while replaying the clip. Starting a new recording clears the old transcript.
- Browser recognition has separate explicit consent and captures a **separate live attempt**. With v6 local-only protection on it requires supported on-device recognition; after explicit relaxation it may contact the browser vendor. It is disabled when a saved clip is present, avoiding false linkage between two performances.
- Raw transcript, source, reviewed transcript status, target, selected words, fatigue/effort, person/partner feedback and timing remain distinguishable.

### Scoring, words and metrics

- **v8 consistency:** both AAC tasks and any word/sentence/script record using `communicationMethod: "aac"` are excluded from speech/text-match and missed-word denominators. They count toward saved participation and AAC completion; practice says **Not scored · communication aid**. Missing response measurements never become zero.

- Text-match score: `max(0, 1 - token_edit_distance / target_token_count) * 100`, using Unicode-aware token alignment for insertion/omission/substitution.
- This is **not an acoustic, pronunciation, intelligibility, disease severity, or recovery score**. Empty/missing transcript stays unscored; unreviewed feedback is provisional and excluded from reviewed aggregates. AAC does not receive a speech text-match aggregate.
- “Words marked for practice” counts a reviewed selection at most once per attempt. It must not be renamed “proven missed words.” Free speech has no known target; confirmed everyday corrections are shown separately.
- **v6 word analysis:** recomputes alignments from reviewed target/transcript text. `target-word match = matched target occurrences / all target occurrences`; repeated target words count separately. Omissions and substitutions are separate from extra transcript words, which have no invented target denominator. This differs deliberately from sentence edit similarity, which penalizes insertions.
- Word tables show matched/opportunities, omission/substitution counts, record count, separately marked-record count, language, method and last observation. Filters/search and weekly tables show eligible sample sizes and missing/unreviewed/AAC/text-omitted coverage. A redacted import cannot recreate hidden words. Imported summary scores remain sender-supplied and unverified where text is omitted.
- “Practise” on an eligible local word carries its word/language/method into practice, checks the current plan and never auto-starts speech or recording. Imported patient snapshots do not become the local editable practice profile.
- Person, partner and reviewer understanding are separate observations.
- Everyday communication success is explicit `understood / (understood + needs_repair)`, with unassessed/demo counts and coverage visible. Playback alone is not success.
- Communication taps/time measure interaction through **speech start**, not completed playback. Practice response time runs from Start to the first response marker (such as transcript entry, recording start or explicit AAC completion), not acoustic voice onset. Rest resets that measure; recording duration includes silence.
- Weekly activity, active days, individual goals, fatigue, medians, IQR, sample sizes, descriptive intervals and comparable target/language/method groups are available. These describe observations; they do not establish causal improvement.

### Dashboard and reports

- **v8 patient hub:** `/rehabilitation` has Overview and Progress. The weekly goal counts each local saved record once since Monday across all languages/methods. Progress filters 7/28 local calendar days, language and method; future records are excluded. Daily activity, measured response-time coverage, understanding, fatigue/effort, AAC completion and reviewed words use the same saved records. Clock/focus refresh prevents stale weekly counts. Choosing a word prefills manual practice without automatic capture or audio.
- **v8 clinician overview:** `/clinician` defaults to Overview; `?view=rehab|log` selects detailed views. The queue is oldest first within the selected 7/28-day period, with evidence and transcript-confirmation filters. It is administrative, not a clinical urgency ranking. Actions open/focus the exact local record, plan or transfer panel. Imported snapshots remain separate from the active local profile.

- `/therapist` has **Rehabilitation review** and a separate **Communication log** view, preventing imported rehabilitation snapshots from being confused with current local logs.
- Profile/plan editing, weekly summaries/charts, attempts, reviewed words, raw/source provenance, notes and reviewer observations; central gated recording playback and deletion.
- Printable selected view, report exports with date/participant/provenance/scoring version/evidence IDs. Personal content is excluded by default; clip downloads require separate consent.
- **v6 recommended transfer:** passphrase-encrypted report JSON, using AES-256-GCM with a fresh 16-byte salt/12-byte IV, a 128-bit authentication tag and PBKDF2-SHA256/600,000 iterations. The fixed protocol parameters are authenticated; envelope type/version/length/parameter checks precede derivation, then the decrypted report undergoes normal validation. Wrong passphrases and tampering fail without importing a preview.
- Passphrases are never persisted by Sollu, require 12–512 characters, and clear after transfer/visibility changes or consent revocation. Encryption authenticates knowledge of the passphrase, **not therapist identity or clinical sign-off**. Import first previews, then requires separate consent to keep a local snapshot.
- Plain JSON/CSV remains inside an explicit unencrypted-export alternative. Print and separate consented audio/video downloads are **unencrypted**. The encrypted JSON does not include clips and does not encrypt IndexedDB. Nothing is automatically emailed/uploaded/sent to a therapist; downloaded copies remain outside app deletion control.
- Up to ten validated read-only patient report snapshots in main database KV key `rehab-report-caseload-v1`. One active editable practice profile remains per device.
- Import preview/permission, bounded schemas/date windows (maximum 366 days), duplicate/timestamp/metric checks, recomputed included scores, truthful privacy flags, CSV formula escaping.
- Imported patient/reviewer identity is **unverified**. Imported evidence IDs never resolve local media or fetch remote files; unrelated local patient recordings cannot be played through an import.
- Local caregiver PIN is not an authenticated clinician portal, clinical sign-off or secure multi-patient service.

### Personalization and routine-learning integration

- Reviewed marked words suggest later practice targets, filtered by language and method where applicable.
- A caregiver-unlocked, person-reviewed transcript can create a **separately confirmed** heard-to-intended wording mapping. Limits, duplicate/conflict checks and language/place/listener scope apply. Count starts at one; no fabricated frequency.
- Removal path: **Settings → Privacy → Memory & word corrections**.
- This personalizes local practice and intent interpretation. It **does not train an acoustic model** or upload recordings to an LLM.
- Actual future fine-tuning needs a chosen trainable recognizer, explicit dataset consent, labeled recordings, held-out evaluation and operational safeguards.
- Context Settings provides an explicit opt-in local routine scan: at least three distinct real dates in 90 days, same half-hour slot/daypart/place, understood selected supported nonclinical positive catalog concept.
- Demo/cache, clinical/negative/uncertain/unfamiliar content and all practice repetitions are excluded. Proposed label/time/weekdays/place require review; source logs are reread before save; duplicates are prevented.
- Existing personal-context sharing controls remain in force. There is no automatic inference that therapy repetitions are everyday needs.
- Time context uses seven existing buckets; therapy coarse dayparts align: morning 04–11, afternoon 11–17, evening 17–20, night 20–04.

### Deletion and backup

- Deleting a practice attempt cascades linked media and reviews. Individual media and imported snapshots can be removed.
- Erase device data clears both main data and the separate rehabilitation database; tested with a mid-attempt profile snapshot case.
- The existing encrypted personal backup **excludes therapy records and clips**. The UI says to use separate report/clip exports. Do not silently imply complete backup coverage.

## 8. Code map and important fixes to preserve

| Files | Role / maintenance notes |
| --- | --- |
| `apps/web/src/App.tsx` | Lazy `/practice`, routes/PIN; removed remembered-role root redirect. Explicit `/care` remains. |
| `apps/web/src/state.tsx`, `db.ts`, `lib/context.ts` | Shared app state, local data and request/context assembly; inspect actual exports before edits. |
| `packages/shared/src/schemas.ts`, `candidatePolicy.ts`, `modelGrounding.ts`, `contextEngine.ts`, `vocabulary.ts` | Contracts, constraints, context and catalog. Avoid competing schema edits. |
| `packages/shared/src/fragmentRepair.ts`, `fragmentRepair.test.ts`; `mock.ts`, `vocabulary.ts`, `modelGrounding.ts` | v6 conservative repair, scoped whole-token correction precedence and catalog grounding; preserve original model evidence |
| `apps/server/src/lib/intent.ts`, `contextualPrompt.ts`, `validation.ts` | Contextual request handling/prompt/validation |
| `apps/server/src/providers/cloud.ts`, `ollama.ts`, `providerSettings.ts`; `apps/server/src/config.ts` | Existing provider/key/config implementation |
| `apps/server/src/app.ts`, `tests/privacy.test.ts` | v6 server privacy policy exposure, strict local-only request flag, sanitized logs and default/stale/forged-setting regression coverage |
| `apps/web/src/features/settings/LlmSettings.tsx`, `Personalization.tsx`, `ContextSettings.tsx` | Caregiver engine/preferences/context surfaces |
| `apps/web/src/features/privacy/browserPolicy.ts`, `PrivacyControls.tsx`; `lib/api.ts`, `api.privacy.test.ts`; `state.tsx` | v6 device policy, fail-closed cross-tab latch, late dispatch guard, state merge/revocation and caregiver privacy surface |
| `apps/web/src/features/rehab/model.ts`, `store.ts` | Schemas/library/profiles; separate atomic media storage |
| `apps/web/src/features/rehab/PracticePage.tsx`, `rehab.css` | Patient practice flow |
| `apps/web/src/features/rehab/RehabilitationHub.tsx`, `progress.ts`, `hub.css`, `useProgressClock.ts` | v8 patient Overview/Progress, scoped counts/coverage and clock refresh |
| `apps/web/src/features/rehab/RehabilitationNav.tsx`, `navigation.css` | Shared patient hub/practice/clinician links |
| `apps/web/src/features/rehab/ClinicianOverview.tsx`, `clinicianSummary.ts`, `clinician.css` | v8 overview, administrative review queue and explicit review actions |
| `apps/web/src/features/rehab/capture.ts`, `recognition.ts` | Bounded capture and separately consented live recognition |
| `apps/web/src/features/rehab/analysis.ts` | Text alignment, marked words and descriptive analysis |
| `apps/web/src/features/rehab/wordAnalysis.ts`, `WordAccuracyPanel.tsx` | v6 reviewed word opportunities/differences/coverage, weekly filters and chosen word → practice |
| `apps/web/src/features/rehab/TherapyDashboard.tsx`, `dashboard.css` | Plans, dashboard, review, local report snapshots |
| `apps/web/src/features/rehab/report.ts` | Export/import validation and privacy/provenance |
| `apps/web/src/features/rehab/reportEncryption.ts`, `EncryptedReportTools.tsx` | v6 bounded authenticated encrypted JSON export, decrypt-to-preview and passphrase lifecycle |
| `apps/web/src/features/rehab/learnedRoutines.ts` | Conservative local log-to-routine proposals |
| `apps/web/src/features/rehab/LearnedRoutinePanel.tsx` | Named export `LearnedRoutines`, embedded in Context Settings |
| `apps/web/src/features/rehab/PracticeCorrection.tsx`, `correction.ts` | Explicit reviewed wording mapping bridge |
| `apps/web/src/features/rehab/EvidencePlayer.tsx` | Patient/caregiver media review using central audio |
| `apps/web/src/features/audio/index.ts`, `tapGate.ts`, `review.test.ts` | Trusted review channel, fresh playback, cancellation and URL cleanup |
| `apps/web/src/pages/Therapist.tsx`, `Support.tsx`, `Settings.tsx` | Dashboard wrapper, practice tile, privacy/erase integration |
| `apps/web/src/features/personal/BackupPanel.tsx` | Explicit rehabilitation backup exclusion |
| `tests/e2e/rehab-practice.spec.ts`, `rehab-dashboard.spec.ts`, `learned-routines.spec.ts`, `rehab-state.spec.ts` | New browser coverage |
| `tests/e2e/fragments.spec.ts`, `privacy-local.spec.ts`; expanded `rehab-dashboard.spec.ts` | v6 fragment transparency/source retention, local privacy boundaries, encrypted reports/word metrics and practice navigation |
| `tests/e2e/rehabilitation-hub.spec.ts`; `progress.test.ts`, `clinicianSummary.test.ts` | v8 navigation/gate, saved-record counts, capture cleanup, filters, calendar rollover and AAC denominator consistency |

Specific regressions fixed during implementation:

- **Windows filename collision:** keep `LearnedRoutinePanel.tsx` distinct from `learnedRoutines.ts`. Naming the component `LearnedRoutines.tsx` caused TS resolution/casing trouble. Its named export can remain `LearnedRoutines`.
- Root-level runtime tests cannot assume `@sollu/shared` resolution; `learned-routines.spec.ts` uses the relative `../../packages/shared/src/index` import.
- Media review supports both patient/patient and caregiver/studio role/surface. Dashboard passes the caregiver flag. All output stays inside the central audio boundary.
- Older cleanup must not clear a newer playback using the same media element; lifecycle regression coverage exists.
- Rest resets readiness time; plan changes cannot mutate attempt snapshots; recording clears old transcripts; consent resets after save.
- Mobile dashboard grid requires `min-width: 0`; scrollable charts/tables need focusability and appropriate region labels.
- Synthetic video E2E uses canvas `captureStream(0)` plus explicit `requestFrame()` and waits for native encoder bytes. A preview clock advancing did not guarantee encoded media. Do not weaken production recording validation to accommodate an empty synthetic fixture.
- Repeated browser test examples that reload Home must explicitly choose **Start a new message** after draft recovery. A restored unfinished draft correctly shows **Take your time** instead of Home's Type tile; do not remove production recovery to fix a test fixture.
- Recognition harnesses must model `processLocally` support for local-only flows. Legacy/remote-only recognizers and voices are deliberately rejected under the default policy; do not weaken privacy to restore an older fixture's assumption.

## 9. Non-negotiable behavior and data boundaries

These are summarized from the repository guide and accepted design:

1. Only a fresh trusted activation on the exact displayed sentence may speak for the person. Neutral Listen preview and explicitly gated media review are separate channels, never automatic speech.
2. All audio output APIs live in `features/audio`. Tickets bind text/role/surface, are consumed once, and expire after 1500 ms at actual playback. Stop/newer activation cancels pending output; late preparation requires a new tap.
3. At most three distinct candidate options plus “None of these”; fewer is acceptable. Do not invent filler or repeat rejected meanings.
4. Do not invent medicines, doses, names, numbers, places, times or events from context. Explicit input outranks ambient inference.
5. No remote speech, autoplay, playback during prefetch, or speaking unchosen candidates as the person.
6. Help must work without AI with accurately labeled exact recording/device voice/tone/text fallback and honest delivery status.
7. Voice recording/use needs consent and supported deletion. Recorded phrase replay is not a clone.
8. Provider keys stay server-side. Cloud AI is blocked by default at server and adapter; permission is bounded per operator/device/source. No implicit sharing from a stored credential, a reviewed routine or old settings. A different cloud vendor is not automatically a privacy solution.
9. Personal data stays in the browser except documented bounded transfers. Online sentence requests still reach the same-origin Sollu server (same computer on localhost; a future remote host needs review), and explicit paired caregiver messages remain possible. No GPS, server content logs, hidden media upload or automatic therapist sending. “Local-only” is not a promise of zero network traffic.
10. Adult, accessible patient controls; large targets; no required patient gestures/time pressure; alternatives to speech remain available.
11. No fabricated clinical results, automatic diagnosis/prescription, human acceptance reports or model-training claims.
12. Never commit actual recordings, exports, real patient data, private browser state or credentials. Current screenshots/fixtures are synthetic.
13. Local-only processing, a PIN, vendor terms or encrypted exports do not establish HIPAA compliance, formal de-identification, CDSCO approval or clinical validation. IndexedDB is not application-encrypted, and imported reviewer identity is not verified. Preserve these disclosed boundaries.

## 10. Actual verification — do not inflate these results

**Latest v8:** 809 unit tests / 35 files; ESLint, web TypeScript and production web build passed (77 PWA entries). The full browser run passed 61/65; all six new cases then passed together after wrapping-label/stat-card selector fixes, giving **65 distinct passing cases across runs**, not one 65/65 execution. Mobile/desktop visual and accessibility checks passed in the examined views. See [v8 evidence](docs/evidence/v8/VERIFICATION.md) for exact scope and final build measurements. No paid/model calls, actual patient media or automatic transfers were introduced.

### Historical v6 evidence

Historical v6 results reported by the root implementation/verification agent on 2026-09-28 are below and recorded in [docs/evidence/v6/VERIFICATION.md](docs/evidence/v6/VERIFICATION.md). The visual/offline results were explicitly confirmed, not inferred from evidence filenames. Final spacing adjustment, lint/types/build and visual recheck also passed; the build measurements below include that refresh.

| Check | Historical v6 observed result and scope |
| --- | --- |
| Unit | **731 passing tests in 30 files**, complete run with `--maxWorkers=2`. |
| Browser | **54 distinct cases passed across runs**. Full 53-case run had 47 passes; six affected cases passed targeted reruns after fixture/implementation fixes. One new word → practice flow also passed. This is not a claim of one monolithic 54/54 execution. |
| Lint/types | Repository ESLint and all web/API/shared TypeScript checks passed. |
| Controlled intent evaluation | **240/240 authored catalog executions passed**. Development fixtures, not held-out user, acoustic-recognition, live-LLM or clinical measurements. |
| Builds | Both production builds passed. Main web entry **679.37 kB / 203.20 kB gzip**; Therapist **78.44 / 22.75 kB gzip**; Practice **19.70 / 7.21 kB gzip**. PWA **72 precache entries / 2835.06 KiB**. API **203.10 kB**. Main gzip exceeds the original 200 kB target; TensorFlow chunk warning remains. |
| Responsive/accessibility | At 390×844 and 1440×1000, privacy controls, word analysis and encrypted-report views passed visual/Axe checks, with no horizontal page overflow, serious/critical Axe findings, console/page errors, external HTTP requests or automatic speech. Final spacing recheck passed; the word table intentionally scrolls inside a keyboard-focusable region. |
| Production offline | Compiled v6 practice, word metrics and encrypted-report download passed offline checks. Temporary port 8792 server was stopped afterward. |
| Coverage boundaries | Includes original-fragment retention, repair visibility/refusal/ambiguity, default/stale/forged cloud settings, loopback-only routing, local voices/recognition, cross-tab revocation, encryption tamper/parameter bounds, report preview and word denominators. Browser speech/video fixtures do not establish physical-device or clinical quality. |

No real API key, paid call, model download, patient recording or automatic report transmission was used. An independent read-only review found no blocking issue in the default privacy boundaries, metric definitions or authenticated report cryptography; that is an engineering review, not a security certification.

v6 evidence assets: `docs/evidence/v6/privacy-visual.mjs`, `privacy-visual-checks.json`, `privacy-offline.mjs`, and mobile/desktop screenshots for `word-table`, `word-accuracy`, `encrypted-report` and `privacy-controls`. All evidence data is fictional. The older v5 media and offline evidence below remains useful for preserved rehabilitation features.

### Historical v5 evidence — preserved baseline, superseded counts

[docs/evidence/v5/VERIFICATION.md](docs/evidence/v5/VERIFICATION.md), dated 2026-09-28, records the previous released/pushed cut. All figures and temporary-server statements in the following table refer to **v5**, not the current verification session.

| Check | Observed result and scope |
| --- | --- |
| Unit | **614 passing tests in 24 files**. Prior 538 plus 76 new. |
| Browser | **45 distinct checks passed across runs**, not one monolithic 45/45 execution. Initial full run was 43/44; synthetic video fixture was fixed and targeted rerun passed. One additional snapshot/erase-all case passed. Final three dashboard checks plus state check passed 4/4. |
| Lint/types | Repository ESLint and web/API/shared TypeScript passed; web/lint repeated after final UI fixes. |
| Builds | Production web/PWA and API builds passed. Main web entry 672.74 kB / 200.82 kB gzip; Practice 18.68 / 6.78 gzip; Therapist 59.51 / 17.72 gzip. PWA 72 precache entries / 2804.08 KiB. API 194.50 kB ESM. Existing TensorFlow chunk warning remains. |
| Production offline | Compiled app on temporary loopback 8792 loaded previously unvisited Practice and Therapist offline; reviewed attempt saved and survived reload. Server was stopped after verification. |
| Responsive/accessibility | 390×844 and 1440×1000 tested; no page overflow, serious/critical Axe findings, page/console errors, automatic speech or inference requests in checked views. Six screenshots and script/results stored. |
| Video | Native Chromium MediaRecorder encoded synthetic canvas video; explicit review played it; save linked media and reset consent. This is not a physical camera/microphone quality test. |
| Privacy/data | Import boundaries, score recomputation, reviewed/provisional separation, media deletion, global erase, context snapshot and cancellation covered. |
| Controlled intent evaluation | Earlier v4 run: 240/240 authored catalog executions passed. Not rerun as a clinical/live-LLM benchmark for v5. |

Evidence assets: `docs/evidence/v5/rehab-visual.mjs`, `rehab-visual-checks.json`, `rehab-offline.mjs`, `practice-review-{mobile,desktop}.png`, `therapist-overview-{mobile,desktop}.png`, `therapist-plan-{mobile,desktop}.png`.

Previous release evidence is retained under `docs/evidence/v2`, `v3`, `v4`. Original results: v1 66 unit/19 browser; v2 358 unit/26 distinct browser; v3 473 unit/32 browser; v4 538 unit/36 browser plus targeted rechecks. These are historical snapshots, not counts to add together.

Evidence above comes from actual implementation and verification runs. Do not infer additional tests from file names or rerun passing suites without new changes or unresolved concerns.

## 11. Remaining acceptance and future work

The v8 engineering implementation, unit checks, browser rerun and examined mobile/desktop views passed. Consult the top of `PROGRESS.md` and v8 evidence for exact scope and final build measurements. The working tree intentionally remains uncommitted and unpushed; this does not authorize a future push, merge or deployment. Recheck Git if resuming after additional user instructions.

These broader limits are not automatically authorized new tasks:

- Qualified SLP review by condition, stage, method and language; accessible real patient/partner testing; predefined clinical validation. No evidence yet validates Sollu as clinical-grade treatment or proves recovery benefit.
- Native Tamil review of original/new wording and full rehabilitation interface translation. Hindi/Telugu full support remains future scope.
- Real-device microphone/camera, browser recognition, Tamil voices, assistive technology, voice quality, phone pairing and measured audible latency. Human checklists H1–H10 remain in `PROGRESS.md`; no human reports were received.
- Chosen downloaded local-model evaluation remains separate; actual language/semantic quality and latency are unmeasured for the contextual generator. A future cloud evaluation requires an explicitly approved privacy/deployment decision, suitable contractual/account controls where applicable and actual authorization. The latest jury/privacy request is not authorization to enable another cloud vendor. No key was supplied during implementation.
- Automatic saved-clip transcription, consented trainable speech model/dataset/fine-tuning and held-out evaluation are not present.
- Authenticated clinician identities, remote patient management, secure report transport and automatic therapist delivery are not present.
- Qualified jurisdiction/intended-use assessment remains unanswered and pending. For a relevant clinical deployment, assess institutional/legal obligations, BAAs/vendor contracts where applicable, DPDP commencement, CDSCO intended purpose/classification, managed-device encryption, identity/RBAC, audit integrity, retention/recovery and incident response. Do not assign a device class or claim compliance from this prototype.
- Active IndexedDB is not application-encrypted; encrypted report JSON covers exported file contents only. Clips and printed/plain exports remain unencrypted. Sender/reviewer identity is unverified even for an authenticated encrypted file.
- Cloud STT, paid TTS, generative voice cloning, file-upload voice workflows/provider deletion acceptance remain deferred.
- Learned personal-object vision, specialized eye tracking/switch scanning, full pilot/security/accessibility hardening and other unimplemented SPEC milestones remain future work.
- Bundle-size target is slightly exceeded; real budget-Android performance is unmeasured. Do not claim the historical target passes.
- Hosting and HTTPS phone deployment remain explicitly deferred. Do not create tunnels, deploy, buy services or send reports on the strength of the earlier local-build authorization.

For any next feature/fix, inspect the relevant current implementation, preserve existing data and invariants, make the scoped change, run meaningful checks, and update the evidence/acceptance docs. Do not mark human or clinical checks passed without the actual reports.

## 12. Git history and new-chat startup checklist

Committed history, newest first; **v6–v8 work is not yet in this list**:

```text
d407a44 Add rehabilitation practice and therapist review dashboard
25cca5e Add time place and routine context engine
d9adb2f Add contextual sentence engines and caregiver personalization
4d940c9 Add grounded aphasia communication tools and vocabulary
5a3bd81 docs: record local verification and remaining acceptance checks
9a06b19 feat: build Sollu local MVP with free voice alternatives
1125adb docs: record Sollu specification and approved free local plan
23f8240 Initial commit
```

Suggested first actions in the new chat:

1. Read this handoff and `CLAUDE.md`; inspect `git status --short --branch` and `PROGRESS.md` top sections.
2. Keep the existing checkout/branch and account for new local changes. Do not reset, recreate, overwrite `.env`, or erase browser data.
3. Check whether 5173 and 8787 already respond before starting servers.
4. Read current v8 evidence and remaining human/privacy/clinical acceptance before resuming. Preserve the uncommitted privacy, fragment, rehabilitation and clinician changes. v5's push must not be mistaken for a v6–v8 push.
5. Follow the user's instruction within the latest local-first privacy scope. If pushing additional changes is authorized later, use the existing branch unless the user requests otherwise; never force-push or assume a PR/merge/deployment was requested.

Optional message the user can paste into the new chat:

> Continue Sollu in `C:\Users\SUBASH\OneDrive\Documents\GitHub\Sollu-Hackfest`. Read `HANDOFF.md`, `CLAUDE.md`, `docs/PRIVACY_AND_VALIDATION.md` and the latest sections of `PROGRESS.md` first. v5 through `d407a44` is pushed to `codex/sollu-local-mvp`; v6–v8 privacy, fragment, report, Rehabilitation and Clinician work remains local unless a later commit says otherwise. Preserve it and check current evidence and Git status. Keep cloud disabled by default, free alternatives, hosting deferred, exact-sentence patient control and documented clinical/privacy boundaries. My next request is: …
