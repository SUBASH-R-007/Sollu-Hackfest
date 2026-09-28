# Sollu progress and acceptance ledger

Last updated: 2026-09-28. **Current state: multiple API sentence choices added; dedicated Rehabilitation and Clinician tabs remain available. Clinical and live-provider acceptance is still pending.** Earlier local privacy protections, fragment repair and report safeguards remain. No real credentials or paid requests were used; hosting remains deferred. The complete specification is [docs/SPEC.md](docs/SPEC.md); approved changes are [docs/DECISIONS.md](docs/DECISIONS.md). This is not a claim that full-product, clinical-validation or paid-clone milestones are complete.

## Tamil rehabilitation and clinician navigation (2026-09-28)

- Added the missing shared Tamil labels for Rehabilitation and Clinician, used by both desktop and mobile main navigation. Related rehabilitation navigation and caregiver shortcuts now use the same dictionary; existing shared page-title/back controls also receive the new My rehabilitation translation.
- Verified the running user's Tamil interface shows **மறுவாழ்வு** and **சிகிச்சை நிபுணர்**, plus translated caregiver shortcuts, without changing their settings or PIN. Web TypeScript and targeted ESLint passed. English labels remain the existing source strings. New translations are recorded in [LANGUAGE_REVIEW](docs/LANGUAGE_REVIEW.md); human language approval remains pending. No new tests for this low-impact text change, and nothing pushed or deployed.

## Speech recognition startup follow-up (2026-09-28)

- User reported the local-recognition error after enabling sentence APIs. Confirmed that text framing permission intentionally leaves microphone recognition in local mode; the previous error incorrectly suggested a missing language pack for almost all failures.
- Speech controls now appear in Sentence engine settings as well as General/Privacy, with an explicit explanation that sentence APIs do not enable audio input. Added a local-language capability check with a five-second deadline and separate installed/downloadable/downloading/unavailable/unknown results. No microphone capture, pack installation, automatic online fallback or privacy change occurs during the check.
- Speak and practice wait for actual browser startup before displaying Listening, clear stale errors on retry, distinguish permission/microphone/no-speech/language/network/service errors, and cancel timers and stale callbacks after failure. Speak links directly to speech privacy settings. Browser preferences remain explicit and protected; no real microphone or external speech service has been exercised.
- Verified **60 unit tests across 6 files**, **11 distinct browser cases** (8 recognition/startup/privacy cases plus 3 speech-flow/demo/legacy-browser checks), web TypeScript, targeted ESLint and the final web/PWA production build. Mobile/desktop screenshots are [mobile](docs/evidence/v9/speech-settings-mobile.png) and [desktop](docs/evidence/v9/speech-settings-desktop.png). Tests use simulated recognition only. Existing large-bundle warning remains. Real microphone, Tamil availability and embedded/full-browser comparisons remain human checks. The current user browser still shows the caregiver PIN creation screen; no PIN was created or guessed. Nothing pushed or deployed.

## Sentence API access with separate local-media protection (2026-09-28)

- User explicitly requested access to Sentence Engine APIs. Created an ignored local `.env` containing `ALLOW_CLOUD_AI=1`; verified the running API health response reports cloud-permitted. Checked-in defaults remain local-only, and provider selection, provider-specific consent and a key are still required. No real credentials, patient content or paid provider requests were used.
- Sentence engine settings now expose **Allow cloud sentence APIs on this device**, a refresh action and concrete server-policy instructions. The sentence permission does not change local recognition, local-only voices or object-model download protections. Previously explicit online mode remains compatible when the new token is absent. A malformed/unreadable permission fails closed.
- Permission changes cancel pending requests and discard drafts across same-origin tabs. Dispatch rechecks permission after asynchronous device registration and blocks cloud-key saves after revocation. Restoring local privacy protection or erasing device data revokes sentence permission. Synthetic connection tests now carry a default-local flag too.
- Verified **92 targeted unit tests across 5 files**, web/server TypeScript, targeted ESLint, web/PWA and API production builds, and **11 distinct browser cases** across the initial run and two corrected reruns. The browser fixtures were updated for the operator-enabled server and the existing draft-recovery screen; coverage includes cloud consent, key non-persistence, independent speech permissions, reload persistence and cross-tab revocation. API build required an approved sandbox escalation for esbuild configuration resolution; build succeeded. User chose to finish PIN/provider/key setup in Settings themselves. No live-provider success claimed.

## Clinician appointment planning (2026-09-28)

