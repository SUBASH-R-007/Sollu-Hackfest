// Application-authored scope, never an imported clinical conclusion.
export const REPORT_INTERPRETATION = {
  title: "Communication Progress Report",
  purpose:
    "For clinician/caregiver review. Observed application metrics, not a diagnostic assessment or treatment recommendation.",
  validation:
    "Prototype product metrics, not clinically validated endpoints. Trends do not establish recovery, severity or treatment effectiveness.",
  scoring:
    "Text match compares a reviewed transcript with the practice target. It is not an acoustic, pronunciation or intelligibility score. Missing, unreviewed and AAC transcripts are not scored.",
  timing:
    "Practice response seconds measure readiness to start, not speech onset. Communication seconds and taps measure an attempt through audio start, not completed playback or candidate-selection time.",
  understanding:
    "Confirmed-understood rate uses only explicit understood and needs-repair outcomes. Intended, declined and unconfirmed outcomes are unassessed. Demo-time and demo-cached attempts are excluded; playback is not proof of understanding.",
  reviewerAuthority:
    "Reviewer entries are local observations with unauthenticated identities, not verified clinical sign-off. Imported snapshots are unverified.",
  comparability:
    "Review language, task, communication method, support used and sample size before comparing periods. A clinician must interpret any clinical significance.",
} as const;

export const COMMUNICATION_LOG_INTERPRETATION = {
  title: "Communication Activity Log",
  purpose: REPORT_INTERPRETATION.purpose,
  validation: REPORT_INTERPRETATION.validation,
  timing:
    "Seconds measure attempt start to audio-start notification, not candidate-selection time or completed playback. Time medians use measured nonnegative values from speech-started attempts; missing times are not zero.",
  outcomes:
    "Spoken denotes audio started, not confirmed understanding. Understood records an explicit check with the communication partner. Intended, declined and unconfirmed outcomes are unassessed, not failures.",
  coverage:
    "This activity log includes all selected attempts, including labelled demo-time and cached attempts. It is not a clinical success-rate analysis. Names omitted by a study export do not make it anonymous.",
} as const;
