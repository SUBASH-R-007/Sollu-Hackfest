# Local rehearsal script

Updated 2026-09-28. Hosting remains deferred. Use fictional profiles and disposable test records. The local browser demonstration is not physical-device acceptance or clinical validation. Read [jury claims and limits](JURY_READINESS.md) before presenting.

## Preparation

1. Start the existing local web/API app; open Home at `http://localhost:5173/`. Use the caregiver gate in Settings to create/unlock the local PIN. Describe it as an interface lock.
2. In Privacy, verify local-only protection is on and cloud sentence providers are blocked by server policy. In Speech recognition, select Local. Free vocabulary needs no key. Optional loopback Ollama needs a separately installed model and a reviewed daemon configuration; do not imply a live model was tested if it was not.
3. Use only fictional names and selected demonstration routines. A simulated clock must keep its demo badge; real routine learning requires observed dates and caregiver review. Enable stage measurement only for the intended demonstration and keep demo observations separate from real usage metrics.
4. Check the actual voice: supported local device voice or a consented exact recording. No generative voice clone is implemented. Missing local recognition or Tamil voices must remain visible; prepare Type/Topics/manual review as fallbacks.
5. If showing the paired caregiver, use a separate browser context, enable alerts there and keep both pages open. Use fictional contact details. Receipt and “I'm coming” are different states, neither a guarantee of assistance.
6. Rehearsal warm-up stores available authored vocabulary silently. Health/help inputs now bypass rehearsal caches and intent API calls. Camera model downloads are blocked in local-only mode; use a clearly labelled manual object selection or Topics unless a separately reviewed model is already available.
7. Eventual phone testing needs secure-context APIs (normally HTTPS), actual microphone/camera permission and offline voice checks. Two local tabs do not satisfy the pending two-phone rehearsal.

## Six-minute walkthrough

| Time | Action | Explain / inspect |
| --- | --- | --- |
| 0:00–0:40 | Home, recognition/privacy settings and supported selection | The person chooses meaning. Local recognition and cloud sentence generation have separate controls. Show familiar alternatives and optional two-step confirmation. |
| 0:40–1:30 | Type `w-w-water` | Show the original fragment, proposed repair and exact sentence. Nothing speaks until a deliberate tap. Listen is a separate preview. Do not describe a typed fixture as an actual transcription. |
| 1:30–2:10 | Type an ambiguous fragment such as `water ven`, then clarify | An empty result asks for another word/topic. None of these never authorizes an invented meaning. Personal corrections require explicit review and remain scoped. |
| 2:10–2:50 | Type `chest pain`, then separately `chest pain yesterday` | The first uses existing prepared help wording. The second asks for clarification rather than discarding history. No LLM call, diagnosis, dosage or automatic alarm is generated. The phrase-routing rule is bounded, not an emergency detector. |
| 2:50–3:50 | Communication practice: choose a familiar target and review a fictional/consented attempt | Capture requires consent and a user action. Review the transcript; show target-word matches and differences, readiness time, effort and fatigue. Text match is not pronunciation or recovery. Recordings do not fine-tune an acoustic model. |
| 3:50–4:50 | Therapist dashboard → Communication Progress Report | Show weekly samples, missing data, language/method groups, reviewed word differences and reported understanding. Missing duration is absent, not zero. Clinician/reviewer identity is unverified. Avoid treatment-benefit claims. |
| 4:50–5:30 | Encrypted report export/preview | Scope limits travel with the report. Use a fictional report and separate passphrase handling. Clips are separate consented unencrypted downloads. Nothing is automatically sent to a therapist. |
| 5:30–6:00 | Optional exact Help phrase and paired caregiver acknowledgement | Only the deliberate confirmed message speaks/shares. Inspect actual delivery and acknowledgement states; cancel a mistaken Help. State that local storage remains unencrypted and there is no automatic history expiry. |

For a baseline comparison, repeat the same fictional communication task using `/baseline` with the same measurement boundaries. Report actual taps and attempt-to-audio-start time; do not turn a one-person rehearsal into a clinical improvement percentage. Show only the distinct supported candidates available, up to three; do not force three for every fragment.

## Failure plan

| Failure | Visible recovery |
| --- | --- |
| Local recognizer unavailable / transcript wrong | Type, Topics or manual transcript review. Do not silently switch online. |
| Local model unavailable / provider timeout | Authored vocabulary or clarification, visibly labelled. No live-model quality claim. |
| Audio is ready after the tap expires | A fresh tap on the exact sentence; include it in measured taps. |
| Tamil voice absent | Keep Tamil text visible or use an exact approved recording. Do not silently translate the selected message. |
| Camera permission/model blocked | Use Topics or clearly labelled manual object input. Do not say the detector recognized it. |
| Caregiver disconnected | Inspect queued/not-sent/expired state and explicit messaging options. Help expires after 60 seconds, ordinary messages after five minutes; no background push promise. |
| Offline | Previously cached app routes and local catalog/recordings may work. Recognition and voices still depend on device support. Prepared health/help wording remains local; ordinary rehearsal results show CACHED when actually replayed. |

Pending human acceptance: two consecutive physical-phone rehearsals and one offline rehearsal, with device, language, provider/voice mode, actual timings, faults and participant feedback recorded. Tamil content review, representative accessibility review, security/privacy assessment and clinical/regulatory review remain separate. See [PROGRESS](../PROGRESS.md) and the [v7 automated record](evidence/v7/VERIFICATION.md).
