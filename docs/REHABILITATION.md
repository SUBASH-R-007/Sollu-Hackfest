# Communication rehabilitation workspace

Implemented locally on 2026-09-28. [Clinical research and sources](REHABILITATION_RESEARCH.md). This is a practice and review implementation, not a clinically validated treatment or authenticated remote clinical service.

## Patient workflow

Open **My tools → Communication practice** (`/practice`). Choose an agreed message, a custom target, a previously used confirmed message or a word marked for practice. Comfortable speech, typing, established alaryngeal methods and AAC are supported; rest is always allowed.

Audio/video evidence needs explicit consent. Capture starts after a tap, stops at two minutes or 20 MB, and releases device tracks on cancellation, leaving or hiding the page. Review or discard the clip. It is saved only with the practice attempt; attempt and media commit together. The local media allowance is 250 MB.

Enter the words actually heard while reviewing a clip. Separately consented browser recognition transcribes a new **live** attempt, not a saved clip, and may use the browser vendor's service. Starting a recording clears an earlier transcript to avoid linking separate performances. Recording alone never sends media to an LLM.

Review the transcript before marking words for practice. Add optional person/partner understanding, effort and tiredness feedback, then save locally, including offline. Target, language, method and place are captured at Start; plan edits cannot silently change an ongoing reference. Consent resets for each attempt.

## Individualization

Profiles cover aphasia, dysarthria, ALS/motor neurone disease, Parkinson's disease, laryngectomy and other needs. They change guidance, not diagnosis or prescriptions. Methods include natural speech, AAC, electrolarynx, TEP, oesophageal speech and mixed methods. Goals, agreed instructions, library/custom targets, weekly record goals, practice preferences and rest reminders are editable.

The starter library has English functional words, sentences, scripts and AAC tasks. Tamil custom targets work; the new interface is primarily English and full translation/native clinical review is pending. No physiological drills, swallowing instructions, automatic intensity escalation or proprietary therapy protocol is prescribed. Progressive-condition goals can emphasize maintained participation and AAC. Existing communication tools and access settings remain available; specialized eye tracking and switch scanning are not implemented here.

## Scores and reports

- Text match is `max(0, 1 − token edit distance / target tokens) × 100`, counting insertions, omissions and substitutions while preserving Unicode marks. It is not an acoustic, pronunciation, intelligibility or recovery score. Missing transcripts are unscored. Unreviewed feedback is provisional and excluded from reviewed aggregates.
- Marked practice words count once per attempt; they are not proof of speech errors. Free communication has no known target. Approved correction mappings are shown separately.
- Person, partner and reviewer understanding stay separate. Everyday success uses explicit understood versus needs-repair responses, with missing feedback and demo exclusions visible. Playback alone does not prove understanding.
- Original communication logs measure taps and composition-to-audio-start time, not completed playback or impairment. Practice response time measures readiness/start interaction, not voice onset. Recording duration includes silence.
- Weekly views show records, active days, personal goals, fatigue, medians, IQR and sample sizes. Prefer same-target/language/method comparisons. Descriptive differences and intervals do not prove clinical improvement.

Open `/therapist`, unlock the caregiver PIN and choose **Rehabilitation review** or the separate **Communication log** view. Review plans, evidence and reports. Reviewer identity is self-entered; notes are not authenticated clinical sign-off.

## Personalization and context

Confirmed practice choices suggest subsequent targets. Explicitly reviewed wording corrections help the existing intent engine within its language/place/listener and sharing controls. This personalizes practice and intent interpretation; it does **not** fine-tune an acoustic model. Actual training needs a chosen trainable recognizer, consented labeled recordings, held-out evaluation and operational safeguards.

Time context covers early morning, morning, midday, afternoon, evening, night and late night; therapy dayparts align. Context settings can scan confirmed everyday logs for repeated nonclinical messages across at least three real dates in 90 days. Each proposal needs review of label, time, days and place before activation. Practice repetition, diagnosis and recordings are excluded from routine inference. No GPS is used.

## Storage and transfer

Therapy uses a separate `sollu-rehab` database. Reports have participant codes, date windows, stable evidence IDs, scoring versions and transcript provenance. JSON includes communication observations and evidence IDs; CSV includes practice measurements. Personal text is omitted by default. Individual clips require separate export consent. Exports are unencrypted, may identify someone and are never automatically sent.

Up to ten validated report snapshots can be reviewed locally, marked unverified and separate from the active plan. Imported media IDs never fetch or play local clips. Individual clips, practice records and snapshots can be removed. Removing a practice record also deletes its linked media and reviews. Erase device data clears both stores. Existing encrypted personal backup excludes therapy data: export reports and clips separately first. Downloaded copies remain under recipient control.

Clinical acceptance still requires SLP/native-language review, real microphone/camera/recognition checks, accessible patient/partner testing by condition and stage, and a predefined clinical validation protocol. Automated checks do not establish treatment efficacy. Hosting, automatic report delivery and paid model use remain deferred.