- Added `/appointments`, a **Book appointment** shortcut in Rehabilitation/Practice, and an **Appointments** view inside the clinician dashboard. The same locally stored appointments appear in both places.
- Supports clinician/clinic name, preferred local date/time with explicit device time zone, 15/30/45/60-minute duration, in-person/video/phone visits, optional joining details and an HTTPS clinic booking page. No invented clinicians, availability or remote confirmation.
- Saves requests with an awaiting-confirmation status, allows explicit recording of clinic confirmation, resets confirmation when rescheduled, supports local cancellation/removal and ICS export. Atomic overlap checks prevent conflicting local requests, and cancelled/deleted edits cannot resurrect a record. A synchronous submission guard prevents double saves.
- Records use the existing IndexedDB KV store and are included in device erase. No network booking requests, calendar account access, clinical records or notifications are sent. Active records are not encrypted by Sollu. Clinic bookings and imported calendar events must be changed separately.
- Verified **26 appointment model tests**, **2 end-to-end browser cases**, web TypeScript, targeted ESLint and production web/PWA build. Browser checks cover navigation, persistence, explicit confirmation, calendar download, rescheduling, clinician access, cancellation/removal, overlap rejection and mobile target sizes/no horizontal overflow. Reviewed mobile and desktop screenshots in the Playwright results. Existing large-chunk build warning remains; real clinic integration and real calendar-client acceptance are untested.

## Multiple API sentence choices (v9)

The contextual prompt now targets two or three distinct grounded meanings, with validated prepared alternatives filling spare slots only after at least one valid model draft. All candidates pass the existing cross-source deduplication/rejection policy; explicit empty clarification stays empty. There is no extra provider call, privacy opt-in or invented filler. The UI labels prepared options separately from AI drafts. Caregiver choice count remains the initial display limit; **Show more options** reveals the remainder without speaking. Only revealed candidates become eligible for rejection in subsequent rounds; context/privacy changes clear hidden choices as well.

Verified: **816 unit tests / 35 files**, repository ESLint, web/server TypeScript and production web/API builds. Main web bundle 686.76 kB / 205.39 kB gzip; API bundle 206.60 kB; PWA 77 entries / 2893.90 KiB. **29 distinct browser cases passed across runs**, including five new multi-choice/reveal/rejection/privacy/edit regressions. [v9 verification and initial fixture corrections](docs/evidence/v9/VERIFICATION.md). No live paid provider, microphone, push or deployment. [Provider notes](docs/PROVIDERS.md).

## Rehabilitation and clinician navigation (v8)

- Main navigation now exposes **Rehabilitation** (`/rehabilitation`) and gated **Clinician** (`/clinician`). Shared rehabilitation navigation connects the hub, existing `/practice` and clinician review; `/therapist` retains its detailed-review default.
- The patient hub adds Overview/Progress views, weekly personal targets, daily activity, goals/plan, recent records, rest guidance, 7/28-day language/method filters, measured response times, understanding coverage, fatigue/effort and reviewed words to practise. Views use the existing local records without duplication. Weekly counts refresh with the device clock and ignore future records.
- Clinician Overview adds measured-data coverage, current goals and an oldest-first administrative review queue with evidence/transcript filters. Actions focus the selected local record, plan, report transfer or communication log. Reviewer identity remains unverified and the PIN is only a local interface lock.
- AAC tasks and the AAC communication method count participation while staying outside speech/text accuracy denominators in practice, hub, reports and clinician summaries. Practice timing is Start-to-first-response-marker, not speech onset; missing values remain unmeasured.
- **Verification:** 809 unit tests / 35 files, repository ESLint, web TypeScript and production web build passed; 77 PWA precache entries / 2892.66 KiB. **65 distinct browser cases passed across runs:** the initial full suite passed 61/65; all six new cases then passed together after test-selector corrections. Cases cover route/gate access, one saved record across views, recording cleanup, filtered/missing measurements, calendar rollover and AAC scoring consistency. Final mobile/desktop checks across **16 views** found no page overflow, serious/critical Axe issues, page/console errors, external HTTP requests or automatic audio/recognition; checked navigation targets were at least 72 px. [Dated v8 evidence and final build measurements](docs/evidence/v8/VERIFICATION.md).

All v6–v8 changes remain local, uncommitted and unpushed. Privacy, native-language, physical-device and clinical acceptance limitations remain unchanged. [Workflow and metric definitions](docs/REHABILITATION.md).

## Attached jury guidance review (v7)

