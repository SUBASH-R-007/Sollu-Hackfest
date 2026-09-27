# Sollu working guide

Source of truth: docs/SPEC.md. Approved updates: docs/PLAN.md and docs/DECISIONS.md.
Resume from PROGRESS.md; preserve the current milestone, open checks and modified files when compacting.
User approved local implementation on 2026-09-27; no paid keys and no hosting now.
Work order: M0 → M1 → M3 → M2 + early M6 → M5 + M4 → remaining M6 → M7–M11.
Commands: pnpm install; pnpm dev; pnpm test; pnpm e2e; pnpm eval; pnpm verify; pnpm build; pnpm start.
Check actual root scripts before use; pnpm verify must cover lint, types, unit and E2E checks.
Use strict TypeScript, shared Zod contracts and the repository lockfile.
Defaults: mocked providers; optional local Ollama; browser STT/device speech; exact-phrase recordings.
Do not claim browser Tamil availability, offline voices, cloud clone or real AI quality without evidence.
Only features/audio may access audio output APIs, including studio, preview, alarm and baseline.
I-1: Only a fresh trusted patient tap on the exact sentence may speak; no autoplay, remote speech or prefetch playback; Stop/newer taps supersede pending work.
I-2: One audio module with speak/preview/studio/alarm/baseline channels; enforce boundaries in lint and tests.
I-3: At most three distinct options plus None of these; return fewer safely and never invent filler.
I-4: Ground guesses in fragment/context; no invented medicines, doses, numbers, times, names, places or events.
I-5: Unpicked candidates never speak as the person; only an explicit neutral Listen preview is permitted by SPEC §9.
I-6: Help requires no AI: cached own phrase → available device voice → tone, with an honest send status and SMS option.
I-7: No cloned/recorded own voice without consent; withdrawal stops use and removes requested local/provider assets with confirmed status.
I-8: Cloud TTS requires valid device/text/language/expiry signature and device-bound voice grant; sign sources are constrained.
I-9: Personal records stay on-device; no content logs; manual place labels, no GPS; transient uploads deleted after processing.
I-10: Patient targets ≥72×72 px, primary tiles ≥120 px tall; icon + word; no required gestures/time limits; specified contrast.
Freshness is checked at actual playback (≤1500 ms); late audio needs a new exact-sentence tap.
Intent prompt: docs/SPEC.md §7.3. Signature/source rules: §7.4 and §7.6. Data/context: §5–6.
Test/eval targets: §15. Milestones and acceptance: §17–18. Demo: docs/DEMO_SCRIPT.md.
Before provider changes, verify official docs and update docs/PROVIDERS.md with date and retention/training/limits.
Never put keys in web code or git. Never commit voice clips, exports, real personal data or browser auth state.
Use fictional seed content; no real drug names, doses, diagnoses or clinical advice.
List every new Tamil/Hindi/Telugu string in docs/LANGUAGE_REVIEW.md; native-speaker approval stays pending.
Keep privacy copy accurate for actual enabled modes; device voices and recordings are not clones.
Record every acceptance check, dated evidence and deferred item in PROGRESS.md; mock success is not live-provider success.
Human checks need a checklist and the human's actual report; never mark them passed yourself.
Review against invariants after M1 and before demo freeze; fix correctness gaps before committing milestones.
Do not publish, push shared remotes, buy services or delete provider voices without the required user authorization.
