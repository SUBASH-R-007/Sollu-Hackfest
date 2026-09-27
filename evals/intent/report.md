# Intent mock fixture regression

Generated: 2026-09-27T18:03:04.253Z

Mode: **MOCK — deterministic fixtures; no AI quality evidence**. Model: `mock-deterministic-v1`.

The 13 hackathon cases from Appendix G ran. e11 (Hindi) belongs to M10 and is excluded. These are synthetic cases, with no patient data.

| Check | Result |
|---|---|
| Candidate schema validity | 100.0% |
| Three different intent labels | 100.0% |
| Top-1 acceptable-intent heuristic | 92.3% |
| Top-3 acceptable-intent heuristic | 100.0% |
| Explicit forbidden-pattern violations | 0 |
| Reading format | 100.0% |
| Tamil formal-marker cases | 0 |
| Fixture execution p50 / p95 | 1.7 / 303.6 ms |

| Case | Scenario | Cards | Top-1 | Top-3 | Format / distinct / guards |
|---|---|---:|---|---|---|
| e01 | Tamil night tablets | 3 | pass | pass | pass |
| e02 | Table reinterpreted from night routine | 3 | pass | pass | pass |
| e03 | Water | 3 | pass | pass | pass |
| e04 | Head pain intensity | 3 | miss | pass | pass |
| e05 | Answer coffee question with sugar preference | 3 | pass | pass | pass |
| e06 | Personal spectacles object label | 3 | pass | pass | pass |
| e07 | Typed Meena phone fragment | 3 | pass | pass | pass |
| e08 | Karthik family contact | 3 | pass | pass | pass |
| e09 | Fan controls | 3 | pass | pass | pass |
| e10 | Chest help | 3 | pass | pass | pass |
| e12 | Aadhav school | 3 | pass | pass | pass |
| e13 | English night tablets | 3 | pass | pass | pass |
| e14 | Rejected left shoulder pain templates | 3 | pass | pass | pass |

Regression result: **PASS**.

## What this does not establish

No LLM judge was used. Semantic intent distinction, invented names outside the contact list, extra events, colloquial Tamil quality, register, clinical suitability and speech/voice quality require separate review. Mock latency is not real-provider, speech or phone-to-audio latency. Real model quality and all provider performance targets remain unmeasured. Native-speaker and real-device checks remain pending.

Run `pnpm eval` for deterministic regression. After configuring a downloaded local Ollama model and starting the API, run `pnpm eval --live`; this refuses a mock server. No paid API is called.
