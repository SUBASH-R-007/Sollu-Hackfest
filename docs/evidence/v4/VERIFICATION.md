# Time, place and routine context — verification

Date: 28 September 2026. Windows local workspace, Node 22.17.1 and installed Chromium 151. Synthetic fictional inputs; model HTTP results and audible speech simulated. No real API key, paid request, model download or deployment.

| Check | Observed result |
| --- | --- |
| Unit suite | **538 passed / 18 files** after the final guard. Covers context source filtering, canonical transmitted packet, actual weekday across midnight, sample vs reviewed routines, invalid/out-of-window/wrong-place activities, generic/explicit references, ambiguity, temporal/place conflicts, grammar-word bias, broad refusals and stale-context binding. |
| Browser suite | **36/36 passed in 2.5 minutes**, then **7/7 context/settings checks passed** after the final clinical-label guard and catalog-fallback validation adjustment. Includes a reviewed home coffee routine expanding “want usual drink”; the exact chosen sentence alone speaks. Provider responses and audible speech are simulated. |
| Lint and types | Entire repository ESLint and web/server/shared TypeScript passed. |
| Controlled fixtures | **240/240** authored catalog executions passed. [Report](../../../evals/intent/report.md). This is not an LLM accuracy score. |
| Production web | Vite succeeded, main entry **671.13 kB / 200.26 kB gzip**. Settings loaded separately: **57.32 kB / 17.35 kB gzip**. PWA generated **66 entries / 2706.70 KiB**. The entry alone is slightly above the original 200 kB initial-JS target; that performance acceptance is not claimed. Existing TensorFlow chunk warning remains; phone performance is unmeasured. |
| Production API | tsup succeeded, **194.50 kB** ESM bundle. |
| Compiled offline smoke | Re-ran [PWA smoke](../v2/pwa-smoke.mjs) against this release on temporary loopback port 8792. Home reloaded offline, API fetch failed as expected, previously unvisited Tamil vocabulary loaded, “no water” remained a refusal and did not return after rejection. Temporary server stopped. |
| Visual and keyboard | [Structured results](context-visual-checks.json): 390×844 and 1440×1000. No overflow, unlabelled controls, console/page errors, unexpected inference or audio. ArrowLeft/Right, Home and End navigation passed after awaiting each rendered tab state. [Reproduction script](context-visual.mjs). |
| Independent review | Found/fixed grammar words biasing ranking and routine time/place conflicting with explicit patient words. Generic broad refusals cannot narrow to a different object. A mistaken Food/Drink category cannot make a clinical/unknown label valid evidence: known clinical cues block expansion, food/drink anchors must be recognized, and mixed unknown label words cannot be quoted. Frontend privacy-filtered validation and request invalidation reviewed. |

No live model sentence quality, translation quality, real audio latency, phone installation, clinical benefit or patient acceptance is established. New authored Tamil copy/cues are in the [pending language inventory](../../LANGUAGE_REVIEW.md). The LLM still returns suggestions for patient review; the context ranker is not calibrated confidence or proof of intended meaning.

Screenshots: [mobile controls](context-controls-mobile.png), [mobile preview](context-preview-mobile.png), [mobile routine editor](context-routine-mobile.png), [desktop controls](context-controls-desktop.png), [desktop preview](context-preview-desktop.png), [desktop routine editor](context-routine-desktop.png).
