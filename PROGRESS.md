# Sollu progress and acceptance ledger

Last updated: 2026-09-27. **Current milestone: M0/M1 local implementation.** User approved the plan with no paid keys and requested a free alternative; hosting is deferred. The complete specification is [docs/SPEC.md](docs/SPEC.md); approved changes are [docs/DECISIONS.md](docs/DECISIONS.md).

Status vocabulary: **pending** = no completion evidence; **partial** = implementation exists with open checks; **passed** = dated execution evidence linked; **deferred** = explicitly outside the current cut. A milestone is not complete while its required checks remain pending. Evidence below must be replaced with actual output/paths, never an estimate. Human checks require the human's report.

## Milestone ledger

| Milestone / check | Status | Evidence / open work | Date |
| --- | --- | --- | --- |
| M0 [H] foundation implementation | partial | Workspace and local app in progress; audit all SPEC §17 foundation items before closure | 2026-09-27 |
| M0 [auto] `pnpm verify` green | pending | Run after implementation; paste output/link result | 2026-09-27 |
| M0 [auto] provider facts recorded | passed (documentation only) | [Official-source ledger](docs/PROVIDERS.md); no live-provider call implied | 2026-09-27 |
| M0 [human] HTTPS PWA installs on Android | deferred | Hosting explicitly deferred; H1 checklist below still required later | 2026-09-27 |
| M0 Full: Dockerfile, encrypted backup/restore, voice admin scripts | deferred | Track each implemented item here; do not infer completion from a stub | 2026-09-27 |
| M1 [H] core implementation | pending | Home, topic subflows, Type, context/clock, intent, confirmation, audio, attempt log | 2026-09-27 |
| M1 [auto] 20:58 Topics → Medicine mock E2E | pending | Need three distinct Tamil options and mock label | 2026-09-27 |
| M1 [auto] same flow with real provider | pending | No paid keys; optional local model is a separate measured alternative, not Anthropic evidence | 2026-09-27 |
| M1 [auto] I-1/2/3/4/5/9/10 checks | pending | Include expired taps, Stop, no prefetch playback, safe fewer-options fallback, privacy and dimensions | 2026-09-27 |
| M1 [auto] 13 [H] intent cases/report | pending | Fixture results must be labelled mock; live judge/quality evaluation separate | 2026-09-27 |
| M1 independent review | pending | Review implementation against spec/invariants after checks | 2026-09-27 |
| M1 [human] device voice plays selected card on phone | pending | H2 checklist | 2026-09-27 |
| M1 Full: ≥20 eval cases | deferred | Expand with native speakers | 2026-09-27 |
| M3 [H] voice/signing implementation | pending | Free exact recordings/device speech; original paid clone, upload extraction/trimming and history-deletion flow must be tracked separately | 2026-09-27 |
| M3 [auto] I-6/7/8 checks | pending | Offline Help, consent gate/withdrawal, signature/grant misuse | 2026-09-27 |
| M3 [auto] cached tap-to-sound ≤0.3s | pending | Actual audio-start instrumentation; a mocked play promise is not audible-latency evidence | 2026-09-27 |
| M3 [human] cloned voice, listening rating, provider deletion | pending | Paid account/sample not supplied; H3 checklist | 2026-09-27 |
| M3 free alternative [human] exact recording matches phrase | pending | H3a checklist; does not pass generative-clone acceptance | 2026-09-27 |
| M3 Full: isolate, waveform, clean region, Sarvam routes, templates | deferred | Current provider shapes/retention and human comparison required first | 2026-09-27 |
| M2 [H] speech implementation | pending | Immediate start, generous endpointing, transcript/retry, partner question; mock/browser/live STT distinguished | 2026-09-27 |
| M2 [human] “tablet… raathiri” phone flow | pending | H4 checklist | 2026-09-27 |
| M2 [auto] STT report without audio | pending | About ten consented clips; no CER/latency fabricated from fixtures | 2026-09-27 |
| M2 Full: provider comparison ≥20 clips/language | deferred | Compare Sarvam modes, Scribe/OpenAI; record chosen provider | 2026-09-27 |
| M5 [H] caregiver implementation | pending | QR, role grants, encryption, feed, receipt, Help/ack, SMS/cancel | 2026-09-27 |
| M5 [auto] two-context pairing/receipt/Help E2E | pending | Distinct browser storage contexts and real encrypted relay traffic | 2026-09-27 |
| M5 [human] two phones, ~1s sentence and Help round trip | pending | H5 checklist | 2026-09-27 |
| M5 Full: remote question, reconnect outbox, installed QR scanner | deferred | Record items separately if implemented early | 2026-09-27 |
| M4 [H] on-device camera implementation | pending | COCO-SSD whitelist + label; ordinary model asset downloads distinguished from image upload | 2026-09-27 |
| M4 [auto] no image transfer while cloud consent off | pending | Inspect network requests/test assertions | 2026-09-27 |
| M4 [human] bottle photo yields water candidates | pending | H6 checklist | 2026-09-27 |
| M4 Full: explicit opt-in cloud vision | deferred | No automatic image upload or implied consent | 2026-09-27 |
| M6 [H] stage implementation | pending | Overlay, baseline, therapist-lite/chart/CSV, scenarios, labelled cache, warm-up | 2026-09-27 |
| M6 [auto] overlay numbers match attempt log | pending | Scripted E2E with actual measured events | 2026-09-27 |
| M6 [human] two live and one offline phone rehearsals | pending | H7 checklist; use [demo script](docs/DEMO_SCRIPT.md) | 2026-09-27 |
| M6 independent review / demo freeze | pending | No freeze until applicable auto checks and actual rehearsal reports are recorded | 2026-09-27 |
| M7 full onboarding, memory and context | deferred | People/aliases, places, routines/vocabulary, phrasebook/promotion, body map, backup | 2026-09-27 |
| M7 [auto] usual/substitution/addressee mock E2E | pending | Two prior confirmations and real persistence/retrieval required | 2026-09-27 |
| M7 [auto] learned-routine unit tests | pending | Hand-created 7-day fixtures and median-time checks | 2026-09-27 |
| M8 personal objects | deferred | Teach photos, embeddings, kNN, threshold tuning and management | 2026-09-27 |
| M8 [human] ≥80% top-1 on 20 held-out photos | pending | H8 checklist; ordinary COCO detection is not this result | 2026-09-27 |
| M9 full therapist dashboard | deferred | Full metrics, heatmap, concepts/substitutions/rejected sets, encrypted export/import, print/study mode | 2026-09-27 |
| M9 [auto] metrics fixtures and export/import round trip | pending | Hand-computed results and content equality after decrypt | 2026-09-27 |
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
| Initial JS gzip | ≤200 KB | pending build measurement |
| Home interactive, budget Android/4G | <3s | pending human/device run |
| STT, 2s clips | p50 ≤1.5s | pending consented audio evaluation |
| Round-1 intent | p50 ≤3s / p95 ≤6s | pending live model measurement |
| Cached/prefetched tap-to-audio | ≤0.3s | pending actual playback instrumentation |
| Uncached tap-to-audio | p50 ≤1.5s | pending actual playback instrumentation |
| Speech first input to audio | median <10s | pending real phone results |

## Evidence log

- 2026-09-27: user approved the build, no paid keys, and deferred hosting. [Approved plan](docs/PLAN.md).
- 2026-09-27: original brief preserved in `docs/SPEC.md`; [provider documentation review](docs/PROVIDERS.md) covers free modes and paid upgrades. No live-provider or human result claimed.
- Implementation/test/commit evidence: pending; append actual commands, outputs, files and commit IDs after execution.
