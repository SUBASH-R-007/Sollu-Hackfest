# Speech recognition evaluation — pending

Updated 2026-09-27. **No consented audio clips were supplied or recorded for this build.** No character error rate (CER), word error rate, recognition latency or provider comparison has been measured. The ten rows below are a capture template, not evaluation results. No provider has been selected on measured accuracy.

## Current build

Speak uses the available browser `SpeechRecognition` API, with `ta-IN` or `en-IN`, continuous recognition and interim results. It advances after three seconds without a new nonempty result, or an explicit Done tap. Browser/vendor services may receive microphone audio; Tamil support and offline operation are not guaranteed. Type and Topics remain available. See [provider limitations](../../docs/PROVIDERS.md) and [privacy](../../docs/PRIVACY.md).

The labelled sample transcript and mock `/api/stt` endpoint are deterministic fixtures. Browser E2E tests simulate recognition events; they verify the interaction, not transcription quality or sound. Sarvam, OpenAI transcription and ElevenLabs Scribe adapters are not connected. Adding an API key does not make them available.

## Ten-clip capture protocol

1. Obtain the speaker's informed agreement to this specific comparison and to any audio retention or vendor transfer. Use pseudonymous clip IDs. Keep consent records and any retained audio outside git in a team-controlled private location; never commit recordings or identifiable transcripts. Do not use another person's recordings without permission.
2. Capture ten short team-member fragments: a mix of Tamil, English and Tanglish, one-word and short-phrase inputs, quiet and ordinary background noise, and comfortable natural or deliberately slow delivery. Note the condition per clip. Team speech does not establish accuracy for aphasic speech; human clinical evaluation remains separate.
3. Have the speaker confirm a verbatim reference transcript. Record exact browser/version, device/OS, language hint, microphone, network condition and date. Browser recognition accepts live microphone input in this build; if comparing saved clips by loudspeaker replay, document that replay method and keep it constant. Do not label replay as a direct file-upload benchmark.
4. Record the returned final transcript without correcting it. Mark permission denial, unsupported language, timeout and empty result as explicit failures. Keep unsuccessful clips in the report; do not calculate accuracy only from successful recognitions.
5. Fix normalisation before scoring: Unicode NFC, consistent Latin case, collapse whitespace and remove the same punctuation from both strings. Preserve lexical differences, script and code-switching. Count Unicode code points consistently; report this unit because it differs from Tamil grapheme counting. CER = `(substitutions + deletions + insertions) / reference length`. Record raw counts and corpus CER from summed counts, not only an average of percentages. An empty reference is invalid; a missing recognition is an empty hypothesis plus its failure status.
6. Measure recognition latency from the end of audible input to the final transcript event. Separately report time from input end to candidate display, which includes the app's silence wait and intent generation. Do not present that combined duration, a fixture timer or cached generation time as STT latency. If these timestamps cannot be observed reliably, leave latency unmeasured.
7. Review transcripts with the speaker, calculate per-clip and corpus CER, and report median/p95 latency with sample count and failures. Ten clips support a preliminary comparison only. A future provider comparison must use the same clips and scoring rules, then record the chosen provider and its tradeoffs.

## Capture template

Fill the metadata and results privately where consent requires it. A repository report should contain only approved aggregate results and non-identifying examples.

Run metadata: date —; reviewer —; browser/OS/device —; provider/model or browser service —; language hints —; network —; input/replay method —; normalisation version —.

| Clip ID | Language / condition | Consent verified | Reference / result location | Ref. units | S / D / I | CER | STT latency ms | Failure / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stt01 | pending | pending | — | — | — | — | — | not captured |
| stt02 | pending | pending | — | — | — | — | — | not captured |
| stt03 | pending | pending | — | — | — | — | — | not captured |
| stt04 | pending | pending | — | — | — | — | — | not captured |
| stt05 | pending | pending | — | — | — | — | — | not captured |
| stt06 | pending | pending | — | — | — | — | — | not captured |
| stt07 | pending | pending | — | — | — | — | — | not captured |
| stt08 | pending | pending | — | — | — | — | — | not captured |
| stt09 | pending | pending | — | — | — | — | — | not captured |
| stt10 | pending | pending | — | — | — | — | — | not captured |

Aggregate: evaluated clips **0**; corpus CER **not measured**; latency median/p95 **not measured**; provider decision **pending**. The full specification's ≥20 clips per language, alternate-provider comparison and native-speaker review remain pending. See [SPEC §15.3](../../docs/SPEC.md) and [progress](../../PROGRESS.md).
