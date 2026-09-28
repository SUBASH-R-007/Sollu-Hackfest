# Communication rehabilitation workspace

Implemented locally on 2026-09-28, with v8 dedicated Rehabilitation and Clinician tabs. [Clinical research and sources](REHABILITATION_RESEARCH.md) · [Engineering verification](evidence/v8/VERIFICATION.md). This is a practice and review implementation, not a clinically validated treatment or authenticated remote clinical service.

## Patient workflow

Open the main **Rehabilitation** tab (`/rehabilitation`). **Overview** shows the personal goals and practice plan, this week's saved-practice target, daily activity, recent attempts and a rest reminder. The shared navigation connects **My rehabilitation**, **Practice** and the gated **Clinician dashboard**. Existing **My tools → Communication practice** and `/practice` links still work.

Choose **Practice** for an agreed message, a custom target, a previously used confirmed message or a word marked for practice. Comfortable speech, typing, established alaryngeal methods and AAC are supported; rest is always allowed.

Audio/video evidence needs explicit consent. Capture starts after a tap, stops at two minutes or 20 MB, and releases device tracks on cancellation, leaving or hiding the page. Review or discard the clip. It is saved only with the practice attempt; attempt and media commit together. The local media allowance is 250 MB.

Enter the words actually heard while reviewing a clip. Separately consented browser recognition transcribes a new **live** attempt, not a saved clip. Default local-only protection requires a browser with on-device recognition and an installed language pack; unsupported browsers offer manual review without a remote fallback. Only an explicit caregiver change permits browser-vendor recognition. Starting a recording clears an earlier transcript to avoid linking separate performances. Recording alone never sends media to an LLM.

Review the transcript before marking words for practice. Add optional person/partner understanding, effort and tiredness feedback, then save locally, including offline. Target, language, method and place are captured at Start; plan edits cannot silently change an ongoing reference. Consent resets for each attempt.

After saving, **See my updated progress** opens the same record in the progress view. Navigation does not copy attempts or save an unfinished attempt. Leaving practice cancels pending capture/recognition and releases recording tracks.

## Personal progress

Open **Progress** (`/rehabilitation?tab=progress`) and choose the last 7 or 28 local calendar days, language and communication method. The view includes saved practices, active days, response-time sample counts, partner understanding with checked/unchecked denominators, daily activity, fatigue/effort ratings, AAC completion, evidence coverage, reviewed words to revisit and recent records. Choosing a compatible reviewed word only prepares a practice target; it never starts recording or speaks.

The weekly target counts unique local saved attempts since Monday across all languages and methods, independently of progress filters. Future-dated records are excluded until their timestamp arrives. Counts refresh when the visible page's clock advances or the window regains focus. Targets are personal participation preferences, not prescribed doses; empty days do not imply missed treatment or deterioration. No new patient store or remote synchronization is introduced.

## Individualization

Profiles cover aphasia, dysarthria, ALS/motor neurone disease, Parkinson's disease, laryngectomy and other needs. They change guidance, not diagnosis or prescriptions. Methods include natural speech, AAC, electrolarynx, TEP, oesophageal speech and mixed methods. Goals, agreed instructions, library/custom targets, weekly record goals, practice preferences and rest reminders are editable.

The starter library has English functional words, sentences, scripts and AAC tasks. Tamil custom targets work; the new interface is primarily English and full translation/native clinical review is pending. No physiological drills, swallowing instructions, automatic intensity escalation or proprietary therapy protocol is prescribed. Progressive-condition goals can emphasize maintained participation and AAC. Existing communication tools and access settings remain available; specialized eye tracking and switch scanning are not implemented here.

## Scores and reports

