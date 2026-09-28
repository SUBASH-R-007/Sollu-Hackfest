# Attached jury guidance — implementation verification

Date: 2026-09-28. Windows, Node 22.17.1, installed Chromium 151. Fictional data and simulated browser speech only. No real patient data, paid calls, live cloud/model inference, physical microphone testing, downloads of models, report sending, hosting or GitHub push.

| Check | Observed result |
| --- | --- |
| Full unit suite | **789/789 tests in 33 files**, `node node_modules/vitest/vitest.mjs run --maxWorkers=2`. Includes predefined health/help routing, actual provider provenance, refusal/history/dosage clarification, context minimization, report scope validation, encrypted round-trip and missing timing. |
| Browser suite | **59 distinct cases passed across runs.** Full 59-case run passed 56; three test-only corrections then passed together with `--last-failed`. Corrections scoped duplicate badge/navigation selectors and replaced an obsolete expectation that second-round pain requests call a model. Health/help inputs now assert zero intent requests and no automatic speech. |
| Catalog evaluation | **240/240 authored fixtures** passed using the local evaluator. This is controlled catalog evidence, not clinical validation or live LLM performance. |
| Lint and types | Repository ESLint and web/server/shared TypeScript passed. Final changed-file ESLint passed after selector/copy fixes. Git whitespace check passed with CRLF recognized as a line ending. |
| Web production build | Passed; main 683.14 kB / **204.44 kB gzip**, Settings 76.75 / 23.54 kB gzip, Therapist 82.77 / 24.18 kB gzip. PWA 72 entries / 2848.38 KiB. Existing TensorFlow chunk-size warning and original entry-size target remain unresolved; no new performance claim. |
| API production build | Passed, **205.94 kB ESM**. Windows sandbox parent-directory resolution required an approved local build. The evaluator's sandbox user-info failure also required an approved local run. |
| Visual/accessibility | [Script](jury-visual.mjs), [results](jury-visual.json). Supported selection, Privacy, Communication Progress Report and prepared help at 390×844 and 1440×1000: zero serious/critical Axe findings, horizontal overflow, console/page errors, external HTTP requests, automatic speech or recognition starts. Representative screenshots visually inspected. |
| Runtime | Existing web/API remain available; `/api/health` reports `allowCloudAI:false`, `local-only`. No user browser settings or stored patient records were changed by isolated verification contexts. |

The visual script initially used English selectors against the fresh Tamil UI. It now explicitly switches the fictional profile's interface using the language control before the English walkthrough; the full script then passed. No production behavior was relaxed to satisfy checks.

Exports remain version 1 with compatible interpretation defaults for older snapshots. JSON and encrypted JSON contain fixed scope metadata; both CSV formats add `record_type` and a `report_metadata` row even when empty. CSV consumers must distinguish metadata from practice/communication records. New imports reject altered claims of clinical validation. Decryption authenticates file integrity, not the identity of a therapist.

Prepared health/help routing is bounded to recognized expressions, explicit input metadata and reviewed corrections. It is not a detector for every emergency or medical term. Existing candidate checks remain necessary; unknown inputs can require clarification. Optional two-step confirmation is described accurately: candidate selection then Say; some tools use a repeated phrase tap; My phrases, quick phrases and Listen remain deliberate one-tap actions.

Remaining acceptance: representative users/SLPs, native language review, physical-device/audio/offline trials, regulatory intended-use assessment, independent security review and any claimed clinical validation. Active browser storage is unencrypted by Sollu, local PIN/reviewer identity is not authenticated clinical authorization, and automatic saved-history expiry is absent. See [jury guidance review](../../JURY_READINESS.md) and [privacy boundaries](../../PRIVACY_AND_VALIDATION.md).

Screenshots: [prepared help mobile](prepared-help-390.png), [prepared help desktop](prepared-help-1440.png), [supported selection mobile](supported-selection-390.png), [supported selection desktop](supported-selection-1440.png), [report mobile](communication-report-390.png), [report desktop](communication-report-1440.png), [privacy mobile](privacy-390.png), [privacy desktop](privacy-1440.png).
