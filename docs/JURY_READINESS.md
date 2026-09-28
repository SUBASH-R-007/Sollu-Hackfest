# Jury guidance review and demo claims

Reviewed 2026-09-28 against the user's attached guidance beginning “One-word answer: Potentially.” This records implemented engineering changes and remaining limits. It is not a compliance certificate or a clinical assessment. Use fictional examples for demonstrations.

## What changed after the review

| Concern | Implementation |
| --- | --- |
| Reports could look like clinical conclusions when exported | The Communication Progress Report carries fixed interpretation metadata in JSON, encrypted JSON and CSV. Purpose, scoring, timing, sample comparability and unauthenticated reviewer limits also appear in the dashboard and print view. Older version-1 imports receive the same limits; imported claims of validated endpoints are rejected. |
| A model could turn health fragments into invented medical advice | Recognized health/help words in the current input, explicit topic/object or reviewed correction use prepared catalog wording or clarification. The browser bypasses intent requests and rehearsal caches; the server independently bypasses all generators, including local Ollama. Old model drafts are rejected for this route. No severity, diagnosis, dosage or emergency decision is generated. |
| More context than necessary could be sent | Optional personal sharing sends relevant contacts and vocabulary rather than the entire bounded contact/vocabulary lists. Current words/questions and explicitly selected listener drive filtering; local catalog interpretation keeps its device context. This does not anonymize the input. |
| Privacy controls need plain explanations | Settings states actual retention, database encryption limits, exported-copy deletion limits, the PIN's interface-only role and the distinction between no training and no retention. Home reflects the selected recognition/privacy mode. Online recognition has its own explicit selection. |
| Sentence choice does not establish comprehension or consent | General settings explains supported selection, familiar alternatives and individual access needs. Two-step confirmation is optional and its scope is stated. Suggested sentences say “choose, then Say” when enabled; My phrases, quick phrases and deliberate previews retain one-tap behavior. The app cannot attest who tapped. |
| A missing duration could distort a report | Communication statistics exclude missing timing rather than filling it with zero and identify the measured sample. Timing is attempt start through the audio-start notification, not completed communication or a validated response-time assessment. |

The health/help boundary is a **bounded phrase-routing rule**, not an emergency detector. Unknown spellings, languages or unrecognized expressions can miss it. An absence of a match says nothing about health, urgency or safety. Help remains available through deliberate user action. A confirmed phrase may be shared with an explicitly paired caregiver; a receipt does not prove assistance will arrive.

## Intended users and confirmation

Preserve support for aphasia, dysarthria, ALS, Parkinson's and laryngectomy-related communication needs. Do not diagnose a subtype or exclude a person solely because of a condition label. Sentence selection requires a reliable way to recognize/reject that particular proposed meaning, with support where appropriate; that is not a prerequisite for access to all AAC. Offer familiar phrases, topics, visual cues, partner support and individually suitable access methods. Clinician assessment remains separate. This follows ASHA's individualized, zero-exclusion approach to AAC. [ASHA AAC Practice Portal](https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/)

The older Broca/anomic-only wording in the preserved master specification is historical. The later user instruction broadened the scope. No automated comprehension or decision-making-capacity test is implemented.

## Answers that the implemented product can support

**What does the app do?** It offers possible sentences for the person to choose, supports communication practice, and summarizes observed use for discussion with a therapist. The engine does not know the person's intent; they can reject, clarify or use another communication method.

**Does the report measure rehabilitation or pronunciation?** It shows reviewed transcript-to-target matches, transcript differences, practice activity, reported understanding and measured effort/timing. These are prototype product metrics, not validated clinical endpoints, severity grades or proof of recovery. Changes in task, language, support and communication method affect comparisons. Playback is not evidence of understanding.

**Are recordings training an acoustic model?** No. Reviewed phrase corrections and examples personalize communication choices. Clips support consented local review; no acoustic fine-tuning or validated treatment dose is implemented. Transcript matching is not pronunciation scoring.

**Is OpenAI necessary?** No. Free vocabulary is available with no key, and a separately installed loopback Ollama model is optional. Cloud sentence providers are blocked by default on the server. A future cloud deployment needs operator permission, device permission and provider-sharing permission plus its own institutional review. Browser recognition is a separate service and optional; its vendor cannot be guaranteed from the app.

**Does local processing mean HIPAA compliance?** No. HIPAA applicability depends on the deployment and parties involved. Where ePHI is processed for a covered entity, a cloud processor can be a business associate even if unable to decrypt it. Appropriate agreements, risk analysis and administrative, physical and technical safeguards remain relevant. A provider swap or no-training promise is not sufficient. [HHS cloud guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html)

**Is the app exempt from medical-device regulation because it helps communication?** That cannot be concluded. India's definition includes relevant software intended to assist with disability. Intended use, claims and deployment need qualified assessment; no class, exemption, licence or CDSCO approval is claimed. “Prototype” and narrower report wording do not resolve classification. [CDSCO medical-device definition and software guidance](https://www.cdsco.gov.in/opencms/opencms/en/Medical-Device-Diagnostics/Medical-Device-Diagnostics/)

**Is DPDP fully in force?** Do not make that blanket statement as of this review date. Act commencement and the final rules have separate phased provisions. The Act notification groups commencement at publication, one year and eighteen months; assess the provisions and deployment actually applicable. Build privacy controls now and obtain qualified review before patient use. [MeitY Act commencement notification, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf), [final rules, G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)

**Is all data encrypted and automatically deleted?** No. Encrypted report files use authenticated encryption; the active browser database and separately downloaded recordings are not encrypted by Sollu. Saved history does not automatically expire. Device/browser protection, actual account authorization, clinic retention policy, auditable access, authenticated therapist identity and operational breach response remain deployment work. Local deletion does not erase exported or recipient copies. Context filtering, participant codes and consent do not establish de-identification.

## Evidence and remaining acceptance

Use [the verification record](evidence/v7/VERIFICATION.md) for actual automated results. Demonstrate [the current local walkthrough](DEMO_SCRIPT.md); never relabel synthetic browser audio as a physical microphone or clinical result. Native-speaker review, representative participant usability testing, physical device/audio trials, qualified security/regulatory review and clinical validation remain separate acceptance requirements. No real patient recordings, cloud keys or identifiable reports belong in Git.
