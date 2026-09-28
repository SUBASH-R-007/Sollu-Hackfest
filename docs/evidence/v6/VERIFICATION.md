# Privacy, fragmented communication and word-dashboard verification

Date: 2026-09-28. Windows, Node 22.17.1, installed Chromium 151. All automated patient/report data is fictional. No real API credentials, paid calls, physical microphone/camera tests, model downloads, report sending, hosting or deployment.

| Check | Observed result |
| --- | --- |
| Unit | **731/731 tests, 30 files**, full run with `node node_modules/vitest/vitest.mjs run --maxWorkers=2`. New coverage includes fragment repair/negation/ambiguity, correction scope/boundaries, server cloud policy and local endpoint validation, browser privacy guards, post-registration privacy recheck, word denominators and authenticated report encryption. |
| Browser | **54 distinct checks passed across runs.** Initial 53-case run: 47 passed. Targeted recheck passed all six remaining checks after fixture corrections: two draft-recovery setups, two accessibility selectors, an async privacy-toggle assertion and one transient `ERR_NETWORK_CHANGED` navigation. One additional dashboard-word → manual-practice check passed. No outstanding failed browser case. |
| New browser flows | English/Tanglish/Tamil fragments preserve original text and do not auto-speak; ambiguous fragments clarify; refusal remains refusal. Default cloud options disabled, legacy remote recognizer not started, remote-only voices blocked. Privacy revocation propagates across tabs and survives unrelated settings saves. Encrypted report download/wrong-passphrase/decrypt/consented import round trip and reviewed word denominators passed. Word choice prefills local practice, clears router state, keeps the word out of the URL, starts no microphone/speech and saves a word record only after explicit actions. |
| Controlled evaluation | **240/240** authored catalog executions passed. This is not an unseen-speaker study, clinical result or live LLM-quality estimate. [Report](../../../evals/intent/report.md). |
| Lint/types | Repository ESLint, web/server/shared TypeScript and `git diff --check` passed. Final web typecheck/lint included numeric-token acceptance in word-practice preselection. |
| Web build | Vite/PWA passed. Main entry 679.37 kB / **203.20 kB gzip**; lazy Practice 19.70 kB / 7.21 kB gzip; lazy Therapist 78.44 kB / 22.75 kB gzip. PWA precaches 72 entries / 2835.06 KiB. Original 200 kB entry target remains exceeded; existing TensorFlow chunk warning remains. |
| API build | tsup passed, **203.10 kB ESM**. Sandbox parent-directory restriction was resolved with an approved local build outside that restriction. |
| Offline production | [Script](privacy-offline.mjs) against temporary loopback 8792: previously unvisited practice and therapist routes opened offline; reviewed practice saved; word metrics computed; encrypted report downloaded without network; saved practice survived dashboard reload. Temporary server stopped afterwards. |
| Visual/accessibility | [Results](privacy-visual-checks.json), [script](privacy-visual.mjs). At 390×844 and 1440×1000: no horizontal page overflow, serious/critical Axe violations, console/page errors, external HTTP requests or automatic speech in the checked dashboard/report/privacy views. Screenshots visually inspected. The word table intentionally scrolls horizontally within a focusable region on narrow screens. |
| Runtime | Original localhost web/API remain available. Server health reports default cloud AI blocked. No live local-model or cloud-model acceptance claimed. |

## Reproduction and test-environment notes

The installed dependencies were reused. The bundled pnpm wrapper attempted a dependency synchronization and stopped with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; no module purge or reinstall was performed. Direct local entry points ran the same TypeScript, ESLint, Vitest, Playwright, Vite, tsup and evaluation tasks. The evaluator's sandbox user-info error was resolved by an approved local run. There was no automatic approval rejection requiring user action.

The first parallel unit attempt exposed two outdated recognition fixtures and one provider-test timeout under CPU contention. Recognition fixtures were updated to model the new `processLocally` capability. The full two-worker rerun passed without increasing test deadlines. Browser tests use simulated speech and fictional/generated media; their success does not establish physical audio quality.

Screenshots: [word table mobile](word-table-mobile.png), [word table desktop](word-table-desktop.png), [word overview mobile](word-accuracy-mobile.png), [word overview desktop](word-accuracy-desktop.png), [encrypted report mobile](encrypted-report-mobile.png), [encrypted report desktop](encrypted-report-desktop.png), [privacy mobile](privacy-controls-mobile.png), [privacy desktop](privacy-controls-desktop.png).

## Deliberate limits

- Default sentence processing uses the free bundled catalog; optional loopback Ollama needs a separately installed, reviewed local model and daemon configuration. No model was downloaded or live-tested.
- Local-only policy blocks public-cloud AI by default, limits browser voices/recognition and blocks new external object-model downloads. Same-origin Sollu-server requests and explicitly paired caregiver communications remain possible. A remotely hosted server would need its own privacy review.
- Encrypted report export protects that file. It does not encrypt active IndexedDB, individual audio/video downloads, printed reports or prior plaintext exports. Imported reviewer identities are not authenticated.
- Text/word comparison is not a pronunciation, intelligibility, diagnostic or recovery score. Explicit correction personalization is not acoustic-model fine-tuning.
- Native Tamil/clinical-language review, physical-device testing, representative patient/partner/SLP acceptance, independent security review, regulatory assessment and clinical validation remain pending. No HIPAA compliance, CDSCO approval or clinical-grade claim is made.

See [privacy and validation research](../../PRIVACY_AND_VALIDATION.md) and [rehabilitation workflow](../../REHABILITATION.md).