The latest attachment has been reviewed against primary HHS, ASHA, CDSCO and MeitY sources and the actual application. Implemented prepared health/help communication before all generators/caches, relevant-only optional contacts/vocabulary transfer, durable report interpretation limits in JSON/encrypted JSON/CSV/print, and missing-time exclusion with measured sample counts. Settings now explains individual selection support, actual retention, identity/encryption boundaries and no-training versus no-retention. Two-step instructions and Home speech-privacy notices reflect actual settings. Multi-condition access remains; no diagnosis-based exclusion or clinical/regulatory exemption is claimed.

**Verification:** 789 unit tests / 33 files; 59 distinct browser cases passed across the full run and targeted rerun; 240 catalog fixtures; repository lint, all TypeScript projects, final web/API builds; mobile/desktop visual and accessibility checks. [Actual evidence and initial test corrections](docs/evidence/v7/VERIFICATION.md). [Review and jury answers](docs/JURY_READINESS.md), [current demo walkthrough](docs/DEMO_SCRIPT.md). All v6/v7 work remains local, uncommitted and unpushed; existing hosting deferral remains. Human and clinical acceptance are still pending.

## Privacy, broken words and reviewed accuracy (v6)

**Speech-recognition follow-up (2026-09-28):** user requested a Google/local toggle. Added caregiver **General → Speech recognition** and the same chooser in Privacy: Local or Google / browser online. Independent preference defaults local; the privacy master blocks online and resets the preference when restored. Speak and rehabilitation use the effective choice; changes cancel active input across tabs without auto-restart. Browser service/Google limitations and audio-sharing disclosure are visible. No Google Cloud API/key integration or live-provider quality claim. **38 focused unit tests, 9 distinct targeted browser checks across runs, repository lint, web TypeScript and production web build passed.** New browser test's initial cross-tab setup hit normal draft recovery; opening practice before creating a Speak draft fixed the fixture and the recheck passed. See [follow-up evidence](docs/evidence/v6/SPEECH_RECOGNITION.md).

| Area | Implementation and evidence |
| --- | --- |
| Research | [Primary-source privacy and validation review](docs/PRIVACY_AND_VALIDATION.md): HIPAA/PHI, CDSCO software guidance, phased DPDP Rules and condition-aware rehabilitation. “HIPPA/CDSEO” interpreted as HIPAA/CDSCO; jurisdiction clarification unanswered, college demo assumed. No regulatory/compliance claim. |
| Fragment robustness | Catalog-supported repetitions, stutters, split words and unique everyday prefixes in English/Tanglish/Tamil. Original input and visible interpretation retained; ambiguous, clinical and conflicting details clarify. Reviewed scoped corrections use whole-token matching. |
| Default privacy | Server blocks cloud AI including OpenAI unless deliberately enabled by the operator. Device protection defaults on, requires supported on-device recognition/local voices and prevents external object-model downloads. Cross-tab revocation and final pre-request checks covered. Free catalog and optional loopback Ollama remain available. |
| Word dashboard | Reviewed target-word matches, omissions/substitutions, extra words, coverage/sample sizes, language/method filters and weekly trends. Marked practice words and free-communication corrections remain separate. Choosing a local word opens manual practice without microphone or speech. |
| Report protection | Locally encrypted report export/decrypt/preview/consented import using AES-256-GCM, fresh salt/nonce and passphrase-derived keys. Plain reports and individual media remain explicitly unencrypted options; no automatic transfer or model training. Active browser storage remains unencrypted. |
| Verification | **731 unit tests / 30 files; 54 distinct browser checks across runs; 240/240 controlled evaluation fixtures; ESLint and all three TypeScript projects; production web/API builds; compiled offline practice, word metrics and encrypted export passed.** [Dated evidence](docs/evidence/v6/VERIFICATION.md). |
| Visual/accessibility | Mobile/desktop word analysis, reports and privacy: no page overflow, serious/critical Axe issues, console/page errors, external requests or automatic speech in checked views. |
| Remaining | Independent privacy/security and intended-use regulatory assessment; database encryption/authenticated identity/audit architecture for clinical deployment; native language, physical device, SLP/patient acceptance and formal clinical validation. Current scores are reviewed text comparisons, not acoustic rehabilitation proof. |

The following milestone sections are historical; v6 supersedes older permissive browser/cloud defaults and plaintext-only report descriptions. Existing v5 condition profiles, recording, weekly analysis, clinical-review notes and routine integration remain implemented.

## Communication rehabilitation and review (v5)

