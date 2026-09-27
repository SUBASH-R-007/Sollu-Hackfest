# Privacy and consent implementation notes

Updated 2026-09-27. This is an engineering data-flow record and a pilot review checklist, not a statement of legal compliance. No clinic pilot, legal review or provider retention audit has been completed. Current implementation and acceptance evidence are in [../PROGRESS.md](../PROGRESS.md); provider facts are in [PROVIDERS.md](PROVIDERS.md).

## Plain-language notice

Sollu helps a person choose words to communicate. The person decides which sentence is spoken. It is not a diagnosis, treatment tool or emergency service.

Your profile, people, routine, phrases, consent records, recorded phrases and communication history are intended to stay in this browser's storage. Clearing site data can remove them. Anyone who can use the unlocked browser may be able to read this information. The caregiver PIN prevents accidental changes; it is not disk encryption or a separate user account.

The statement “only the fragment and context packet leave the device” is incomplete. What leaves depends on the selected mode:

| Action | Destination and purpose | Local/default mode |
| --- | --- | --- |
| Ask for candidate sentences | Sollu server; selected LLM receives bounded fragment/context if enabled | Mock mode uses fixtures. Local Ollama sends the request from the server to the configured Ollama endpoint; loopback keeps it on that computer, not necessarily on the patient's phone. |
| Browser speech recognition | Browser/vendor recognition service may receive microphone audio | Not guaranteed private or offline. Disclose this before enabling it; Topics and Type need no recognition service. |
| Cloud transcription | Sollu server and selected STT provider receive a short clip | Disabled without the relevant provider configuration. Do not persist raw input audio. |
| Device/browser speech | Operating-system or browser speech service receives the selected text | A voice may be local or remote. A generic device voice is not the person's clone. |
| Recorded phrase playback | No provider; exact phrase recording is read from local storage | A consented recording can be replayed only for its associated text. Deleting it removes the local replay asset. |
| Cloud TTS / prefetch | TTS provider receives sentence text, including unchosen prefetched candidates | Off without configured cloud speech. Provider history deletion, if implemented, must have confirmed success before the UI claims it. |
| Clone or isolate a voice | Voice provider receives samples and consent summary | Requires a supported account and recorded consent. Saved clone remains at the provider until deletion succeeds. |
| Extract audio from a video | Sollu server temporarily receives upload | Future extraction must bound MIME/size/time and remove temporary files on success, error and disconnect. |
| Local object detection | Image stays in browser; model asset host receives ordinary download metadata | COCO-SSD inference runs locally after model download. Optional cloud-image recognition must be off by default and require a separate explicit action. |
| Pair caregiver / send sentence or Help | Relay sees connection metadata and opaque encrypted frames | The room key stays in the URL fragment and the devices. The server must not log grants, keys, sentence content or full connection URLs. Caregiver plaintext exists on the receiving device. |
| Send SMS | Opens the device's messaging application with destination/message | The person still chooses Send. Carrier charges and SMS delivery are outside Sollu; do not claim an alert was received. |
| Export CSV | A readable file is saved for the user's chosen handling | CSV is not encrypted. Study/pseudonym options reduce exposure but do not make free text anonymous. |
| Web Push | Browser push infrastructure receives encrypted alerts | M11, pending. Current caregiver view must stay open for relay alerts. |

No hosting was requested for this build. A future host and its request logging, backups and retention must be reviewed before claiming that the deployment stores no content. Likewise a configured external Ollama host changes the data destination and needs a revised notice.

## Minimisation requirements

- Send a manual place label, never coordinates. Bound context contacts, vocabulary, recent turns and examples as specified in SPEC §6.
- Keep raw speech clips transient. Keep own-phrase recordings only with consent; never commit recordings, exports, account keys, tokens or real personal data to git.
- Server logs may contain only operational metadata: route template, status, latency, provider/model, usage and validation-drop counts. Errors must not echo request bodies, text or credentials.
- Local attempt retention defaults to the specification's 180-day target. Check the actual cleanup implementation before telling users it happens automatically.
- Use separate app-use, voice, sample-retention, cloud-vision and study choices. Withdrawal must be easy to locate. A failed provider deletion must remain visibly pending and retryable; never hide it by removing the only local grant first.
- Revoke consent locally before further synthesis and remove local samples/cache as selected. Existing exported files and another caregiver's browser are separate copies; do not promise that a local erase removes them.
- Encrypted backups and role/device grants need round-trip, tamper and wrong-device tests. A stateless server does not automatically supply global token revocation.

## Before a supervised pilot

The clinic/operator must review the then-current Indian DPDP legal requirements with qualified advice, including commencement dates, lawful-guardian verification, itemised notice, purpose-specific consent, withdrawal/erasure, grievance contact and breach response. The brief's legal dates are preserved in SPEC §13; they have not been adopted here as a verified legal conclusion.

Obtain native-speaker review of aphasia-friendly consent, record how the person expressed a choice and who supported it, and do not equate aphasia with inability to decide. Identify the clinic's actual grievance contact; a placeholder is not pilot readiness. Review the providers' retention/training account settings, deletion behaviour and subprocessors before sending personal recordings.

Use emoji and appropriately licensed fonts/assets. If ARASAAC or another symbol set is introduced, verify its current licence and whether the intended use is permitted. No clinical performance or regulatory claim should appear in the demo or README without appropriate evidence.
