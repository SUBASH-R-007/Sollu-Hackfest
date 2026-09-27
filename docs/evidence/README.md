# Local verification evidence — 2026-09-27

This evidence applies to the approved local no-key prototype, not the entire original specification. No deployment, paid provider, real patient data, voice-owner recording, real phone, clinician or native-speaker acceptance was involved.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm verify` | PASS: lint, strict types, 66 unit tests in 8 files, 19 browser tests | [Full output](verify.txt) |
| `pnpm build` | PASS: web, PWA/service worker and API bundles | [Full output](build.txt) |
| `pnpm eval` | PASS: 13 deterministic fixtures, top-1 heuristic 92.3%, top-3 100%, zero specified forbidden-pattern hits | [Output](intent-eval.txt), [qualified report](../../evals/intent/report.md) |
| Initial JS gzip | 155,639 bytes; below 200,000-byte target | [Exact files and method](bundle-size.json) |
| Compiled offline shell | PASS: installed service worker, offline Home reload, four inputs, failed API fetch and offline phrasebook navigation | [Output](pwa-smoke.txt), [executed smoke source](pwa-smoke-source.txt) |
| Visual inspection | Desktop 1440×1100 and mobile 390×844 Home inspected; no browser error overlay | [Desktop](desktop-home.png), [mobile full page](mobile-home.png) |

Environment: Windows, Node 22.17.1, pnpm 11.19.0, installed Chromium 151, localhost API and Vite. Browser scenarios use a 390×844 viewport and isolated browser storage for the caregiver. The speech harness simulates recognition and synthesis while requiring actual trusted browser interactions; it establishes gating, timing bookkeeping and state transitions, not audible quality or physical-device latency.

The initial-JS measurement gzips the HTML entry, modulepreload and registration scripts with Node zlib. It excludes CSS, fonts, lazy camera/TF.js chunks, the service worker and its background precache. The full PWA precache is 63 entries / 2448.68 KiB. The lazy TensorFlow chunk produces a size warning; it is not loaded as initial executable Home code. Phone/4G performance is unmeasured.

For the compiled smoke check, the built API served the web bundle on local port 8790. Chromium transport was disabled after service-worker installation. An uncached API fetch failed while Home and My phrases still rendered. This Chromium emulation reported `navigator.onLine=true` after an offline reload; the assertion therefore used actual network failure. Real airplane-mode UI and installed Android acceptance remain pending. The temporary compiled server was stopped after the check.

## Coverage and independent review

Separate implementation agents reviewed audio/voice handling, context and backend validation, relay security, browser flows, and documentation. Findings fixed before the final run included stale playback callbacks, losing language/urgency on replay, consent rechecks, baseline tap accounting, repeated keyboard activation, metadata falsely grounding quantities, and reuse of cached guesses after changing a stable scene.

- Audio tests cover exact text, one-use trusted tickets, the 1500 ms start deadline, synthetic-event rejection, Stop/supersede, delayed decode, late native speech callbacks, missing Tamil voices, neutral preview and role/channel boundaries. No patient speech is remotely triggered.
- Backend tests cover tokens/rate limits, consent, device-bound voice grants, canonical signing, changed text/language, expiry, deduplication, excluded sentences, unsupported contacts, digit/number-word guards, and content-free logs. Weekday/round/count/age values cannot ground a quantity; complete clock tokens do not license an extracted tablet count.
- Relay checks cover AES-GCM round trips/tampering, bounded decrypted schemas, sender-role/type restrictions, opposite-role routing, receipts, Help/ack/cancel and stale decrypt results after disconnect. Pairing links are private capabilities; production hardening remains separate.
- Patient browser flows cover Type, guided pain, speech endpointing, labelled samples, safe fewer-options output, None of these, preview versus selection, offline Help/SMS, camera no-upload failure, fresh re-tap after expiry, keyboard confirmation, listener-language changes and measured baseline/overlay consistency.
- Home and confirmation touch targets are measured. Home has no serious/critical axe findings and passes enhanced text contrast. This does not establish every screen's accessibility or TalkBack behaviour.
- Cache regressions ensure routine, place, listener/register, vocabulary and contact changes invalidate guesses; identical rehearsal scenes remain stable despite elapsed clock time or reordered lists. Every reuse is labelled CACHED and never autoplays.

Grounding remains heuristic. Unknown names/events, complete Tamil advice semantics, colloquial quality and clinical suitability still require live-model and native-speaker review. Rehearsal caches intentionally do not track evolving recent turns or additive examples; they are previous guesses for fixed demo scenes, not fresh inference. Paid adapters, arbitrary generative own-voice synthesis, STT accuracy, phone listening, and M7–M11 full-product acceptance remain open in [PROGRESS.md](../../PROGRESS.md).

## Reproduction

Use the commands in the root README. Install or select a compatible Chromium if needed. `pnpm verify` starts the development servers when none are running. Keep source edits stopped during browser tests: a development hot reload resets in-memory patient state and can invalidate an in-progress scenario.

For the separate compiled smoke check, run `pnpm build`, start the compiled API with `PORT=8790` and `PUBLIC_ORIGIN=http://127.0.0.1:8790`, then execute the linked smoke source as an `.mjs` file from the repository, optionally setting `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Restart the compiled API after rebuilding, because its static-file routes are registered at startup. No automatic model or provider installation occurs.