| Area | Implementation and evidence |
| --- | --- |
| Research and scope | [11 primary/authoritative sources](docs/REHABILITATION_RESEARCH.md) inform profiles for aphasia, dysarthria, ALS, Parkinson's and laryngectomy. [Workflow and limitations](docs/REHABILITATION.md). Individual communication methods and therapist-agreed plans; no universal physiological drills or clinical-grade claims. |
| Practice | Functional words, sentences, scripts, AAC and custom targets; optional browser transcript, local audio/video, consent, review, discard, fatigue/rest and feedback. Saved clips use entered review transcripts, not a separately captured live recognizer result. Context snapshot survives plan changes. |
| Feedback | Versioned token edit comparison, provisional/unreviewed distinction, unknown scores stay missing, marked practice words and person/partner understanding. Text match is not pronunciation, intelligibility or clinical recovery. |
| Therapist workspace | Weekly activity, comparable targets, fatigue, medians/IQR/sample sizes, confirmed-understanding denominators and descriptive interval, taps/time to speech start, reviewer observations and local evidence. JSON/CSV reports, separately consented clips, validated read-only patient snapshots. |
| Personalization/context | Marked words become practice choices; separately confirmed wording mappings can guide the intent engine. Local log scan requires three distinct real dates and caregiver approval for learned routines. Therapy repetition/diagnosis/media never becomes an inferred daily need. No acoustic-model fine-tuning. |
| Privacy and deletion | Media/attempts saved atomically in a bounded separate database. Clip/attempt/snapshot deletion and erase-all verified. Original encrypted personal backup explicitly excludes therapy data; reports/clips need separate exports. No automatic report sending. |
| Root route | Opening `/` remains patient Home even with a stored caregiver role; explicit `/care` pairing remains functional. |
| Verification | **614 unit tests / 24 files, 45 distinct browser checks across the full run and targeted rechecks, repository ESLint, all three TypeScript projects, production web/API builds and compiled rehabilitation offline smoke passed.** [Dated evidence](docs/evidence/v5/VERIFICATION.md). |
| Visual/accessibility | 390×844 and 1440×1000: no horizontal page overflow, serious/critical Axe violations, console/page errors, inference calls or automatic speech in checked views. Scrollable tables/charts support keyboard focus. |
| Pending | Clinical validation, real patient/partner and SLP acceptance, native Tamil content/interface review, physical microphone/camera/device recognition quality, and live LLM evaluation. This is local practice/review, not an authenticated clinical portal or validated therapy. |

## Time, place and routine context (v4)

| Area | Implementation and evidence |
| --- | --- |
| Context engine | Shared bounded routine ranking uses fragment/topic, time proximity and selected place. Unique nonclinical routines may resolve a generic food/drink cue or “usual” reference; competing or explicitly conflicting context asks for clarification. No automatic speech, medication inference or routine-event assertions. [Design](docs/CONTEXT_ENGINE.md). |
| Caregiver controls | New Context engine tab: device/demo clock, manually selected place, source switches, 15/45/90-minute window, weekly routine add/edit/review/delete/undo, live draft preview and existing personal-context sharing permission. No GPS. |
| Data quality | Actual occurrence weekday handles midnight; unreviewed, wrong-place and invalid routines are excluded. Fictional sample routines are excluded from real-clock use until reviewed. Source switches also apply to old packets. Context is canonicalized and bound to the transmitted request. |
| Patient visibility | Expandable context clues on confirmation. Home and Topics use the same day/place/review matching. Explicit refusal, object, uncertainty, time and place outrank ambient clues. |
| Verification | **538 unit tests / 18 files; 36 browser checks plus 7 targeted rechecks after the final guard; 240/240 controlled fixtures; ESLint; three TypeScript projects; both production builds and compiled offline smoke passed.** [v4 evidence](docs/evidence/v4/VERIFICATION.md). |
| Visual/keyboard | Context controls, preview and editor checked at 390×844 and 1440×1000; no horizontal overflow, unlabelled controls, console/page errors, unexpected inference or audio. Arrow/Home/End tab navigation passed. |
| Still pending | Live LLM quality/latency with a real key or local model, native Tamil review, SLP and supported patient/partner phone acceptance. Weights are uncalibrated heuristics; evidence checks cannot prove all meanings. |

## Contextual engine and caregiver settings (v3)

