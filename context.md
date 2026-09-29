# Sollu — complete context for a new chat

Written **2026-09-29** at the end of a long working session. Read this first, then `CLAUDE.md` and the newest sections of `PROGRESS.md`. The original product brief is `docs/SPEC.md`; approved changes are in `docs/PLAN.md` and `docs/DECISIONS.md`.

## 1. Snapshot

| Item | State |
| --- | --- |
| Product | **Sollu / சொல்லு** — Tamil-first communication aid (AAC) and communication-practice app for adults with aphasia, dysarthria, ALS, Parkinson's, laryngectomy and other communication needs |
| Context | BME Ignite Hackfest 2026 · Team echo · Rajalakshmi Engineering College, Chennai. Hosting deferred; local prototype only |
| This workspace | `C:\Users\SUBASH\OneDrive\Attachments\Desktop\newtemp\Sollu-Hackfest` |
| Git | branch `main` at `066d8b6` (merge of PR #2 = `bd49ff6`). **~100 files changed and uncommitted** (all work in §9). Nothing committed, pushed or deployed |
| Other copy | `C:\Users\SUBASH\OneDrive\Documents\GitHub\Sollu-Hackfest` (branch `codex/sollu-local-mvp`, older) — runs on ports **5173/8787**. Don't confuse the two |
| This copy's servers | web **5174** → API **8788** (cloud-permitted, reads `.env`); local-only test pair web **5175** → API **8789** (`ALLOW_CLOUD_AI=0`) |
| Tests | 1,271/1,271 unit tests (57 files), controlled eval 240/240, TypeScript + ESLint clean. **E2E not run** (Chromium cannot launch in the agent environment) |
| Initial JS | 199.33 kB gzip (budget ≤ 200 kB — small margin) |

## 2. How to run

- Node ≥ 22.12 (22.17.1 used). Pinned package manager **pnpm 11.19.0**. The globally installed `pnpm` on this PC fails to switch versions — use **`corepack pnpm@11.19.0 …`** (or `corepack enable pnpm` once).
- Install: `corepack pnpm@11.19.0 install --frozen-lockfile`.
- Dev (default ports 5173/8787): `corepack pnpm@11.19.0 dev`. This conflicts with the other copy, so this copy uses alternate ports:
  - `SOLLU_WEB_PORT` / `SOLLU_API_PORT` (read by `apps/web/vite.config.ts` and `playwright.config.ts`; defaults 5173/8787). The API itself uses `PORT`.
  - `.claude/launch.json` defines `sollu-api` (8788), `sollu-web` (5174), `sollu-e2e-api` (8789, local-only), `sollu-e2e-web` (5175) for the Claude browser pane.
- Checks: `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json` (also `apps/server`, `packages/shared`), `node node_modules/eslint/bin/eslint.js .`, `node node_modules/vitest/vitest.mjs run`, `node node_modules/tsx/dist/cli.mjs evals/run.ts` (then `git restore evals/intent/report.md evals/intent/challenge-cases.jsonl` if only the timestamp changed), web build `cd apps/web && node node_modules/vite/bin/vite.js build`.
- E2E: `corepack pnpm@11.19.0 exec playwright test` — run on the user's machine; stop the other copy first or set `SOLLU_WEB_PORT`/`SOLLU_API_PORT`. The E2E server is pinned to `ALLOW_CLOUD_AI=0`.
- Health: `curl http://127.0.0.1:8788/api/health` (use `/api/health`, not `/health`).

### `.env` (git-ignored; this copy)
`ALLOW_CLOUD_AI=1` (explicitly enabled at the user's request), `MOCK_PROVIDERS=1`, `LLM_PROVIDER=mock` (devices still choose their own engine), `LLM_TIMEOUT_MS=15000` (raised from 8000 after an OpenAI timeout). Optional: `OPENAI_API_KEY` (keeps the key across restarts), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-transcribe`), `SOLLU_DATA_DIR` (voice-deletion records; defaults to `.sollu-data` in production). **Keys typed in Settings live only in server memory and are wiped whenever the API restarts** (including dev auto-reload after server code edits).

## 3. Architecture

Strict TypeScript pnpm monorepo with shared Zod contracts.

| Path | Role |
| --- | --- |
| `apps/web` | React 19 + Vite PWA, React Router, Dexie/IndexedDB (`sollu` main DB, `sollu-rehab` practice DB) |
| `apps/server` | Fastify 5 API: device tokens, sentence engine, provider adapters, signing, encrypted caregiver relay, transcription |
| `packages/shared` | Schemas, vocabulary catalog (124 meanings), candidate policy, model grounding/validators, fragment repair, lexicon, context engine |
| `tests/e2e` | Playwright specs (fictional data) |
| `evals` | Controlled catalog evaluation |
| `docs` | SPEC, PLAN, DECISIONS, PROVIDERS, PRIVACY*, REHABILITATION*, LANGUAGE_REVIEW, JURY_READINESS, evidence |

Key files: `apps/web/src/App.tsx` (routes, nav, dock placement), `state.tsx` (session, generate/speak/sayInPlace, settings), `lib/context.ts` (context + `sentenceLanguage`), `lib/api.ts` (API client, engine hint, transcription), `pages/Patient.tsx` (Home, Type, Topics, Confirm, Speaking, Phrases, Speak), `pages/PatientMore.tsx` (People, Recent, Baseline — lazy), `pages/Communication.tsx` (dock, pause), `pages/Conversation.tsx` (Repair, Comfort, Sentence builder — lazy), `pages/CaregiverPanels.tsx` (memory/offline panels in Settings), `pages/Support.tsx`, `pages/Camera.tsx`, `pages/Settings.tsx`, `features/*`; server `app.ts`, `config.ts`, `lib/intent.ts`, `lib/contextualPrompt.ts`, `providers/{cloud,transcribe,providerSettings,ollama}.ts`, `lib/revocations.ts`.

## 4. Routes and navigation

Nav (desktop + mobile, Tamil via `uiText`): My space `/`, My phrases `/phrases`, Recent words `/recent`, My tools `/tools`, **Companion `/companion`**, **Voice flow `/flow`**, Rehabilitation `/rehabilitation`, Clinician `/clinician`.

Other routes: `/speak`, `/question` (partner's question), `/type`, `/topics`, `/camera`, `/confirm`, `/speaking`, `/help`, `/people`, `/practice`, `/appointments`, `/words`, `/scenes`, `/stories`, `/passport`, `/draw`, `/repair`, `/comfort`, `/sentence`, `/settings` (tabs `general, personalize, llm, context, voice, link, privacy`), `/therapist`, `/demo`, `/care` (paired caregiver phone), `/baseline`, `/setup` → settings. Caregiver areas are behind a local 4-digit PIN (a UI lock, not authentication).

On phones, `/confirm`, `/speaking` and `/practice` show content first and move the mobile nav below it; the language/demo row is hidden there.

## 5. Features

**Communication (patient):**
- Home tiles: Speak, Topics, Camera, Type; quick tiles Help/Yes/No/Wait; "They asked…" partner question.
- **Help dock on every non-care screen:** Help · 👍 Yes · 👎 No · Fix · Pause · Stop. Yes/No speak in place (`sayInPlace`) without losing a message in progress and are logged as their own attempt.
- **Topics:** 11 categories; sub-choices for Food, Drink, People, Feelings (10), TV & phone, Go out; Prayer/Medicine/Toilet/Rest are direct; Pain → body part (distinct icons) → side. 6 per page. A tap sends only the tapped item (e.g. raw `idli`, topicPath `["food","idli"]`). All 34 choices × Tamil/English produce the right sentence (`topicContract.test.ts`).
- **Type:** free text in Tamil/Tanglish/English; suggestion chips (contacts, personal vocabulary).
- **Speak:** 🎤 தமிழ்/English speech-language switch (separate from UI language); Done finalizes recognition; 15 s cap closes the mic without auto-submitting; Stop/Pause keep the words; if recognition is impossible, big Topics/Type buttons; partner questions can be typed without becoming the patient's message.
- **Confirm:** up to 3 choices + None of these; "AI draft · Check the meaning" labels; "Did you say…?" alternative hearings; Edit the words; To (listener); one-tap language switch that persists across rounds; Show more options; engine notices with "Show prepared phrases instead".
- **Speaking/Help:** exact sentence is the tap target; Help has SMS (names recipient if a number is saved), delivery status, "It was a mistake".
- Recent (tap to say again), My phrases (returns to list after speaking), People (Back keeps the message), Repair/Comfort/Sentence builder, Words/Scenes/Stories/Passport/Draw, Camera (on-device COCO-SSD generic objects; Tamil labels), Pause/draft recovery (restored topic/speech drafts find choices again), caregiver pairing/relay.

**Voice flow (`/flow`, Wispr-Flow-like):** hands-free dictation that keeps listening through pauses (bounded restarts, 3-min mic cap keeps words); local tidy-up (`features/flow/cleanup.ts`) removes fillers (um/uh/ம்ம்), stutters (w-w-water) and immediate repeats — never adds or reorders words; editable text; **Find what I mean** → sentence engine (health/help routing unchanged); **Say exactly** (tap); Copy; Clear. Optional **High accuracy (OpenAI)** transcription (§7). Wispr Flow itself: API is approval-only — not integrated.

**Speech companion (`/companion`, Duolingo-like):** daily goal (3/5/10), Monday-start week dots, positive streak (rest days count), Continue, spaced-repetition Review (Leitner 1/2/4/7/14 days), units Basics / Drinks & food / Comfort / Feelings / Asking for time (authored catalog phrases, rehab practice language, தமிழ்/English switch). 5-step lessons: Listen & repeat (tap-only preview; Said it / tap unclear words / Not yet; optional one-time mic check with word match), Choose the phrase, Build the sentence (tap tiles; tap placed tile to remove), Say it your way (spoke/typed/pointed). No hearts, timers, leaderboards or sounds. Speaking steps save rehab PracticeRecords (notes `Speech companion: <unit>`). Progress in KV `companion-progress:v1`.

**Rehabilitation practice (`/practice`, redesigned tap-first):** message cards (one tap = choose + start); Tamil starter exercises (`<id>-ta`, plans resolve to the profile language via `exerciseInLanguage`); result by "Said it" or tapping unclear words (typed/browser transcript optional); "Agree and record audio/video" = per-attempt recording consent; partner understanding Yes/Partly/No; optional 0–10 button grids for tiredness/effort; "Next practice" after saving. Hub `/rehabilitation` (overview/progress, weekly goal, words to practise), clinician dashboard `/clinician` (review queue, plans, reports, encrypted export), appointments `/appointments` (local planning, ICS with SEQUENCE/DTSTAMP, cancellations).

**Settings:** General (name, primary language, **"Suggest sentences in each listener's language"** opt-in, access, PIN), Personalize, Sentence engine (provider, model, key, cloud sharing, **"Also offer prepared vocabulary phrases with AI suggestions"** live toggle, connection test), Context (clock, place, routines), Voice studio (exact-phrase recordings), Link phones, Privacy (local-only protection, speech mode, memory, erase). Speech recognition card includes the **cloud transcription** switch.

## 6. Sentence engine

- Providers: Free vocabulary (`mock` catalog), OpenAI (`gpt-4.1-mini`), Anthropic, Gemini, Groq, local Ollama. Device choice is kept in server memory (lost on restart).
- **AI-only by default:** with an AI engine selected, results are never mixed with or silently replaced by vocabulary. Failures return no choices plus a reason; prepared phrases appear only after "Show prepared phrases instead". Toggle `mixPreparedWithAi` restores mixing.
- Failure notices: `unavailable` with detail **timeout (states seconds) / key / model / quota / provider / network / invalid-output** (from HTTP status only), `unverified`, `clarify`, `device-permission`, `engine-reset` (server restart forgot the choice — detected via a client-side engine hint).
- Health/help input always goes to prepared wording (`requiresPredefinedCommunication`) before any generator — jury requirement.
- Validators (`packages/shared/src/modelGrounding.ts`, `candidatePolicy.ts`, `lexicon.ts`, `topicFragment.ts`) enforce grounding, polarity (incl. Tamil suffix negation), sides (ignores "right now"), NFC Tamil quotes, Tanglish translations, no invented numbers/names.
- Saving a cloud engine without any key is refused. Default timeout 15 s.

## 7. Privacy gates (keep them separate)

1. Server `ALLOW_CLOUD_AI=1` (repo default `0`).
2. Device **cloud sentence** permission (`sollu:cloud-sentences:v1`) — text only.
3. Provider selection + key + that provider's text-sharing consent.
4. **Local-only media protection** (on-device recognition/voices only, no model downloads).
5. Speech recognition mode: Local (default) or browser online (needs 4 off).
6. **Cloud transcription** (`sollu:cloud-transcription:v1`, Voice flow high accuracy): explicit, fail-closed, needs 1 + 4 off + OpenAI key; audio sent only on Stop/Send, held in server memory only; revoked when protection is restored or the device is erased.

Other: keys never in web code/git; no content logs; manual place (no GPS); withdrawn voice consents can't return via backup restore; voice deletions persist across restarts when `SOLLU_DATA_DIR` is set.

## 8. Language rules

- UI language = header தமிழ்/EN (`settings.lang`). **Sentence output follows the chosen language**; following each listener's language is an opt-in (`followListenerLanguage`).
- Speech (microphone) language is separate (`speechLang`, switch on Speak/Voice flow).
- Confirm's "தமிழ் → English" switch applies to that message and its later rounds.
- All new Tamil strings are listed in `docs/LANGUAGE_REVIEW.md` — **native-speaker review still pending** for everything.

## 9. Work done in this session (all uncommitted)

1. Ran the app on alternate ports; port-configurable Vite/Playwright; enabled cloud AI locally.
2. **Full audit + fixes:** chosen-language output; speech-language switch; "Did you say…?"; AI-only engine mode with honest failures; General settings no longer silently revoke cloud permission; settings saves no longer stop the mic/wipe choices; Tamil/Tanglish negation, "right now", Tamil qualifiers, "pill"/"glass", compound health words, NFC, Tanglish translations; rehab metric/report/ICS/backup-consent fixes; relay seat race; Help receipt after Stop; voice-deletion persistence; translations.
3. **Usability pass:** topic bug (16/19 choices produced nothing) fixed; tap-first practice redesign + Tamil exercises; Confirm choices first on phones; Yes/No in dock; Speak dead-end; Recent/People/SMS/repair/draft fixes; pointer-safe taps; visible buttons, text scaling, 120 px quick tiles; Help dock everywhere; lazy-loaded pages for the bundle budget.
4. **New tabs:** Speech companion and Voice flow; `/api/transcribe` (OpenAI) with gates; engine failure reasons; timeout 15 s.

## 10. Verification status

- Done (2026-09-29): tsc/ESLint clean; 1,271 unit tests; eval 240/240; web + API builds; manual in-app browser checks of topics, practice save, dock Yes, Voice flow (simulated recognizer), a full Companion lesson, phone-width Confirm layout.
- **Not verified:** Playwright E2E (update specs were written — `rehab-practice`, `rehab-state`, `rehab-dashboard`, `rehabilitation-hub`, `recognition-mode`, `patient`, new `companion.spec.ts`, `flow.spec.ts`); live OpenAI sentence quality/latency and live transcription (key works for transcription per server logs; Tamil accuracy unknown); real microphone and recordings on a phone; native Tamil review; clinical validation; hosting/HTTPS.

## 11. Open decisions and known limits

- Practice recording consent is now the explicit "Agree and record" tap (was a separate checkbox) — user may ask to restore the checkbox.
- "coffee with sugar" routes to health wording (sugar ≈ diabetes) and asks for clarification.
- Type page still says "There's no right spelling" but typos like "cofee" give nothing — soften text or add a bounded typo allowance.
- Initial bundle is 199.33 kB (≤ 200 kB) — lazy-load more before adding eager code.
- On very short screens the sticky Help/Yes/No dock can cover content until scrolled.
- Companion: response time not measured (null); no recording in lessons; record notes use English unit titles.
- Latin-only contact names get Tamil suffixes glued on (e.g. `Karthikயை`) unless a Tamil alias exists (Dr. Rao now has `டாக்டர் ராவ்`).
- No authenticated clinician identity, no server-side records, no active-database encryption, no real clinic booking, no HIPAA/CDSCO claims.

## 12. Gotchas for the next session

- Files are **CRLF**; format with `node node_modules/prettier/bin/prettier.cjs --end-of-line crlf --write <files>` (plain prettier flags every file). `git` uses `core.autocrlf=true`.
- Editing server code makes the dev API reload → **session keys and device engine choices are lost**; tell the user to re-enter the key or put it in `.env`.
- The browser pane's Chromium works for manual checks; Playwright's Chromium does not launch here.
- If Settings says "Checking server privacy policy…", the API behind that page isn't running (start `sollu-api`).
- Eval runs rewrite `evals/intent/report.md` timestamps — restore if that's the only change.
- Don't commit `.env`, `.claude/`, `.sollu-data/`, recordings, exports or real personal data. Only commit/push/deploy when the user asks.
- Follow `CLAUDE.md` invariants: exact-sentence tap only (I-1), audio only in `features/audio` (I-2), ≤3 choices no filler (I-3), no invented details (I-4), Help without AI (I-6), ≥72 px targets / no time limits (I-10), health/help → prepared wording.

## 13. Suggested message for a new chat

> Continue the Sollu project in `C:\Users\SUBASH\OneDrive\Attachments\Desktop\newtemp\Sollu-Hackfest` (branch `main`, work uncommitted). Read `context.md`, `CLAUDE.md` and the newest `PROGRESS.md` sections first. Web 5174 → API 8788 (cloud-permitted); 5175/8789 is a local-only test pair; my other checkout uses 5173/8787. Use `corepack pnpm@11.19.0`. My next request is: …
