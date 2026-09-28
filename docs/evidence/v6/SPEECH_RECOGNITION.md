# Local and browser-online speech choice

Implemented 2026-09-28 after the user requested a Google/local recognition toggle.

- Caregiver Settings → General → Speech recognition, also shown in Privacy, offers two accessible radio choices. The selection saves immediately on this browser.
- Local is the default. Online input requires both an explicit selection and the existing local-only privacy master to be off. The chooser never turns the master off itself. Restoring protection resets input to local.
- The same effective setting reaches Speak, partner-question dictation and rehabilitation live transcription. Local sets `processLocally=true`; browser mode explicitly sets false where available. Unsupported local recognition never falls back online.
- A versioned localStorage mode token contains no health data and is not a personal-backup permission. Missing/malformed/unreadable values fail local. Device erase resets the preference; unrelated settings saves do not overwrite it.
- Changing the setting stops active input in same-origin tabs. Synchronous reads enforce new permission before a recognizer starts; queued revocation events also stop earlier recognition. Switching never restarts a microphone.
- The online choice is labelled **Google / browser online** because the Web Speech API cannot select or attest the vendor in every browser. It allows the browser's chosen processing service without an app API key. Audio-sharing disclosure appears before selection. See [provider sources and limitations](../../PROVIDERS.md).

## Verification

- **38 focused unit tests / 4 files:** recognition preference, privacy policy, practice capture/recognition and post-registration intent privacy checks passed.
- **9 distinct targeted browser checks across runs:** four existing privacy checks; three new recognition-choice/persistence/master-reset/cross-tab cases; patient simulated speech-to-confirmation; manual practice/review regression. The initial cross-tab fixture opened Speak before a fresh practice page, causing the expected recoverable-draft screen. Opening practice first corrected the fixture; the recheck passed. No production recovery behavior changed.
- Repository ESLint, web TypeScript and `git diff --check` passed.
- Web/PWA build passed: main 680.84 kB / 203.66 kB gzip; Settings 74.81 kB / 22.86 kB gzip; 72 precache entries / 2840.01 KiB. Existing size/TensorFlow warnings remain.
- [Visual script](speech-recognition-visual.mjs) and [results](speech-recognition-visual.json) checked local/online choices at 390×844 and 1440×1000: no serious/critical Axe violations, horizontal page overflow, console/page errors, external requests or microphone starts. Screenshots were visually inspected; native radio styles were corrected to preserve the intended compact layout.

Tests use fictional settings and simulated recognition. They verify mode routing/cancellation, not actual Google connectivity, on-device language-pack availability, Tamil transcription quality or physical microphone performance. No paid API, real microphone, model download, patient content or report sending was used. Server cloud-AI policy remains unchanged.