| Area | Implementation and evidence |
| --- | --- |
| Contextual sentences | OpenAI, Anthropic, Gemini, Groq and local Ollama can frame new sentence drafts from the current fragment/question and permitted context. Evidence/context binding, explicit-detail checks, rejection deduplication, bounded waits and honest free fallback are enforced. These checks do not establish semantic or clinical accuracy. |
| Caregiver engine controls | PIN-protected Sentence engine tab: provider, editable model, deadline, masked session key, explicit text-sharing permission, synthetic connection test and key removal. Device-specific keys live in server memory; restart or 12 hours of inactivity clears them. Free vocabulary remains the default. |
| Personalization | Brief/natural/polite wording, preferred maximum length, communication note, optional confirmed recent/personal context, first Home input tile and reduced motion. Existing size/contrast/voice/tap/choice controls remain available. Context sharing starts off. |
| Patient control | Model output is marked “AI draft · Check the meaning.” Only the person's exact-sentence tap speaks. Changed partner questions invalidate pending/unselected suggestions; drafts are not reused as rehearsal cache entries. Demo warm-up makes no inference requests. |
| Automated checks | **473 unit tests / 17 files; complete 32-test browser suite; ESLint; web/server/shared TypeScript; production web/API builds; compiled offline PWA smoke all passed.** [Dated verification and limitations](docs/evidence/v3/VERIFICATION.md). |
| Controlled evaluation | **240/240** authored catalog executions passed, including bilingual vocabulary and refusal/rejection flows. This measures the controlled fixtures, not the new LLM's quality. |
| Visual checks | Sentence engine and Personalize at 390×844 and 1440×1000: no horizontal overflow, keyboard tab navigation, masked/empty key field, no unexpected audio or console errors. [Evidence](docs/evidence/v3/settings-visual-checks.json). |
| Pending | User-supplied key and live-provider quality/latency evaluation; native Tamil review including model evidence translations; SLP/patient/caregiver phone acceptance. No paid voice, hosting or treatment claims added. |

Setup: caregiver **Settings → Sentence engine → OpenAI**, enter a key, enable text sharing, save, then deliberately run **Test connection**. The test may use provider quota and sends synthetic content only. [Provider setup and official sources](docs/PROVIDERS.md).

## Approved improvement release (v2)

| Area | Implementation and evidence |
| --- | --- |
| Meaning accuracy | Shared grounding/deduplication/negation/body-side/language policy; bounded local selector with honest catalog fallback; every browser merge revalidated. Unsupported meanings can abstain. |
| Vocabulary | 124 bilingual complete-message meanings with Tamil/English/Tanglish lookup; personalized aliases, descriptions, pin/hide/edit/delete and explicit approval. Catalog and UI language review remain pending. |
| Patient access | Tamil patient controls, quieter Home, stable Help/repair/Pause/Stop, preference-based choice count/tap filtering/speech pace, two-step confirmation, draft recovery, recognition alternatives and Keep listening. |
| Communication widgets | Repair and shared-meaning check, comfort phrases, request/refusal builder, photo scenes and equivalent lists, stories, printable passport, word finder and drawing. These are design hypotheses, not proven treatment effects. |
| Offline and privacy | Shared controlled catalog offline, readiness checklist, passphrase-encrypted backup/preview/non-overwriting merge, fresh imported approval, encrypted durable queue/receipt/replay protection and Help expiry. |
| Automated verification | 358 unit tests, 26 distinct browser checks, ESLint, all three workspace typechecks and both production builds pass. Compiled PWA offline reload, vocabulary and negative-input/rejection flow pass. Full evidence: [v2 verification](docs/evidence/v2/VERIFICATION.md). |
| Controlled evaluation | [240/240 development executions](evals/intent/report.md): 120 authored scenarios × Tamil/English; not a held-out clinical measure. |
| Actual installed model | [24-case selector benchmark](evals/intent/report-local-selector.md): 20 timeouts with labelled fallback, four clarification bypasses, zero model completions within 8 seconds. No paid call/download. |
| Human acceptance | [12-check protocol](docs/IMPROVEMENTS_ACCEPTANCE.md), 6–8 formative patient/partner pairs; native Tamil, real voice/phone usability and SLP review all **pending**. |

Scope limits: personal scene hotspots do not perform learned photo recognition; the sentence builder is a small reviewed-template surface, not a general inflection system; the bilingual token baseline needs personalization and human language matching before comparative claims. No supervised therapy, new language, paid clone or hosting work was added.

Status vocabulary: **pending** = no completion evidence; **partial** = implementation exists with open checks; **passed** = dated execution evidence linked; **deferred** = explicitly outside the current cut. A milestone is not complete while its required checks remain pending. Evidence below must be replaced with actual output/paths, never an estimate. Human checks require the human's report.

