# Aphasia-support improvements — verification

Date: 28 September 2026. Local Windows workspace; Node 22.17.1; installed Chromium 151; default no-key mock/catalog configuration. Fictional data and simulated browser speech only unless explicitly identified below. No deployment, paid request, model download or patient-data migration was performed.

| Check | Observed result |
| --- | --- |
| ESLint | `node node_modules/eslint/bin/eslint.js .` passed; central audio API boundary retained. |
| TypeScript | Web, server and shared `tsc --noEmit -p …/tsconfig.json` each passed. |
| Unit tests | `node node_modules/vitest/vitest.mjs run`: **358 passed, 15 files**. Covers canonical meaning/language/negation/body side, medication abstention, repair retention, scoped memory, draft restore, recognition alternatives, consent/tap/expiry, backup validation and import trust, relay ciphertext/role/expiry/replay/cancel. |
| Existing + new browser suite | Complete 24-test run passed in 1.7 minutes. Includes 19 prior patient/caregiver flows, four new support flows and actual WebSocket offline/reconnect. Two additional focused checks passed afterward: two-step comfort/Pause→repair and immutable correction-review approval. **26 distinct browser checks passed** across these runs. |
| Controlled challenge evaluation | **240/240** executions; [report](../../../evals/intent/report.md), 120 authored development scenarios × two output languages. This is not held-out evaluation, a clinical accuracy measure, or an LLM quality score. |
| Installed-model benchmark | [24-case report](../../../evals/intent/report-local-selector.md): 20 model-eligible requests hit the eight-second deadline and used labelled catalog fallback; four clarification cases bypassed the model. **Zero model completions**. No claim of model intent accuracy. |
| Production web build | Vite build succeeded. Main entry 642.92 kB / 191.34 kB gzip; Support loaded separately (51.79 kB / 14.81 kB gzip). PWA generated 65 precache entries, 2645.85 KiB. Existing TensorFlow chunks still produce a large-chunk warning; camera is loaded on demand. |
| Production server build | tsup succeeded; ESM server bundle 135.44 kB. |
| Production offline smoke | Fresh isolated loopback server on 8792. Service worker installed and controlled the page; Home reloaded with networking disabled and API fetch failure verified. Previously unvisited `/words` loaded offline and displayed a controlled Tamil phrase. Offline Type preserved “no water”; rejecting it yielded no repeated candidate. [Reproducible smoke script](pwa-smoke.mjs). |
| Visual review | Tamil Home, tools, words and sentence-builder screenshots at 390×844. `documentElement.scrollWidth === innerWidth === 390` for each. Home's four primary inputs fit above the support strip. Home/confirmation target-size and contrast assertions pass; full real-device accessibility review remains pending. |
| Diff hygiene | `git diff --check` passed; only repository CRLF conversion notices. |

The host's fallback pnpm wrapper could not reliably resolve workspace executables in this session, so installed Node entry points ran lint, types, tests and builds directly. No dependency upgrade was performed to work around that wrapper.

## Review fixes included

- Negation cannot become an affirmative request; pain side/body part and gloss use one controlled definition; output language takes precedence over legacy language fields.
- Distinct meanings are checked after memory, offline and cache merges. Unknown names/drugs/doses and weak interpretations can abstain instead of inventing filler.
- Optional local generation selects supported IDs; a failed repair preserves already valid choices within one total deadline. A neutral night-tablet request does not assert that it is time to take medication.
- Approval is explicit and scoped. Speaking creates an unapproved memory suggestion. Scope hashes include captured listener/place/language/time bucket; import resets memory/substitution approval. Editing correction fields after review cannot change the reviewed snapshot.
- Draft restoration validates shape and age, serializes persistence, restores no audio authority and discards old suggestions. Stop/Pause cancels recognition and pending output.
- Personal cards invalidate approval on wording edits. Back from speech restores the selected story/photo/word. Drawing survives Pause in memory. Scene choices have list equivalents.
- Help cancellation resolves the relay's serialized last Help ID, including immediate cancellation while encryption is pending. Queues contain ciphertext only. Duplicate delivery resends a receipt without replaying alarms. Old receipts cannot overwrite a new attempt.
- “Understood” is a separate explicit patient choice. The partner's interpretation and next question use separate fields; optional interpretation is stored locally and omitted from study-mode CSV.

## Evidence boundaries

Browser speech is simulated in E2E and proves control flow, exact text, language routing and timing gates—not audible voice quality or real first-sound latency. The actual browser/network/IndexedDB/WebSocket/PWA mechanics were exercised locally. Phone installation, Tamil recognition/voices, native language accuracy, SLP review and aphasia-user usability remain **pending** in the [human acceptance protocol](../../IMPROVEMENTS_ACCEPTANCE.md). No treatment benefit, diagnosis or recovery score is claimed.

Screenshots: [Home](home-ta-mobile.png), [tools](tools-ta-mobile.png), [word finder](words-ta-mobile.png), [sentence builder](sentence-ta-mobile.png).
