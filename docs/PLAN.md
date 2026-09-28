# Approved build plan

2026-09-28 jury-review extension: the user requested local privacy protection, robust fragmented input, word accuracy/coverage metrics and continued rehabilitation support. Current implementation decisions and jurisdiction-specific research are in [PRIVACY_AND_VALIDATION.md](PRIVACY_AND_VALIDATION.md). Cloud providers are blocked by default; encrypted report transfer does not make the active database encrypted or establish clinical/regulatory acceptance.

2026-09-28 addition: the user requested research and implementation of multi-condition communication rehabilitation, recordings, scoring, therapist reporting and learned context. Scope and remaining clinical acceptance are documented in [REHABILITATION.md](REHABILITATION.md); rationale is in [REHABILITATION_RESEARCH.md](REHABILITATION_RESEARCH.md).

Approved by the user on 2026-09-27 after the three planning questions. The user has no paid API keys, requests a free alternative, and explicitly defers hosting. This update overrides the original three-hour deployment target without changing the safety invariants. The complete original brief is [SPEC.md](SPEC.md).

Sollu is a Tamil-first communication PWA for adults who can recognise and choose a sentence. Speech, topics, a photo, or typed fragments lead to up to three distinct candidate sentences. The person chooses the exact sentence before it is spoken. Tamil and English are the first languages. The application includes a caregiver view and a local communication log; it makes no diagnostic or treatment claim.

## Build sequence

| Stage | Implementation | Completion evidence |
| --- | --- | --- |
| M0 foundation | pnpm workspace; strict TypeScript; shared Zod contracts; Fastify; device tokens; mock adapters; IndexedDB; accessible controls; PIN; PWA; living docs | lint, types, unit/E2E checks; provider ledger; local production build |
| M1 core loop | Home, Topics, pain templates, Type, demo family/clock, bounded context, candidate validation/signing, confirmation, audio gate, attempts | applicable invariant tests; modality flows; 13 hackathon fixtures; independent review |
| M3 voice | Free device speech and consented exact-phrase recording/replay; signed provider boundary and paid upgrade hooks | Stop/supersede/expired-tap checks; consent and signature tests; honest voice labels; human listening checks remain pending |
| M2 + early M6 | Browser speech feature detection and provider/mock STT; transcript/retry; partner question; measured overlay; baseline; therapist-lite | speech fixture tests, metrics tests, real STT report only after consented recordings |
| M5 + M4 | Encrypted caregiver pairing/receipts/Help; local bottle recognition and camera labels | two-context relay checks; image privacy test; actual two-phone and bottle checks pending |
| Remaining M6 | Scenarios, labelled rehearsal cache, warm-up, failure script | metric consistency; independent review; two online and one offline human rehearsals |
| M7–M11 | Full context and learning; personal objects; full therapist exports; Hindi/Telugu; audits and pilot acceptance | acceptance checks in SPEC §17–18; keep deferred items explicit |

## No-key path

- Deterministic mock providers are the default development and rehearsal path. Their output and timings are labelled; they do not establish real AI quality.
- Optional Ollama supplies local intent generation with a model the user installs. No model is downloaded automatically. Local CPU/GPU capacity and Tamil quality must be measured before making performance claims.
- Browser speech recognition is a free, feature-detected option. It may send audio to a browser vendor and Tamil recognition may be unavailable. Topics and Type remain usable.
- Device speech uses an available system/browser voice and is labelled accordingly. An available voice may require the network. It is not a clone.
- A consented recording may be replayed only for its exact associated phrase. This supplies genuine recorded own-voice phrases without synthesising new words. Arbitrary cloned Tamil/English speech remains a paid-provider or future self-hosted integration, with human verification pending.

## Decisions and risks

The approved tap rule is conservative: actual playback must begin within 1,500 ms of its trusted exact-sentence tap. If preparation takes longer, cache the result and require a new tap. Count the additional tap. Preview remains an explicit neutral-voice Listen action; see [DECISIONS.md](DECISIONS.md).

Model grounding cannot be established by digit/contact filters alone. Keep adversarial fixtures and human language review. Real Tamil recognition, colloquial wording, voice similarity, accessibility on phones, offline voice availability, and live latency are unverified until measured. Deployment, purchases, provider voice deletion, and shared-remote publishing are outside this local build action.

Every milestone closes only when its applicable acceptance checks and evidence are recorded in [../PROGRESS.md](../PROGRESS.md). Record partial implementation as partial, not complete. No human check can be passed by an automated browser run.
