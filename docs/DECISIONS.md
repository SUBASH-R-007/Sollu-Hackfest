# Decisions

Date: 2026-09-27. [SPEC.md](SPEC.md) remains unchanged. This document records the brief's deliberate differences and the user's approved changes.

## 28 September: contextual generation and caregiver customization

The user authorized an OpenAI-backed contextual sentence engine, other API choices in Settings, and expanded caregiver personalization. This supersedes the earlier catalog-selector-only decision for optional models. OpenAI Responses, Anthropic Messages, Gemini generateContent, Groq Chat Completions and local Ollama now share a structured sentence contract; the no-key catalog is still the initial default. No paid key was provided and no live cloud inference was performed.

Each cloud device must opt into text sharing, even when an environment key exists. Runtime keys are device-scoped, memory-only, never echoed, and expire on restart or 12 hours of inactivity. Endpoints are fixed/allowlisted; local Ollama remains loopback-only. Key removal is independent of cloud permission and does not activate a provider. Settings are a local caregiver-PIN surface, while server access uses the existing device capability; this is not a multi-user clinical authorization system.

The engine frames new sentences with exact source evidence. Deterministic checks constrain explicit negation, side, quantities, source words, excluded meanings and schema; model-authored translation anchors permit new Tamil wording beyond the catalog. Those anchors and the sentence's semantics are not independently proven. Patient review remains necessary and generated suggestions are visibly drafts. No model speaks automatically, no provider failover uploads to another vendor, and generated drafts are excluded from rehearsal reuse. Existing exact phrases remain verbatim.

Personalization controls style, word limit, Home input order and reduced motion. Context transfer is an explicit allowlist, with personal context and confirmed recent turns independently off by default. Provider/setting changes cancel stale suggestions; provider changes also clear rehearsal suggestions. Rehearsal keys include wording preferences and relevant context. These changes do not erase personal words, recordings or history. Demo cache warm-up runs entirely on the local catalog and never invokes a provider.

## The ten deliberate differences from SPEC §0.2

1. **A thin server exists.** API keys cannot ship inside a PWA (§3.1).
2. **Speech-to-text.** The deck's Whisper (small) is weak on Tamil and one-word, code-mixed clips. Sarvam's Indic models are the default candidate, with OpenAI Whisper/GPT-4o transcription and ElevenLabs Scribe as measured alternatives. The team's recordings decide (§15.3); these comparative claims still need that evaluation.
3. **Voice.** Coqui XTTS-v2 is excluded by the brief: Tamil/Telugu coverage and its model licence do not fit the requirement. ElevenLabs instant cloning plus Sarvam cloning are the planned cloud routes; Telugu needs a compatible route such as Eleven v3. Current provider facts and limits are in [PROVIDERS.md](PROVIDERS.md).
4. **Vision.** COCO-SSD cannot recognise tablets, pill strips or spectacles. Family-taught on-device objects belong to M8, with an opt-in cloud fallback. YOLO-nano is not used.
5. **The person's exact-sentence tap is the speaker gate.** Confirmation cards, quick-strip, phrasebook and Help are all instances of this gate.
6. **More than fragment/context can leave the device.** Cloud STT clips, TTS sentence text (including unchosen prefetched text), clone samples and encrypted caregiver messages are also transfers. Explain the actual active modes in privacy copy.
7. **Existing aids are not described as English-only.** The product differentiates through intent completion, context, voice and measured speed; no claim of superiority is made without comparative evidence.
8. **Four content targets by default.** Quick strip and navigation are secondary controls. Pain is a guided flow: body part, side where applicable, then sentences.
9. **Two taps is a speech-path target.** Topics can take 3–5 taps; the overlay displays measured taps, including extra Listen, retry or fresh-playback taps.
10. **Learning is explicit.** Learned phrasing, substitutions, routine items and vocabulary suggestions belong to §11/M7; scaffolding or fixture output does not count as learned behaviour.

## Approved local build changes