## Original milestone ledger (v1 evidence; v2 additions above supersede implemented deferrals)

| Milestone / check | Status | Evidence / open work | Date |
| --- | --- | --- | --- |
| M0 [H] foundation implementation | partial | Workspace, strict contracts, local API, IndexedDB, PWA, PIN, fictional seed, controls and docs implemented; native phone install pending | 2026-09-27 |
| M0 [auto] `pnpm verify` green | passed | [Lint, type, unit and 19 browser checks](docs/evidence/verify.txt); [production build](docs/evidence/build.txt) | 2026-09-27 |
| M0 [auto] provider facts recorded | passed (documentation only) | [Official-source ledger](docs/PROVIDERS.md); no live-provider call implied | 2026-09-27 |
| M0 [human] HTTPS PWA installs on Android | deferred | Hosting explicitly deferred; H1 checklist below still required later | 2026-09-27 |
| M0 Full: Dockerfile, encrypted backup/restore, voice admin scripts | deferred | Track each implemented item here; do not infer completion from a stub | 2026-09-27 |
| M1 [H] core implementation | partial | Home, paged Topics/pain, Type, context/clock, mock/local intent, confirmation, audio and attempt log implemented; real-model and human checks pending | 2026-09-27 |
| M1 [auto] 20:58 Medicine mock flow | partial | Type night-tablet E2E and 13 fixture regression pass; exact Topics → Medicine path is available but not a separately named browser assertion | 2026-09-27 |
| M1 [auto] same flow with real provider | pending | No paid keys; optional local model is a separate measured alternative, not Anthropic evidence | 2026-09-27 |
| M1 [auto] I-1/2/3/4/5/9/10 checks | passed (bounded automated coverage) | [Verification](docs/evidence/verify.txt): trusted exact taps, expiry, Stop, superseding, lint boundary, fewer options, numerical/contact guards, image privacy, Home/confirmation dimensions and contrast. Semantic grounding and all-screen/manual accessibility remain pending | 2026-09-27 |
| M1 [auto] 13 [H] intent cases/report | passed (mock only) | [13-case report](evals/intent/report.md): deterministic top-1 92.3%, top-3 100%; no LLM quality or live latency claim | 2026-09-27 |
| M1 independent review | passed (local implementation) | [Review and evidence](docs/evidence/README.md); findings fixed and regression checked; native/clinical review separate | 2026-09-27 |
| M1 [human] device voice plays selected card on phone | pending | H2 checklist | 2026-09-27 |
| M1 Full: ≥20 eval cases | deferred | Expand with native speakers | 2026-09-27 |
| M3 [H] voice/signing implementation | partial | Device speech, consented exact recordings with review/save/delete/withdraw, signed text and device-bound mock voice grants implemented. Paid cloning, upload/trim and provider history deletion deferred | 2026-09-27 |
| M3 [auto] I-6/7/8 checks | passed (mock protocol/device harness) | [Verification](docs/evidence/verify.txt): offline Help, language-missing tone, consent gates, signature/text/expiry/device misuse; real microphone and provider deletion pending | 2026-09-27 |
| M3 [auto] cached tap-to-sound ≤0.3s | pending | Actual audio-start instrumentation; a mocked play promise is not audible-latency evidence | 2026-09-27 |
| M3 [human] cloned voice, listening rating, provider deletion | pending | Paid account/sample not supplied; H3 checklist | 2026-09-27 |
| M3 free alternative [human] exact recording matches phrase | pending | H3a checklist; does not pass generative-clone acceptance | 2026-09-27 |
| M3 Full: isolate, waveform, clean region, Sarvam routes, templates | deferred | Current provider shapes/retention and human comparison required first | 2026-09-27 |
| M2 [H] speech implementation | partial | Browser recognition, immediate start, 3-second pause/15-second limit, transcript/retry and partner question implemented. Mock samples explicitly labelled; paid STT unconnected | 2026-09-27 |
| M2 [human] “tablet… raathiri” phone flow | pending | H4 checklist | 2026-09-27 |
| M2 [auto] STT report without audio | pending | [Pending report and ten-clip protocol](evals/stt/report.md); zero audio clips supplied/evaluated, no CER or latency result | 2026-09-27 |
| M2 Full: provider comparison ≥20 clips/language | deferred | Compare Sarvam modes, Scribe/OpenAI; record chosen provider | 2026-09-27 |
| M5 [H] caregiver implementation | partial | QR/private link, role-bound grants, AES-GCM relay, feed/receipt/question, Help/ack/cancel, optional alarm and SMS composer implemented; real phones pending | 2026-09-27 |
| M5 [auto] two-context pairing/receipt/Help E2E | passed | [Browser run](docs/evidence/verify.txt): isolated patient/caregiver storage, encrypted WebSocket frames, receipts, questions, acknowledgment and cancellation | 2026-09-27 |
| M5 [human] two phones, ~1s sentence and Help round trip | pending | H5 checklist | 2026-09-27 |
| M5 Full: remote question, reconnect outbox, installed QR scanner | partial | Remote question implemented/tested; persistent reconnect outbox and built-in scanner deferred; phone camera can open the QR link | 2026-09-27 |
| M4 [H] on-device camera implementation | partial | Rear-camera/photo input, local COCO-SSD whitelist, label confirmation and explicit bottle demo implemented; real detection/phone checks pending | 2026-09-27 |
| M4 [auto] no image transfer while cloud consent off | passed | [Camera E2E](docs/evidence/verify.txt) blocks model download, selects a photo, confirms no image request and explicit local-model failure | 2026-09-27 |
| M4 [human] bottle photo yields water candidates | pending | H6 checklist | 2026-09-27 |
| M4 Full: explicit opt-in cloud vision | deferred | No automatic image upload or implied consent | 2026-09-27 |
| M6 [H] stage implementation | partial | Live tap/audio-start overlay, measured baseline, therapist metrics/chart/CSV, seven scenarios, silent three-scene warm-up and labelled offline cache implemented; rehearsal pending | 2026-09-27 |
| M6 [auto] overlay numbers match attempt log | passed | [Stage and baseline E2E](docs/evidence/verify.txt), hand-computed median/CSV fixtures. Browser voice is simulated; no audible latency claim | 2026-09-27 |
| M6 [human] two live and one offline phone rehearsals | pending | H7 checklist; use [demo script](docs/DEMO_SCRIPT.md) | 2026-09-27 |
| M6 independent review / demo freeze | partial | [Implementation review](docs/evidence/README.md) complete; human demo freeze awaits H7 rehearsals | 2026-09-27 |
| M7 full onboarding, memory and context | deferred | People/aliases, places, routines/vocabulary, phrasebook/promotion, body map, backup | 2026-09-27 |
| M7 [auto] usual/substitution/addressee mock E2E | partial | Addressee language regeneration passes; explicit memory/substitution persistence exists but the complete repeated-use learning acceptance remains pending | 2026-09-27 |
| M7 [auto] learned-routine unit tests | pending | Hand-created 7-day fixtures and median-time checks | 2026-09-27 |
| M8 personal objects | deferred | Teach photos, embeddings, kNN, threshold tuning and management | 2026-09-27 |
| M8 [human] ≥80% top-1 on 20 held-out photos | pending | H8 checklist; ordinary COCO detection is not this result | 2026-09-27 |
| M9 full therapist dashboard | deferred | Full metrics, heatmap, concepts/substitutions/rejected sets, encrypted export/import, print/study mode | 2026-09-27 |
| M9 [auto] metrics fixtures and export/import round trip | partial | Hand-computed medians, success denominators, raw-text omission and CSV formula-escaping tests pass. Encrypted export/import not implemented | 2026-09-27 |
| M10 Hindi/Telugu | deferred | UI, grammar, templates, routing and ≥15 cases per language | 2026-09-27 |
| M10 [auto] language eval targets or recorded gaps | pending | Live provider results and native review separate from shape tests | 2026-09-27 |
| M10 [human] nurse Hindi same-voice flow + language sign-off | pending | H9 checklist and [language inventory](docs/LANGUAGE_REVIEW.md) | 2026-09-27 |
| M11 hardening/pilot | deferred | Web Push, manual accessibility, offline matrix, security/privacy review, erase/exports, budgets, ≥60 evals, Docker, phone docs | 2026-09-27 |
| M11 [auto] `pnpm verify` / `pnpm eval` targets | pending | Full scope must be present before these imply pilot readiness | 2026-09-27 |
| M11 [human] all SPEC §18 real-device acceptance | pending | H10 checklist | 2026-09-27 |

