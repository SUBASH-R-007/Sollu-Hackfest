# Contextual engine and caregiver settings — verification

Date: 28 September 2026. Local Windows workspace, Node 22.17.1, installed Chromium 151. Fictional inputs and simulated speech; provider wire responses were mocked. No real API key, paid request, model download, hosting or patient-data migration was used.

| Check | Observed result |
| --- | --- |
| Unit suite | `node node_modules/vitest/vitest.mjs run`: **473 passed, 17 files**, final run 13:53 IST. Includes provider wire shapes, authentication/key isolation/consent/expiry, bounded failure/fallback, contextual evidence, refusal/quantity/side/tense/question/name guards, deduplication and private-context filtering. |
| Browser suite | `node node_modules/@playwright/test/cli.js test`: **32/32 passed in 2.1 minutes**. Existing patient, encrypted relay, offline queue and support flows plus contextual sentences, current signed-response trust, refusal exclusion, key non-persistence, key clearing, consent and personalization. |
| Question freshness | Actual two-context encrypted relay sends a new question while an old inference response is held. Pending choices clear, the old response cannot reappear, and no audio starts. The test respects the configured 400 ms repeat-tap filter. |
| Lint/types | Entire repository ESLint passed. Web, server and shared `tsc --noEmit` each passed. Central audio boundary retained. |
| Controlled evaluation | **240/240** authored executions passed. See [current report](../../../evals/intent/report.md). Catalog-only fixtures; not held-out evaluation or a score for LLM accuracy. |
| Production builds | API tsup bundle **177.51 kB**. Web Vite build succeeded: entry **658.70 kB / 195.98 kB gzip**, separately loaded Settings **43.77 kB / 13.65 kB gzip**. PWA **66 entries / 2679.01 KiB**. Existing TensorFlow chunk warning remains; these are build sizes, not measured phone performance. |
| Compiled offline PWA | Re-ran the [offline smoke script](../v2/pwa-smoke.mjs) against this release on temporary port 8792. Service worker controlled the page; Home reloaded with networking disabled; an API fetch was confirmed blocked. Previously unvisited vocabulary loaded offline with a Tamil phrase. “No water” stayed a refusal and did not repeat after rejection. Temporary server was stopped afterward. |
| Visual/keyboard | Engine and Personalize pages checked at 390×844 and 1440×1000: no horizontal overflow, arrow/Home/End tab navigation, empty masked labelled key input, zero console/page errors and no audio. [Structured results](settings-visual-checks.json). |
| Review | Independent engine and provider/privacy reviews completed. Fixed catalog medicine/tablet equivalence and Tanglish alias regressions without granting those exceptions to arbitrary model output; preserved qualifier/uncertainty/possession protections. Demo warm-up is entirely local. |
| Diff hygiene | `git diff --check` passed. CRLF conversion notices only. No dependencies changed. |

Installed Node command entry points were used because the host's pnpm wrapper does not reliably resolve workspace tools. The evaluator and API build needed execution outside the Windows sandbox for user-directory/esbuild access; neither made provider calls.

## Evidence limits

Real provider compatibility, availability, sentence quality, Tamil translation, latency and quota usage remain unmeasured until an API key or local model is deliberately tested. Provider connection tests use a tiny synthetic response and do not measure communication quality. Generated candidates and their translations are model-authored drafts; syntactic and lexical guards cannot prove all meanings equivalent. Native-speaker and SLP review, supported patient acceptance and real-phone voice/accessibility testing remain pending. Browser speech fixtures verify exact text and activation control, not audible quality or clinical outcomes.

The default uses free vocabulary. Cloud selection requires explicit device permission. Optional recent/personal context starts off; API keys entered in settings stay only in device-scoped server memory and expire on restart or after 12 hours without activity. A local caregiver PIN protects the settings UI, not an independent server authorization boundary. See [privacy](../../PRIVACY.md) and [provider documentation](../../PROVIDERS.md).

Screenshots: [engine mobile](settings-engine-mobile.png), [engine desktop](settings-engine-desktop.png), [personalization mobile](settings-personalize-mobile.png), [personalization desktop](settings-personalize-desktop.png).