- Text match is `max(0, 1 − token edit distance / target tokens) × 100`, counting insertions, omissions and substitutions while preserving Unicode marks. It is not an acoustic, pronunciation, intelligibility or recovery score. Missing transcripts are unscored. Unreviewed feedback is provisional and excluded from reviewed aggregates.
- AAC tasks **and records using the AAC communication method**, including sentence/word tasks, count toward participation while staying outside speech/text accuracy and missed-word denominators. The live practice feedback says **Not scored · communication aid**. This rule also applies to progress, clinician summaries and reports.
- Marked practice words count once per attempt; they are not proof of speech errors. Free communication has no known target. Approved correction mappings are shown separately.
- The word dashboard aligns reviewed transcripts with the target, showing matches, omissions and substitutions per target-word occurrence. Extra spoken words are separate. Coverage and language/method filters prevent missing, unreviewed, AAC or hidden-text records from silently becoming accuracy scores. Weekly tables preserve denominators. Choose a reviewed word to prefill a new practice; starting and saving remain explicit.
- Person, partner and reviewer understanding stay separate. Everyday success uses explicit understood versus needs-repair responses, with missing feedback and demo exclusions visible. Playback alone does not prove understanding.
- Original communication logs measure taps and composition-to-audio-start time, not completed playback or impairment. Practice response time runs from **Start this practice** to the first recorded response marker (such as transcript entry, recording start or explicit AAC completion), not voice onset. Taking a break resets that measure. Missing times stay missing; recording duration includes silence.
- Weekly views show records, active days, personal goals, fatigue, medians, IQR and sample sizes. Prefer same-target/language/method comparisons. Descriptive differences and intervals do not prove clinical improvement.

## Clinician dashboard

Open the main **Clinician** tab (`/clinician`) and unlock the local caregiver PIN. **Overview** shows 7/28-day participation, reviewer-entry and transcript coverage, partner-reported understanding, everyday communication outcomes, current goals and available evidence. Its review queue lists records without a reviewer entry or with a transcript awaiting confirmation, oldest first within the period. Filter it by available audio/video or transcript confirmation. This is an administrative review queue, not a clinical priority or urgency score.

**Review record** opens and focuses the exact local record in **Rehabilitation review**; separate actions open the individual plan, report transfer and **Communication log**. `/clinician?view=rehab` and `/clinician?view=log` are direct links; `/therapist` remains available and defaults to Rehabilitation review. The detailed report retains weekly summaries, comparable practice, reviewed word metrics, reviewer observations, recording review and explicit report export/import.

Reviewer identity is self-entered; notes are not authenticated clinical sign-off. The PIN is a local interface lock, not an authenticated clinician account. Overview uses the active local profile; imported reports remain separately selected, unverified read-only snapshots in detailed review. Nothing is automatically sent to a clinician.

## Personalization and context

Confirmed practice choices suggest subsequent targets. Explicitly reviewed wording corrections help the existing intent engine within its language/place/listener and sharing controls. This personalizes practice and intent interpretation; it does **not** fine-tune an acoustic model. Actual training needs a chosen trainable recognizer, consented labeled recordings, held-out evaluation and operational safeguards.

Time context covers early morning, morning, midday, afternoon, evening, night and late night; therapy dayparts align. Context settings can scan confirmed everyday logs for repeated nonclinical messages across at least three real dates in 90 days. Each proposal needs review of label, time, days and place before activation. Practice repetition, diagnosis and recordings are excluded from routine inference. No GPS is used.

## Storage and transfer

Therapy uses a separate `sollu-rehab` database. Reports have participant codes, date windows, stable evidence IDs, scoring versions and transcript provenance. JSON includes communication observations and evidence IDs; CSV includes practice measurements. Personal text is omitted by default. The recommended report export encrypts JSON locally with a passphrase (AES-256-GCM); import requires decryption, preview and separate permission to retain it. Plain JSON/CSV and individual clips remain explicit **unencrypted** downloads; clips need separate consent. Reports and clips are never automatically sent. Encrypted reports do not contain media and do not encrypt the active browser database.

Up to ten validated report snapshots can be reviewed locally, marked unverified and separate from the active plan. Imported media IDs never fetch or play local clips. Individual clips, practice records and snapshots can be removed. Removing a practice record also deletes its linked media and reviews. Erase device data clears both stores. Existing encrypted personal backup excludes therapy data: export reports and clips separately first. Downloaded copies remain under recipient control.

Clinical acceptance still requires SLP/native-language review, real microphone/camera/recognition checks, accessible patient/partner testing by condition and stage, and a predefined clinical validation protocol. Automated checks do not establish treatment efficacy. Hosting, automatic report delivery and paid model use remain deferred.

See [privacy and validation review](PRIVACY_AND_VALIDATION.md) for the default cloud block, free catalog/loopback Ollama alternatives, HIPAA/CDSCO/DPDP research, storage/authentication gaps and the protocol required before stronger clinical claims.