## Human checklists — no reports received

When ready, ask the human to run the relevant checklist and record date, phone/browser/OS, mode, observation and failures here. No real recording or patient information needs to be committed.

- **H1 Install:** use the future HTTPS URL on Android → install → reopen standalone → grant microphone/camera → confirm both work. Hosting is currently deferred.
- **H2 Confirm gate:** choose the actual Tamil/device voice → Topics → Medicine → Listen one candidate → tap a different exact sentence → confirm only the tapped sentence speaks → Stop during playback → repeat after slow preparation. Report missing voices, pronunciation and tap behaviour.
- **H3 Paid clone:** obtain voice-owner consent → upload/record the sample → inspect trim/duration/clipping → create clone → listen to Tamil and English canonical phrases → rate likeness 1–5 → request withdrawal → verify deletion at provider and local samples. This needs an actual account and explicit deletion authorization.
- **H3a Free voice:** record the displayed phrase with consent → listen and compare words → save → tap that exact phrase from the patient view → confirm own recording plays → select an unrecorded phrase → confirm visible generic/text fallback → delete the recording and verify it no longer plays.
- **H4 Speech:** on the phone, tap Speak once → say “tablet… raathiri” with pauses → wait for endpointing → inspect transcript and candidates → try incorrect/empty recognition and retry → evaluate about ten consented clips without committing audio.
- **H5 Caregiver:** pair a second phone → enable alerts and keep page open → tap a patient sentence → measure receipt delay → tap Help → caregiver acknowledges → patient sees acknowledgement → disconnect and confirm honest failure/late-delivery behaviour → inspect SMS composer, without sending a real test message unnecessarily.
- **H6 Camera:** allow rear camera → photograph a water bottle in room lighting → inspect detected label and water candidates → reject wrong guesses → check network capture for image upload while cloud consent is off.
- **H7 Rehearsal:** run [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) twice on phones → record taps/timings and faults → disable patient network → run again with every cached result badged and unavailable caregiver steps skipped → report actual result; do not infer from automated runs.
- **H8 Personal objects:** teach the tablet box and spectacles with training images → use a separate 20-photo holdout → count correct top-1 labels → report fraction, photos' lighting/angles and threshold.
- **H9 Languages:** Tamil/Hindi/Telugu speakers review each inventory entry for colloquial meaning, register, gender/case, urgency and readable pronunciation → run shoulder/left with Nurse Anjali in Hindi → verify same verified clone/actual mode → record reviewer and corrections.
- **H10 Final phones:** execute each SPEC §18 item on a budget Android and second phone over HTTPS: install/setup/consent; night-tablet flow; repeated substitution learning; Hindi pain; remote question; taught-object photo; airplane-mode cached Help/phrases and SMS/reconnect; therapist/CSV. Attach exact results by item 1–8; item 9 remains an automated report. Any missing feature stays pending.