| Decision | Reason and consequence |
| --- | --- |
| No hosting now | User explicitly deferred hosting. Build and verify locally; Android HTTPS install and two-phone acceptance remain pending. |
| No paid keys required | Use deterministic mocks and a free path: optional local Ollama, browser recognition, device speech, exact-phrase recordings. Never silently represent a mock or recording as a cloud LLM/clone. |
| Optional local model only | Keep model name configurable; the user controls installation/download size. No cloud model or free quota is assumed. Ollama quality/latency must be measured on the installed model. |
| Recorded phrases are exact replay | Bind recording to language + exact normalised text. Obtain consent. Unmatched phrases fall back visibly to device speech or text. This does not satisfy the original arbitrary cloned-voice acceptance. |
| Playback freshness is checked at output | SPEC §10.2 checks the tap at request time, while §15.1 checks actual playback. User approved the stricter §15.1 interpretation: late preparation needs a fresh exact-sentence tap; Stop and newer taps invalidate prior work. |
| I-5 permits only the specified Listen exception | Unpicked candidates never play as the person. SPEC §9 explicitly permits neutral preview after a separate patient Listen tap through the preview channel. No preview on render, prefetch, or remote message. |
| Caregiver entry and PIN | The top-right gear uses a 2-second pointer hold, followed by PIN; keyboard access and direct family routes open the PIN gate without the hold. Patient controls remain gesture-free. The local lock reduces accidental edits; it is not strong protection against someone controlling the same browser profile. The universal hold requirement from the brief is not fully implemented. |
| Role-bound relay grants | A query-string role is not proof of role. Patient and caregiver grants must constrain role at verification. Never log WebSocket grants, URLs with queries, plaintext messages, or encryption keys. |
| Provider success is not presumed | No paid API call has been verified without keys. Provider retention cannot be described as zero merely because Sollu itself is stateless or deletes generation history. |
| Dependencies are pinned by the lockfile | Use the actual manifests/lockfile as the version record; do not claim every requested library is installed. Deferred libraries follow their milestone. |
| Small MVP state and translations | React context holds the app state; the shared catalog holds Tamil/English phrases, alongside inline MVP UI copy. Zustand, i18next and complete UI localisation are deferred. The language switch changes sentence output; much of the navigation remains English with dual Tamil labels on primary inputs. Shared contracts and the language inventory are retained. |

## Provider deviations discovered during documentation review

- Sarvam's current overview and cloning pages disagree on whether coverage is 12 or 13 languages. Check the endpoint's specific language table and live account before enabling a route; Tamil, English, Hindi and Telugu must each be checked. No generic count is treated as a contract.
- Sarvam documentation exposes both inline-reference cloning and saved voice IDs. Do not copy the brief's simplified JSON request shape without matching the selected endpoint.
- ElevenLabs currently lists Starter at US$6 monthly before taxes with Instant Voice Cloning. Its free tier is not an own-voice cloning substitute. History deletion is not equivalent to an enterprise zero-retention arrangement.
- Browser speech synthesis may use a remote voice (`localService: false`). Only downloaded/local voices or cached recordings support a reliable offline claim.

## Approved improvements — 28 September 2026

The user's “go” approved phases 1–5 of [APHASIA_IMPROVEMENT_PLAN.md](APHASIA_IMPROVEMENT_PLAN.md), including vocabulary expansion. These decisions supersede the initial MVP limits where explicitly implemented:

- Shared catalog/policy controls all generated, offline, cache and memory suggestions. Local Ollama selects allowed meaning IDs; unsupported input can produce zero choices. No mandatory three-card padding.
- Tamil patient controls and 124 bilingual message meanings; personal words support aliases, descriptions, pin/hide/edit/delete. All Tamil wording remains pending native review. The builder deliberately covers six everyday objects with request/refusal; it is not a general Tamil grammar engine.
- Patient approval is required for personal cards and word mappings. Imported mappings return to unapproved state; memory approval cannot move across listener/place/time scopes. No model-written reading automatically creates a substitution.
- Optional access preferences, stable support controls, pause/resume, repair and partner-understanding recording. Speaking, receipt and verified shared meaning are separate observations.
- Personal photos use authored hotspots and equivalent list choices. They do not claim learned object recognition. Drawing is a communication surface without AI interpretation.
- Encrypted local backup and a bounded, expiring ciphertext outbox are implemented. They are not remote storage, background push, or an emergency service. Pairing credentials/PIN are excluded from backup.
- Baseline can use Tamil or English. Its token concatenation is not grammar-matched or clinically validated; meaningful comparison requires a personalized same-language board and counterbalanced tasks in the human protocol.
- The installed-model benchmark verifies honest fallback, not model quality. Human/SLP/native-language acceptance and supervised therapy remain separate.

## Remaining acceptance

Real cloud generation, paid cloning, actual provider deletion, native-speaker sign-off, phone accessibility, real STT recordings and phone performance remain separate checks. All full M7–M11 work and any unimplemented M0–M6 item remain visible in [../PROGRESS.md](../PROGRESS.md).
