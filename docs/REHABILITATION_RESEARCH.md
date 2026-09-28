# Rehabilitation research and implementation rationale

Research accessed: **2026-09-28**. Scope: adult communication practice and therapist review across aphasia, dysarthria, ALS, Parkinson's disease and total laryngectomy. This document records evidence-informed design recommendations, not a claim that Sollu is a validated treatment or medical device. The implementation and its acceptance evidence are recorded separately in `PROGRESS.md`.

## Evidence and implications

| Source | Relevant finding | Design implication |
| --- | --- | --- |
| [ASHA: Aphasia](https://www.asha.org/practice-portal/clinical-topics/aphasia/) | Aphasia can affect expression, comprehension, reading and writing. Intervention can address restoration and compensation; supported conversation includes partner participation and multiple communication modes. | Offer meaningful scripts, word retrieval supports and partner practice. Reading aloud cannot be the only route through training. Preserve pictures, typing, gesture-supported choices and AAC. |
| [ASHA: Dysarthria in Adults](https://www.asha.org/Practice-Portal/Clinical-Topics/Dysarthria-in-Adults/) | Assessment and intervention are individualized. Functional communication, environmental adjustments and AAC matter alongside speech. Progressive conditions may require maintenance and compensation. | Let the person and clinician select goals and communication methods. Include comfortable short-phrase practice, pacing and communication repair; avoid universal exercises or promised recovery. |
| [ASHA: Augmentative and Alternative Communication](https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/) | AAC may combine several modalities and change with context and access needs. Personally meaningful vocabulary, partners and alternative selection methods are important. Recorded message banking and synthetic voice banking are distinct. | Keep AAC available throughout practice; support functional vocabulary and low-effort access. Label a saved audio message as a recording, not a trained or cloned voice. |
| [ASHA: Communication After Total Laryngectomy](https://www.asha.org/practice-portal/clinical-topics/head-and-neck-cancer/communication-after-total-laryngectomy/) | Communication may use AAC, electrolarynx, esophageal speech or tracheoesophageal speech. Selection depends on the person's circumstances and specialist assessment. | Record the selected communication method. Offer phrase/AAC practice without assuming vocal-fold speech. Do not give prosthesis, stoma, swallowing or postoperative exercises. |
| [NICE NG42: Motor neurone disease, communication recommendations](https://www.nice.org.uk/guidance/NG42/chapter/recommendations) | Speech and communication needs should be assessed promptly by speech and language therapy, including face-to-face and remote communication. | Include everyday communication goals, accessible review and early AAC planning. Changing needs should prompt clinician review, not an automatically prescribed harder drill. |
| [ALS Association: Speech Changes and AAC](https://www.als.org/navigating-als/resources/fyi-suggestions-and-information-about-speech-changes) | Speech can become tiring. Oral strengthening exercises used for other dysarthrias have not been shown to improve ALS speech. The organization recommends timely speech assessment and discussion of message/voice banking. | Use brief optional practice, rest and energy ratings. Do not add muscle strengthening or endurance challenges. Offer personal message recordings and maintained communication as legitimate goals. |
| [NICE NG71: Parkinson's disease in adults](https://www.nice.org.uk/guidance/ng71/chapter/Recommendations) | Parkinson's-specific speech and language therapy is recommended for communication difficulties, with specialist attention to the person's needs. | Provide a Parkinson's profile and therapist-set plan, including late-stage AAC and fatigue support. Generic app practice must not claim equivalence to a specialist therapy protocol. |
| [PD COMM randomized trial, BMJ 2024](https://www.bmj.com/content/386/bmj-2023-078341) | In 388 participants, LSVT LOUD improved reported voice handicap compared with the control groups. Vocal strain was among reported adverse events. | Evidence for a supervised protocol does not validate unsupervised loudness targets in this app, or all disease stages. Avoid “speak louder” competitions, maximum phonation tests or automatic dosage escalation. |
| [Tröger et al., Frontiers in Digital Health, 2024](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2024.1440986/full) | A particular ASR-derived intelligibility measure was evaluated in specified Czech, Colombian Spanish and German datasets and neurological groups. It used a proprietary pipeline and comparisons with clinical measures. | That validation does not transfer to Sollu's recognizer, Tamil/English prompts, home recordings, aphasia or laryngectomy. A transcript comparison can be a practice aid; it cannot be presented as a validated intelligibility score. |
| [Baylor et al., CPIB calibration study, 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC4377222/) | The Communicative Participation Item Bank was developed as a patient-reported participation measure with formal item calibration. Its sampled populations and intended settings matter. | Track personally meaningful participation in addition to speed. Do not invent a clinical scale, reuse a clinical scale's name for different questions, or infer normative scores from app activity. |
| [Baylor et al., CPIB aphasia validation study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6433404/) | Additional work evaluated applicability to people with aphasia; initial motor-speech/voice validation alone did not settle that question. | Treat accessible administration, language and diagnosis as part of validation. A custom check-in must be clearly described as a non-standardized self-report. |

The feature choices below are engineering and product inferences from these sources. They have not themselves been evaluated in a clinical study.

## Condition-aware practice

| Profile | Suitable application support | Boundaries |
| --- | --- | --- |
| Aphasia / language support | Functional scripts, topic and meaning cues, one instruction at a time, word/phrase choice, replay of a model, partner-supported communication. | Do not equate a reading or naming task with overall language ability. Do not force speech where another modality works. |
| Dysarthria / motor speech | Short personally useful phrases, clinician-selected pacing cues, record/replay, listener feedback, intelligibility repair and AAC backup. | Do not diagnose dysarthria type or prescribe physiological exercises from an ASR transcript. |
| ALS / progressive communication needs | Low-effort practice, optional short messages, energy tracking, recorded message bank, familiar partner training and accessible AAC. | Maintaining participation can be success. Do not promise reversal of progression, muscle strengthening or continual improvement. |
| Parkinson's, including later stages | Functional phrases, individualized cues, short sessions, accessible AAC, contextual notes about fatigue or usual communication conditions. | No medication changes, algorithmic disease staging, forced loudness targets or automatic breath/strength exercises. |
| Total laryngectomy | Method-specific labels, phrase practice using the person's chosen sound source or AAC, recording and listener review. | Do not treat absence of ordinary phonation as failed effort. No stoma/prosthesis instructions or generic vocal-fold exercises. |
| Other / prefer not to say | Communication goals and preferred methods without requiring a diagnosis. | Condition selection is self-reported configuration, not a verified diagnosis. |

Across profiles, patients should be able to pause, skip, stop, choose AAC and say that a task is uncomfortable. Short-session defaults are product choices, not a clinical dose. Clinicians should be able to specify a plan without the application inventing a prescription. Completion streaks must not punish rest days or illness.

## What “score” means

Use separate measurements instead of a single health score:

1. **Practice transcript match:** compare an intended practice sentence with an available transcript after explicit consent to transcription. Identify substitutions, omissions and insertions using word alignment. Show the exact inputs and whether the transcript came from a recognizer or human. Missing transcription is “not scored,” never zero ability. A score is affected by recognition errors, language, noise, microphone, wording and reading demands.
2. **Listener understanding:** optionally record a patient, partner or clinician's stated result: understood, partly understood, not understood or not rated. Preserve who supplied the feedback. A synthesized message successfully playing does not prove that a listener understood it.
3. **Participation and comfort:** brief optional reports about whether the person communicated what mattered and how effortful the task felt. Label these as app check-ins, not validated questionnaires.
4. **Interaction efficiency:** record taps/actions and elapsed time using defined boundaries. These describe operating Sollu; they do not diagnose speech severity or cognitive ability.

An intended prompt is not proof of what a person actually said. ASR discrepancies should initially be “words to review.” A person or therapist can confirm a word for a practice list after review. Everyday free speech has no known target, so the app cannot automatically know which words were missed; explicit corrections may be recorded as communication repair events instead.

Raw recognition output, a corrected transcript, the practice target and the final communicated sentence are different records. Keep them distinguishable. Do not silently replace raw output with a corrected target and then report a perfect recognition score.

## Recommended report definitions

| Measure | Definition and interpretation |
| --- | --- |
| Communication success | Explicit “understood” responses divided by explicitly rated completed exchanges. Show the numerator, denominator and unrated count. Keep partial success separate unless the report explicitly defines another rule. |
| Feedback coverage | Rated completed exchanges divided by all eligible completed exchanges. This exposes selection bias in the success rate. |
| Taps/actions per sentence | Count the scoped selection actions for each completed composition. State which controls count; keyboard characters and support actions need separate definitions. Summarize with median and sample size. |
| Seconds per sentence | Wall-clock time between the recorded composition start and explicit final selection, with pause/background policy declared. This includes interface and decision time. It is not speech rate. |
| Practice response latency | Time from presentation of the prompt to an explicit start action. Do not label this speech-onset latency unless verified voice-activity detection actually measures onset. |
| Recording duration | Duration of the captured media. Do not label it speaking duration or words per minute if pauses or silence are included. |
| Reviewed difficult words | Counts of human-confirmed practice targets, with total opportunities where known, language and task type. Do not rank words on unreviewed recognition failures alone. |
| Weekly activity | Practice attempts, completed sessions, active days, optional effort reports and separate AAC activity. A missed day is absence of a log, not deterioration. |
| Change over time | Compare like tasks, language, method and assistance level. Show dates, sample size and missing data. A descriptive difference is not proof that therapy caused a clinical change. |

For small observational datasets, honest counts, medians and ranges are more useful than unsupported significance badges. Success intervals, if added, must specify their method and account for their limitations; repeated attempts from one person are not independent patients. Zero denominators render “not available.” Do not fabricate baseline, confidence, normal ranges or minimally important clinical differences.

## Therapist review and evidence

Recommended workflow: patient creates a recording with explicit microphone/camera controls, reviews it, optionally attaches it to a practice attempt, then chooses which records to export for their therapist. Evidence should include stable record IDs, date/time/timezone, prompt and language, method, assistance, transcript provenance, feedback source and reviewer notes. A printable summary and machine-readable records should be traceable to the same event IDs.

Recordings remain local by default. Camera use must be optional and separate from microphone use. Explain any speech-recognition service transfer before transcription; local recording does not imply that browser speech recognition is local. Report exports should list precisely which evidence files are included. Avoid automatic emailing, background uploads or hidden capture. Provide individual deletion and clear handling of missing/deleted media. Storage errors must never show a false “saved” result.

Therapist review should distinguish unreviewed entries from clinician-authored notes. A local caregiver PIN is an interface lock, not clinician identity verification or a clinical audit system. A dashboard on a single device must not imply an authenticated remote patient registry. A clinician may use exported evidence in their assessment; the app should not automatically issue diagnoses, treatment prescriptions or signed clinical conclusions.

## Personalization, context and training

Keep three concepts distinct:

- **Practice adaptation:** prioritize personally relevant or explicitly reviewed difficult phrases, respecting the person's goals, energy and chosen method. This can operate locally and needs no paid API.
- **Recognition personalization:** approved vocabulary, spellings or correction mappings can help handle known names or phrases. Retain original recognition output and allow correction removal. A rule table is not acoustic model training.
- **Acoustic model fine-tuning:** this requires an appropriate trainable model, a consented labeled dataset, held-out evaluation and operational safeguards. Do not claim that saving recordings or changing prompts has trained a model or improved clinical speech.

Routine learning should use opted-in, patient-confirmed communication events, display the supporting frequency/date window, and propose a routine for review. Repetition in practice must not be misclassified as an actual daily need. Morning/afternoon/evening/night and optional place can organize suggestions and practice, but never prove intent. Confirmed routines can suggest relevant vocabulary; they must not invent medication timing, treatment decisions, appointments or location. Do not require GPS. Offer per-source controls and a way to remove learned data.

Suggested phrases must remain editable choices. Context and therapy history must never trigger automatic speech, silently speak on the patient's behalf or prevent access to other vocabulary.

## Validation still required before clinical claims

Engineering tests should cover metric denominators, word alignment, Unicode/language handling, missing audio, cancellation, storage failures, consent, deletion, export consistency and separation of practice from real communication. They verify implementation, not clinical effectiveness.

Clinical validation would additionally require qualified speech-language clinicians, patient participation, accessible consent, condition/stage/language-specific evaluation, reference measures, blinded listener assessment where appropriate, adverse-effect monitoring and predefined analysis. Tamil and other translated prompts require native-speaker and clinical review. There is currently no evidence in these sources that validates Sollu itself or supports a “clinical-grade,” diagnostic, recovery-prediction or treatment-efficacy claim.

## Implementation boundary reviewed on 2026-09-28

The local implementation provides functional word/sentence/script/AAC practice, personal plans, optional audio/video evidence, explicit transcript review, effort and tiredness check-ins, practice-word suggestions, weekly descriptive statistics and a therapist-review workspace. Condition profiles change explanatory guidance; they do not deliver distinct validated treatment protocols. The starter exercise library is English; Tamil practice uses personally entered targets that still need fluent-speaker review.

There is one active practice profile per device. Other patients' reports can be imported as bounded, read-only snapshots. Participant codes and reviewer names are self-entered; imports do not authenticate identity, constitute clinical sign-off, change the local patient's plan, fetch media or authorize training. Patient-specific media references are checked locally; imported evidence IDs must not be resolved into another patient's recordings. JSON/CSV export and separate clip downloads let the person prepare material for a chosen therapist; the app does not automatically deliver a report or provide a secure clinical messaging service.

Text matching uses token edit distance. It is neither an acoustic assessment of the saved recording nor validated recognition fine-tuning. Browser speech recognition is live microphone transcription; it must not be represented as transcription of a previously saved clip. If a recording and transcript are presented as evidence for the same performance, the interface must establish that relationship—for example, a partner transcribes that recording during replay. Separate live utterances must not silently acquire a common clinical score.

Routine suggestions are derived only on an explicit local review action: at least three separate real dates, a common half-hour slot and place, and an understood, selected, supported everyday concept. Demo, cached, clinical and non-affirmative inputs are excluded; practice repetitions do not teach everyday routines. The person and caregiver review the label, time, place and weekdays before activation. A reviewed routine then follows the existing context-sharing controls. Neither a frequency count nor a reviewed schedule proves current intent.

Claims still outside the implementation include clinical-grade validation, diagnosis, prescribed exercise dosage, disease progression measurement, evidence that therapy improved an impairment, automatic speech-model fine-tuning, verified clinician identity, authenticated multi-patient care delivery and automatic therapist transmission. These require additional clinical evaluation and operational infrastructure; a functioning dashboard or passing engineering tests does not establish them.