## Measurement register

| Metric from SPEC §15.4 | Target | Measured result |
| --- | --- | --- |
| Initial JS gzip | ≤200 KB | 155,639 bytes, entry + modulepreload + registration gzip; [method](docs/evidence/bundle-size.json). Excludes full offline precache |
| Home interactive, budget Android/4G | <3s | pending human/device run |
| STT, 2s clips | p50 ≤1.5s | pending consented audio evaluation |
| Round-1 intent | p50 ≤3s / p95 ≤6s | pending live model measurement |
| Cached/prefetched tap-to-audio | ≤0.3s | pending actual playback instrumentation |
| Uncached tap-to-audio | p50 ≤1.5s | pending actual playback instrumentation |
| Speech first input to audio | median <10s | pending real phone results |

## Evidence log

- 2026-09-27: user approved the build, no paid keys, and deferred hosting. [Approved plan](docs/PLAN.md).
- 2026-09-27: original brief preserved in `docs/SPEC.md`; [provider documentation review](docs/PROVIDERS.md) covers free modes and paid upgrades. No live-provider or human result claimed.
- 2026-09-27: [automated verification](docs/evidence/verify.txt), [build](docs/evidence/build.txt), [mock evaluation](evals/intent/report.md) and [review/visual evidence](docs/evidence/README.md) recorded. No live model, paid provider, phone or native-speaker acceptance result is implied.
- 2026-09-27: compiled PWA installed its service worker and loaded Home/My phrases with network transport disabled; [smoke output](docs/evidence/pwa-smoke.txt). This is desktop Chromium evidence, not an Android install report.
- 2026-09-27: implementation committed locally as `9a06b19` on `codex/sollu-local-mvp`; planning/specification commit `1125adb`. Nothing pushed or deployed. Final verification: 66 unit tests, 19 browser tests, lint, types, build and 13 mock intent cases passed.
