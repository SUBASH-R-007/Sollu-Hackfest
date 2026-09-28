import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  CalendarDays,
  Download,
  FileCheck2,
  FileUp,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { db, getKV, setKV } from "../../db";
import { download } from "../../lib/metrics";
import { TapButton } from "../../ui";
import {
  CONDITION_PROFILES,
  COMMUNICATION_METHODS,
  EXERCISES,
  rehabProfileSchema,
  rehabPlanSchema,
  type RehabProfile,
  type RehabPlan,
  type PracticeRecord,
  type Understanding,
} from "./model";
import {
  rehabDb,
  getRehabProfile,
  saveRehabProfile,
  getRehabPlan,
  saveRehabPlan,
  listPractice,
  listReviews,
  saveReview,
  getMedia,
  deleteMedia,
  deletePractice,
} from "./store";
import EvidencePlayer from "./EvidencePlayer";
import PracticeCorrection from "./PracticeCorrection";
import {
  buildReport,
  communicationSummary,
  describe,
  localDay,
  MAX_REPORT_BYTES,
  parseReport,
  reportCsv,
  weeklyReport,
  type TherapyReport,
  type ReportSession,
} from "./report";
import "./dashboard.css";

const CASELOAD_KEY = "rehab-report-caseload-v1";
type ImportedCase = { id: string; importedAt: number; report: TherapyReport };
const methodLabels: Record<RehabProfile["communicationMethod"], string> = {
  natural_speech: "Natural speech",
  aac: "AAC / communication aid",
  electrolarynx: "Electrolarynx",
  tep: "TEP speech",
  esophageal: "Oesophageal speech",
  mixed: "Mixed communication methods",
};
const understandingLabels = {
  yes: "Understood",
  partly: "Partly understood",
  no: "Not understood",
  unknown: "Not checked",
};
const fmt = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value.toFixed(1)}${suffix}`;
const pct = (value: number | null) =>
  value === null ? "Not measured" : `${Math.round(value * 100)}%`;
const dateTime = (at: number) =>
  new Date(at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const lines = (value: string) =>
  value
    .split(/\r?\n/u)
    .map((v) => v.trim())
    .filter(Boolean);

async function readCaseload(): Promise<ImportedCase[]> {
  const stored = await getKV<unknown>(CASELOAD_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.slice(0, 10).flatMap((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      typeof value.id !== "string" ||
      typeof value.importedAt !== "number"
    )
      return [];
    try {
      return [
        {
          id: value.id,
          importedAt: value.importedAt,
          report: parseReport(JSON.stringify(value.report)),
        },
      ];
    } catch {
      return [];
    }
  });
}

function ProfileEditor({
  profile,
  plan,
}: {
  profile: RehabProfile;
  plan: RehabPlan;
}) {
  const [draft, setDraft] = useState(profile);
  const [goals, setGoals] = useState(profile.goals.join("\n"));
  const [targets, setTargets] = useState(plan.customTargets.join("\n"));
  const [exerciseIds, setExerciseIds] = useState(plan.exerciseIds);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const condition = CONDITION_PROFILES.find((c) => c.id === draft.condition)!;
  const set = <K extends keyof RehabProfile>(key: K, value: RehabProfile[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  async function save() {
    setSaving(true);
    setStatus("");
    try {
      if (!exerciseIds.length && !lines(targets).length)
        throw new Error(
          "Choose at least one exercise or add a personal practice target.",
        );
      const updatedAt = Date.now();
      const nextProfile = rehabProfileSchema.parse({
        ...draft,
        goals: lines(goals),
        updatedAt,
      });
      const nextPlan = rehabPlanSchema.parse({
        ...plan,
        exerciseIds,
        customTargets: lines(targets),
        updatedAt,
      });
      await rehabDb.transaction(
        "rw",
        rehabDb.profiles,
        rehabDb.plans,
        async () => {
          await saveRehabProfile(nextProfile);
          await saveRehabPlan(nextPlan);
        },
      );
      setStatus("Individual practice plan saved on this device.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "The plan could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="panel rehab-profile-editor print-hide">
      <summary>
        <Save size={21} aria-hidden="true" /> Individual profile & practice plan
      </summary>
      <p>
        Choose goals with the person and their speech-language therapist.
        Condition selection changes guidance; it does not establish a diagnosis
        or prescribe treatment.
      </p>
      <div className="rehab-form-grid">
        <label>
          Preferred name (stays local)
          <input
            value={draft.displayName}
            maxLength={80}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </label>
        <label>
          Communication needs
          <select
            value={draft.condition}
            onChange={(e) =>
              set("condition", e.target.value as RehabProfile["condition"])
            }
          >
            {CONDITION_PROFILES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Practice language
          <select
            value={draft.language}
            onChange={(e) => {
              set("language", e.target.value as "en" | "ta");
              setExerciseIds((old) =>
                old.filter((id) =>
                  EXERCISES.some(
                    (ex) => ex.id === id && ex.language === e.target.value,
                  ),
                ),
              );
            }}
          >
            <option value="en">English</option>
            <option value="ta">Tamil — use your own reviewed targets</option>
          </select>
        </label>
        <label>
          Usual communication method
          <select
            value={draft.communicationMethod}
            onChange={(e) =>
              set(
                "communicationMethod",
                e.target.value as RehabProfile["communicationMethod"],
              )
            }
          >
            {COMMUNICATION_METHODS.map((method) => (
              <option value={method} key={method}>
                {methodLabels[method]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Practice records per week (personal goal)
          <input
            type="number"
            min={1}
            max={21}
            value={draft.weeklyTarget}
            onChange={(e) => set("weeklyTarget", Number(e.target.value))}
          />
        </label>
        <label>
          Comfortable practice minutes
          <input
            type="number"
            min={1}
            max={15}
            value={draft.practiceMinutes}
            onChange={(e) => set("practiceMinutes", Number(e.target.value))}
          />
        </label>
        <label>
          Fatigue level for a rest reminder (1–10)
          <input
            type="number"
            min={1}
            max={10}
            value={draft.fatigueLimit}
            onChange={(e) => set("fatigueLimit", Number(e.target.value))}
          />
        </label>
      </div>
      <p className="notice">
        <strong>{condition.label}:</strong> {condition.focus}{" "}
        {condition.caution}
      </p>
      <label>
        Participation goals — one per line
        <textarea
          rows={3}
          maxLength={3200}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="Ask for help during a family conversation"
        />
      </label>
      <label>
        Instructions already agreed with the therapist
        <textarea
          rows={3}
          maxLength={3000}
          value={draft.clinicianInstructions}
          onChange={(e) => set("clinicianInstructions", e.target.value)}
          placeholder="Record the person's agreed strategies and support needs."
        />
      </label>
      <fieldset>
        <legend>Practice library</legend>
        <div className="rehab-exercise-picker">
          {EXERCISES.filter((ex) => ex.language === draft.language).map(
            (ex) => (
              <label className="checkbox-label" key={ex.id}>
                <input
                  type="checkbox"
                  checked={exerciseIds.includes(ex.id)}
                  onChange={(e) =>
                    setExerciseIds((old) =>
                      e.target.checked
                        ? [...old, ex.id]
                        : old.filter((id) => id !== ex.id),
                    )
                  }
                />
                <span>
                  <strong>{ex.title}</strong>
                  <small>{ex.target}</small>
                </span>
              </label>
            ),
          )}
        </div>
        {!EXERCISES.some((ex) => ex.language === draft.language) && (
          <p>
            Add personal targets below in the chosen language and have them
            reviewed by a fluent speaker.
          </p>
        )}
      </fieldset>
      <label>
        Personal words or sentences — one per line, up to 20
        <textarea
          rows={4}
          maxLength={6000}
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          placeholder="Please give me time.&#10;I would like to speak to my family."
        />
      </label>
      <TapButton
        className="primary-button"
        disabled={saving}
        onActivate={() => void save()}
      >
        <Save size={20} aria-hidden="true" />
        {saving ? "Saving…" : "Save practice plan"}
      </TapButton>
      <p role="status">{status}</p>
    </details>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="stat-card rehab-stat">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
  );
}

function UnderstandingTable({ sessions }: { sessions: ReportSession[] }) {
  const sources = [
    {
      label: "Person's own report",
      values: sessions.map((s) => s.selfUnderstanding),
    },
    {
      label: "Partner report",
      values: sessions.map((s) => s.partnerUnderstanding),
    },
    {
      label: "Latest local reviewer entry",
      values: sessions.map(
        (s) =>
          [...s.reviews].sort((a, b) => b.at - a.at)[0]?.understanding ??
          "unknown",
      ),
    },
  ];
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Practice understanding table"
    >
      <table className="attempt-table">
        <caption>
          Practice understanding is reported separately by source. No missing
          rating is treated as failure.
        </caption>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Understood / assessed</th>
            <th scope="col">Partly / not</th>
            <th scope="col">Not checked</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => {
            const yes = source.values.filter((v) => v === "yes").length,
              partly = source.values.filter((v) => v === "partly").length,
              no = source.values.filter((v) => v === "no").length;
            return (
              <tr key={source.label}>
                <th scope="row">{source.label}</th>
                <td>
                  {yes} / {yes + partly + no}
                </td>
                <td>
                  {partly} / {no}
                </td>
                <td>{source.values.length - yes - partly - no}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Evidence({ id }: { id: string }) {
  const media = useLiveQuery(() => getMedia(id), [id]);
  const [consent, setConsent] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [status, setStatus] = useState("");
  if (!media)
    return (
      <p className="muted">
        Evidence {id.slice(0, 8)} is unavailable on this device.
      </p>
    );
  const filename = `sollu-evidence-${id.replace(/[^a-zA-Z0-9_-]/gu, "_")}.${media.mimeType.includes("mp4") ? "mp4" : media.mimeType.includes("ogg") ? "ogg" : media.mimeType.includes("wav") ? "wav" : media.mimeType.includes("mpeg") ? "mp3" : "webm"}`;
  return (
    <div className="rehab-evidence">
      <EvidencePlayer
        caregiver
        media={media}
        label={`${media.kind === "video" ? "Video" : "Audio"} practice evidence`}
      />
      <label className="checkbox-label print-hide">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        The person agrees to export this identifiable {media.kind} clip.
      </label>
      <div className="rehab-actions print-hide">
        <TapButton
          className="secondary-button"
          disabled={!consent}
          onActivate={() => {
            download(media.blob, filename);
            setStatus(
              "Clip downloaded separately. Match its media ID to the report manifest before sharing.",
            );
          }}
        >
          <Download size={18} aria-hidden="true" />
          Download clip
        </TapButton>
        <TapButton
          className="secondary-button"
          onActivate={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            void deleteMedia(id).catch(() =>
              setStatus("The clip could not be removed. Please try again."),
            );
          }}
        >
          <Trash2 size={18} aria-hidden="true" />
          {confirmDelete ? "Confirm remove this clip" : "Remove clip"}
        </TapButton>
        {confirmDelete && (
          <TapButton
            className="secondary-button"
            onActivate={() => setConfirmDelete(false)}
          >
            Keep clip
          </TapButton>
        )}
      </div>
      <p role="status">{status}</p>
    </div>
  );
}

function ReviewForm({ practice }: { practice: PracticeRecord }) {
  const [reviewer, setReviewer] = useState(""),
    [notes, setNotes] = useState(""),
    [understanding, setUnderstanding] = useState<Understanding>("unknown");
  const [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await saveReview({
        id: crypto.randomUUID(),
        practiceId: practice.id,
        patientId: practice.patientId,
        reviewer: reviewer.trim(),
        reviewedAt: Date.now(),
        understanding,
        notes,
      });
      setNotes("");
      setStatus(
        "Review entry saved locally. Earlier entries remain in the review history.",
      );
    } catch {
      setStatus(
        "The review could not be saved. Check the reviewer name and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="rehab-review-form print-hide">
      <summary>Add a therapist / reviewer observation</summary>
      <p>
        Reviewer identity is self-entered. This local note is not authenticated
        clinical sign-off or a validated assessment.
      </p>
      <label>
        Reviewer name or initials
        <input
          maxLength={100}
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
        />
      </label>
      <label>
        Meaning understood during this practice
        <select
          value={understanding}
          onChange={(e) => setUnderstanding(e.target.value as Understanding)}
        >
          {Object.entries(understandingLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Observation, support used, and next review notes
        <textarea
          maxLength={3000}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <TapButton
        className="secondary-button"
        disabled={!reviewer.trim() || saving}
        onActivate={() => void save()}
      >
        <FileCheck2 size={20} aria-hidden="true" />
        Save reviewer observation
      </TapButton>
      <p role="status">{status}</p>
    </details>
  );
}

function SessionList({
  sessions,
  localRecords,
  imported,
}: {
  sessions: ReportSession[];
  localRecords: PracticeRecord[];
  imported: boolean;
}) {
  const [limit, setLimit] = useState(20);
  const [deleting, setDeleting] = useState(""),
    [deleteStatus, setDeleteStatus] = useState("");
  const sorted = [...sessions].sort((a, b) => b.at - a.at);
  return (
    <section className="panel" aria-labelledby="rehab-session-title">
      <h3 id="rehab-session-title">Practice records & evidence</h3>
      <p>
        Each saved exercise is one practice record. Recording is optional; empty
        measurements stay missing.
      </p>
      {!sessions.length && (
        <p>
          No practice records in this date range. Open Practice to begin with a
          useful message.
        </p>
      )}
      {sorted.slice(0, limit).map((session) => (
        <details className="rehab-session" key={session.id}>
          <summary>
            <span>
              {dateTime(session.at)} · {session.kind}
            </span>
            <span className="badge">
              {session.reviews.length
                ? `${session.reviews.length} review entries`
                : "Awaiting review"}
            </span>
          </summary>
          <h4>{session.target ?? "Practice text omitted from this report"}</h4>
          <p>
            {methodLabels[session.method]} ·{" "}
            {session.language === "ta" ? "Tamil" : "English"} · Response{" "}
            {fmt(session.responseSeconds, "s")} · Recorded{" "}
            {fmt(session.recordingSeconds, "s")}
          </p>
          <p>
            Reviewed transcript text match: {fmt(session.textMatch, "%")} ·
            Partner: {understandingLabels[session.partnerUnderstanding]} ·
            Fatigue {session.fatigueBefore ?? "—"} →{" "}
            {session.fatigueAfter ?? "—"}
          </p>
          <p>
            Transcript source: {session.transcriptSource} ·{" "}
            {session.transcriptReviewed ? "reviewed" : "not reviewed"} ·
            Scoring: text-match-v1
          </p>
          {session.transcript && (
            <p>
              <strong>Entered transcript:</strong> {session.transcript}
            </p>
          )}
          {session.rawTranscript &&
            session.rawTranscript !== session.transcript && (
              <p>
                <strong>Original recognition:</strong> {session.rawTranscript}
              </p>
            )}
          {session.missedWords.length > 0 && (
            <p>
              <strong>Words marked to revisit:</strong>{" "}
              {session.missedWords.join(", ")}
            </p>
          )}
          {session.notes && (
            <p>
              <strong>Practice notes:</strong> {session.notes}
            </p>
          )}
          {session.reviews.map((review, index) => (
            <blockquote
              className="rehab-review-note"
              key={`${review.at}-${index}`}
            >
              <strong>
                {review.reviewer ?? "Reviewer identity omitted"} ·{" "}
                {dateTime(review.at)}
              </strong>
              <p>
                {understandingLabels[review.understanding]}
                {review.notes ? ` — ${review.notes}` : ""}
              </p>
              <small>
                {imported
                  ? "Imported, unverified reviewer entry"
                  : "Locally entered reviewer observation; identity not authenticated"}
              </small>
            </blockquote>
          ))}
          {!imported &&
            session.media.map((id) => <Evidence key={id} id={id} />)}
          {imported && session.media.length > 0 && (
            <p>
              {session.media.length} evidence references. Clips are separate
              files; importing this report does not fetch or play them.
            </p>
          )}
          {!imported &&
            localRecords.find((record) => record.id === session.id) && (
              <ReviewForm
                practice={localRecords.find(
                  (record) => record.id === session.id,
                )!}
              />
            )}
          {!imported &&
            localRecords.find((record) => record.id === session.id) && (
              <PracticeCorrection
                record={localRecords.find(
                  (record) => record.id === session.id,
                )!}
              />
            )}
          {!imported && (
            <div className="rehab-actions print-hide">
              <TapButton
                className="secondary-button"
                onActivate={() => {
                  if (deleting !== session.id) {
                    setDeleting(session.id);
                    return;
                  }
                  void deletePractice(session.id)
                    .then(() => {
                      setDeleting("");
                      setDeleteStatus(
                        "Practice record, linked recordings and reviewer entries removed from this device.",
                      );
                    })
                    .catch(() =>
                      setDeleteStatus(
                        "The record could not be removed. Please try again.",
                      ),
                    );
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
                {deleting === session.id
                  ? "Confirm delete record and evidence"
                  : "Delete this practice record"}
              </TapButton>
              {deleting === session.id && (
                <TapButton
                  className="secondary-button"
                  onActivate={() => setDeleting("")}
                >
                  Keep record
                </TapButton>
              )}
            </div>
          )}
        </details>
      ))}
      {sessions.length > limit && (
        <TapButton
          className="secondary-button print-hide"
          onActivate={() => setLimit((old) => old + 20)}
        >
          Show 20 more records
        </TapButton>
      )}
      <p role="status">{deleteStatus}</p>
    </section>
  );
}

function ProgressView({
  report,
  imported,
}: {
  report: TherapyReport;
  imported: boolean;
}) {
  const weeks = weeklyReport(report),
    communication = communicationSummary(report.communication);
  const text = describe(report.sessions.map((s) => s.textMatch)),
    response = describe(report.sessions.map((s) => s.responseSeconds));
  const fatigue = describe(
    report.sessions
      .filter((s) => s.fatigueBefore !== null && s.fatigueAfter !== null)
      .map((s) => s.fatigueAfter! - s.fatigueBefore!),
  );
  const activeDays = new Set(report.sessions.map((s) => localDay(s.at))).size;
  const aac = report.sessions.filter(
    (s) => s.kind === "aac" && s.aacCompleted !== null,
  );
  const aacDone = aac.filter((s) => s.aacCompleted).length;
  const misses = new Map<string, number>();
  for (const session of report.sessions)
    for (const word of new Set(
      session.missedWords.map((w) => w.normalize("NFKC").toLocaleLowerCase()),
    ))
      misses.set(word, (misses.get(word) ?? 0) + 1);
  const groups = new Map<string, ReportSession[]>();
  for (const session of report.sessions) {
    const key = `${session.kind} · ${session.language} · ${methodLabels[session.method]}${session.target ? ` · ${session.target}` : " · target omitted"}`;
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }
  const interval = communication.ci95
    ? `${pct(communication.ci95[0])}–${pct(communication.ci95[1])}`
    : "not available";
  return (
    <>
      <div className="stats-grid rehab-stats">
        <Stat
          label="Practice records"
          value={report.sessions.length}
          detail={`${activeDays} active days in this range`}
        />
        <Stat
          label="Reviewed text match"
          value={fmt(text.median, "%")}
          detail={`Median · n=${text.n}; ${report.sessions.length - text.n} without a score`}
        />
        <Stat
          label="Response time"
          value={fmt(response.median, "s")}
          detail={`Median · n=${response.n}; no speed target`}
        />
        <Stat
          label="Fatigue change"
          value={fmt(fatigue.median)}
          detail={`After − before · ${fatigue.n} paired ratings (0–10)`}
        />
        <Stat
          label="AAC task completed"
          value={`${aacDone} / ${aac.length}`}
          detail={`${report.sessions.filter((s) => s.kind === "aac").length - aac.length} AAC records not assessed`}
        />
      </div>
      <p className="notice">
        Text match compares a reviewed entered transcript with the target. It is
        not an acoustic speech score, intelligibility test, diagnosis, or
        evidence that treatment works. Different methods and tasks are shown
        separately below.{" "}
        {imported
          ? "These are unverified values from an imported snapshot."
          : "No model is trained by saving a recording."}
      </p>
      <section className="panel" aria-labelledby="rehab-weekly-title">
        <div className="section-heading">
          <h3 id="rehab-weekly-title">
            <CalendarDays size={22} aria-hidden="true" /> Weekly practice &
            comfort
          </h3>
          <span className="badge">
            Goal: {report.profile.weeklyTarget} records / week
          </span>
        </div>
        <p>
          Weeks begin Monday in the device's local time. The first and last week
          may be partial; past goal changes are not reconstructed. More practice
          or faster responses are not always better.
        </p>
        <div
          className="rehab-week-chart"
          tabIndex={0}
          role="list"
          aria-label="Weekly practice records"
        >
          {weeks.map((week) => (
            <div role="listitem" className="rehab-week-column" key={week.week}>
              <strong>{week.count}</strong>
              <div className="rehab-week-track" aria-hidden="true">
                <span
                  style={{
                    height: `${Math.min(100, (week.count / Math.max(report.profile.weeklyTarget, ...weeks.map((w) => w.count), 1)) * 100)}%`,
                  }}
                />
              </div>
              <span>{week.week.slice(5)}</span>
              <small>{week.activeDays} days</small>
            </div>
          ))}
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Weekly practice measurements"
        >
          <table className="attempt-table">
            <caption>
              Weekly medians; IQR is the middle 50% of observed values. Missing
              values are excluded, never replaced with zero.
            </caption>
            <thead>
              <tr>
                <th scope="col">Week of</th>
                <th scope="col">Records / current goal</th>
                <th scope="col">Text match: median (n)</th>
                <th scope="col">Response: median (n)</th>
                <th scope="col">Fatigue change (n)</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.week}>
                  <th scope="row">{week.week}</th>
                  <td>
                    {week.count} / {report.profile.weeklyTarget}
                  </td>
                  <td>
                    {fmt(week.textMatch.median, "%")} ({week.textMatch.n})
                    <small>
                      IQR {fmt(week.textMatch.q1)}–{fmt(week.textMatch.q3)}
                    </small>
                  </td>
                  <td>
                    {fmt(week.response.median, "s")} ({week.response.n})
                    <small>
                      IQR {fmt(week.response.q1)}–{fmt(week.response.q3)}
                    </small>
                  </td>
                  <td>
                    {fmt(week.fatigue.median)} ({week.fatigue.n})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" aria-labelledby="rehab-communication-title">
        <h3 id="rehab-communication-title">Everyday communication outcomes</h3>
        <div className="stats-grid rehab-stats">
          <Stat
            label="Confirmed understood"
            value={pct(communication.rate)}
            detail={`${communication.understood} understood / ${communication.assessed} assessed; ${communication.unassessed} not assessed`}
          />
          <Stat
            label="Taps to speech start"
            value={fmt(communication.taps.median)}
            detail={`Median · n=${communication.taps.n} speech-started attempts`}
          />
          <Stat
            label="Seconds to speech start"
            value={fmt(communication.seconds.median, "s")}
            detail={`Median · n=${communication.seconds.n}; ${communication.spoken - communication.seconds.n} missing`}
          />
        </div>
        <p>
          {communication.eligible} eligible attempts; {communication.excluded}{" "}
          demo-time or demo-cached attempts excluded. Actual use of the free
          vocabulary engine remains eligible. The rate uses explicit
          “understood” and “needs repair” outcomes only. Playback and delivery
          are not confirmation of understanding. An intended sentence, declined
          check or absent response is unassessed.
        </p>
        <p className="muted">
          95% Wilson interval for confirmed understanding: {interval}. Attempts
          from one person are related, so this descriptive interval does not
          establish clinical improvement. Existing communication logs measure
          audio start; they do not establish completed playback or
          comprehension. Taps and seconds therefore describe speech-started
          sentences.
        </p>
        <UnderstandingTable sessions={report.sessions} />
      </section>
      <section className="panel" aria-labelledby="rehab-compare-title">
        <h3 id="rehab-compare-title">Compare similar practice</h3>
        <p>
          Target, language and communication method affect results. Review
          comparable records with the therapist before interpreting a change.
          When target text is omitted, groups combine task categories and cannot
          establish change on the same sentence. Scoring version:{" "}
          {report.scoringVersion}.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Comparable practice measurements"
        >
          <table className="attempt-table">
            <thead>
              <tr>
                <th scope="col">Task · language · method · target</th>
                <th scope="col">Records</th>
                <th scope="col">Median text match (n)</th>
                <th scope="col">Median response (n)</th>
              </tr>
            </thead>
            <tbody>
              {[...groups].map(([key, rows]) => {
                const text = describe(rows.map((s) => s.textMatch)),
                  response = describe(rows.map((s) => s.responseSeconds));
                return (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{rows.length}</td>
                    <td>
                      {fmt(text.median, "%")} ({text.n})
                    </td>
                    <td>
                      {fmt(response.median, "s")} ({response.n})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!groups.size && <p>Comparable groups will appear after practice.</p>}
      </section>
      <section className="panel" aria-labelledby="rehab-words-title">
        <h3 id="rehab-words-title">
          Words to revisit & communication corrections
        </h3>
        <div className="rehab-two-columns">
          <div>
            <h4>Most frequently marked practice words</h4>
            <p>
              A target word counts once per practice record when the person
              explicitly marks it to revisit. This records their choice; it does
              not prove a speech error. Recognition mismatch alone is not a
              missed spoken word.
            </p>
            {misses.size ? (
              <ol className="rehab-word-list">
                {[...misses]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([word, count]) => (
                    <li key={word}>
                      <span>{word}</span>
                      <strong>{count} records</strong>
                    </li>
                  ))}
              </ol>
            ) : (
              <p>
                No marked words recorded
                {!report.contentIncluded
                  ? "; word content was omitted from this report"
                  : ""}
                .
              </p>
            )}
          </div>
          <div>
            <h4>Approved tool corrections</h4>
            <p>
              These are explicitly saved “when I say → I mean” mappings. They
              are not counts of speech errors, diagnoses or measured difficulty.
            </p>
            {report.corrections.length ? (
              <ul>
                {report.corrections.slice(0, 20).map((c, index) => (
                  <li key={`${c.heard}-${index}`}>
                    {c.heard} → {c.means} <small>({c.language})</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No approved correction text included.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function TherapyDashboard() {
  const data = useLiveQuery(async () => {
    const [profile, plan, sessions, reviews, attempts, corrections] =
      await Promise.all([
        getRehabProfile(),
        getRehabPlan(),
        listPractice(),
        listReviews(),
        db.attempts.toArray(),
        db.substitutions.toArray(),
      ]);
    return { profile, plan, sessions, reviews, attempts, corrections };
  }, []);
  const cases = useLiveQuery(readCaseload, []);
  const [selected, setSelected] = useState("local"),
    [participant, setParticipant] = useState("participant-001");
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 27);
    return localDay(date.getTime());
  });
  const [to, setTo] = useState(() => localDay(Date.now()));
  const [includeContent, setIncludeContent] = useState(false),
    [exportConsent, setExportConsent] = useState(false),
    [importConsent, setImportConsent] = useState(false);
  const [preview, setPreview] = useState<TherapyReport | null>(null),
    [status, setStatus] = useState(""),
    [forget, setForget] = useState(false);
  const selectedCase = cases?.find((c) => c.id === selected);
  const invalidRange =
    !from ||
    !to ||
    from > to ||
    new Date(`${to}T12:00:00`).getTime() -
      new Date(`${from}T12:00:00`).getTime() >
      366 * 86400000;
  const reportResult = useMemo(() => {
    if (!data || invalidRange) return { report: null, error: "" };
    try {
      return {
        report: buildReport({
          ...data,
          participant,
          from,
          to,
          includeContent: true,
        }),
        error: "",
      };
    } catch {
      return {
        report: null,
        error:
          "This date range contains too much data or an invalid measurement. Choose a shorter range to prepare the report.",
      };
    }
  }, [data, participant, from, to, invalidRange]);
  const report = selectedCase?.report ?? reportResult.report;
  async function importFile(file: File | undefined) {
    setStatus("");
    setPreview(null);
    setImportConsent(false);
    if (!file) return;
    try {
      if (file.size > MAX_REPORT_BYTES)
        throw new Error("Choose a report smaller than 2 MB.");
      setPreview(parseReport(await file.text()));
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The report could not be read.",
      );
    }
  }
  async function keepImport() {
    if (!preview || !importConsent) return;
    try {
      const current = await readCaseload();
      if (current.length >= 10)
        throw new Error(
          "This device holds 10 imported snapshots. Remove one before adding another.",
        );
      const entry = {
        id: crypto.randomUUID(),
        importedAt: Date.now(),
        report: preview,
      };
      await setKV(CASELOAD_KEY, [...current, entry]);
      setSelected(entry.id);
      setPreview(null);
      setImportConsent(false);
      setStatus(
        "Read-only report snapshot imported. No plan, trust, recordings or model settings were changed.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The report could not be imported.",
      );
    }
  }
  function exportReport(format: "json" | "csv") {
    if (!data || invalidRange || !exportConsent) return;
    try {
      const exported = buildReport({
        ...data,
        participant,
        from,
        to,
        includeContent,
      });
      const content =
        format === "json"
          ? JSON.stringify(exported, null, 2)
          : reportCsv(exported);
      if (
        format === "json" &&
        new TextEncoder().encode(content).byteLength > MAX_REPORT_BYTES
      )
        throw new Error(
          "This report is too large to import. Choose a shorter date range.",
        );
      download(
        new Blob([content], {
          type:
            format === "json" ? "application/json" : "text/csv;charset=utf-8;",
        }),
        `sollu-rehab-${from}-${to}.${format}`,
      );
      setStatus(
        `${format.toUpperCase()} report downloaded. Media stays separate. Review the file and share only with your chosen recipient.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The report could not be exported.",
      );
    }
  }
  if (!data || !cases)
    return <p role="status">Loading rehabilitation dashboard…</p>;
  return (
    <section
      className="rehab-dashboard"
      aria-labelledby="rehab-dashboard-title"
    >
      <div className="rehab-dashboard-heading">
        <div>
          <span className="eyebrow">
            Participation, practice & communication
          </span>
          <h2 id="rehab-dashboard-title">Rehabilitation review</h2>
          <p>
            Individual practice, weekly patterns and evidence for a conversation
            with your therapist.
          </p>
        </div>
        <Activity size={38} aria-hidden="true" />
      </div>
      <p className="privacy-caption">
        <ShieldCheck size={18} aria-hidden="true" />
        Local workspace. Reports and recordings stay on this device until
        explicitly downloaded. This is not an authenticated clinical portal.
      </p>
      <div className="panel rehab-caseload print-hide">
        <label>
          Patient / report snapshot
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setForget(false);
            }}
          >
            {[
              {
                id: "local",
                label: `This device${data.profile.displayName ? ` — ${data.profile.displayName}` : ""}`,
              },
              ...cases.map((c) => ({
                id: c.id,
                label: `${c.report.participant} — imported ${new Date(c.importedAt).toLocaleDateString()}`,
              })),
            ].map((c) => (
              <option value={c.id} key={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          Each imported report is an unverified, read-only snapshot. Patient
          codes are entered by the sender; they do not prove identity. Up to 10
          snapshots can be kept locally.
        </p>
        {selectedCase && (
          <TapButton
            className="secondary-button"
            onActivate={() => {
              if (!forget) {
                setForget(true);
                return;
              }
              void readCaseload()
                .then((current) =>
                  setKV(
                    CASELOAD_KEY,
                    current.filter((c) => c.id !== selected),
                  ),
                )
                .then(() => {
                  setSelected("local");
                  setForget(false);
                  setStatus("Imported snapshot removed from this device.");
                })
                .catch(() =>
                  setStatus("Unable to remove the snapshot. Please try again."),
                );
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            {forget ? "Confirm remove snapshot" : "Remove imported snapshot"}
          </TapButton>
        )}
      </div>
      {selected === "local" && (
        <>
          <ProfileEditor profile={data.profile} plan={data.plan} />
          <div className="panel rehab-date-filter print-hide">
            <label>
              Practice report from
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setExportConsent(false);
                }}
              />
            </label>
            <label>
              Practice report to
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setExportConsent(false);
                }}
              />
            </label>
            <TapButton
              className="secondary-button"
              onActivate={() => {
                const date = new Date();
                date.setDate(date.getDate() - 27);
                setFrom(localDay(date.getTime()));
                setTo(localDay(Date.now()));
                setExportConsent(false);
              }}
            >
              Last 4 weeks
            </TapButton>
          </div>
          {invalidRange && (
            <p className="notice" role="alert">
              Choose a valid date range of up to 366 days, with the start on or
              before the end.
            </p>
          )}
          {reportResult.error && (
            <p role="alert" className="notice">
              {reportResult.error}
            </p>
          )}
        </>
      )}
      {report && (
        <>
          <section className="panel rehab-report-profile">
            <div className="section-heading">
              <h3>
                {selectedCase
                  ? report.participant
                  : data.profile.displayName || "Local patient"}
              </h3>
              <span className="badge">
                {selectedCase ? "Imported · unverified" : "Local observations"}
              </span>
            </div>
            <p>
              {
                CONDITION_PROFILES.find(
                  (c) => c.id === report.profile.condition,
                )?.label
              }{" "}
              · {methodLabels[report.profile.method]} ·{" "}
              {report.profile.language === "ta" ? "Tamil" : "English"}
            </p>
            <p>
              {report.from} to {report.to} · {report.profile.practiceMinutes}{" "}
              minute personal practice preference · Rest reminder at fatigue{" "}
              {report.profile.fatigueLimit}/10
            </p>
            {report.profile.goals.length > 0 && (
              <>
                <h4>Participation goals</h4>
                <ul>
                  {report.profile.goals.map((goal, index) => (
                    <li key={`${goal}-${index}`}>{goal}</li>
                  ))}
                </ul>
              </>
            )}
            {report.profile.instructions && (
              <p>
                <strong>Recorded therapist instructions:</strong>{" "}
                {report.profile.instructions}
              </p>
            )}
          </section>
          <ProgressView report={report} imported={Boolean(selectedCase)} />
          <SessionList
            sessions={report.sessions}
            localRecords={data.sessions}
            imported={Boolean(selectedCase)}
          />
        </>
      )}
      <section
        className="panel rehab-transfer print-hide"
        aria-labelledby="rehab-transfer-title"
      >
        <h3 id="rehab-transfer-title">Prepare a therapist report</h3>
        <p>
          Exports are unencrypted and may reveal health information even with a
          participant code. This app does not email, upload or send a report to
          anyone. Print uses the displayed report, including visible personal
          text.
        </p>
        {selected === "local" && (
          <>
            <label>
              Participant code for downloads
              <input
                maxLength={80}
                value={participant}
                onChange={(e) => {
                  setParticipant(e.target.value);
                  setExportConsent(false);
                }}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeContent}
                onChange={(e) => {
                  setIncludeContent(e.target.checked);
                  setExportConsent(false);
                }}
              />
              Include practice words, transcripts, goals, notes and reviewer
              names.
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportConsent}
                onChange={(e) => setExportConsent(e.target.checked)}
              />
              The person agrees to download this report for their chosen
              recipient.
            </label>
            <div className="rehab-actions">
              <TapButton
                className="primary-button"
                disabled={!exportConsent || invalidRange}
                onActivate={() => exportReport("json")}
              >
                <Download size={20} aria-hidden="true" />
                Download report JSON
              </TapButton>
              <TapButton
                className="secondary-button"
                disabled={!exportConsent || invalidRange}
                onActivate={() => exportReport("csv")}
              >
                Download practice CSV
              </TapButton>
            </div>
            <p className="muted">
              JSON includes communication counts and evidence IDs. CSV contains
              practice measurements. Clips are excluded from both; open a
              practice record to export an individual clip with separate
              permission.
            </p>
          </>
        )}
        <details>
          <summary>
            <FileUp size={19} aria-hidden="true" />
            Import a report for local review
          </summary>
          <p>
            Import only a report you have permission to review. It will not
            update this person's plan, restore recording permission, train a
            model, or verify a clinician's identity.
          </p>
          <label>
            Choose Sollu report JSON (maximum 2 MB)
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </label>
          {preview && (
            <div className="notice">
              <strong>{preview.participant}</strong>
              <p>
                {preview.from} to {preview.to} · {preview.sessions.length}{" "}
                practice records · {preview.communication.length} communication
                attempts.{" "}
                {preview.contentIncluded
                  ? "Contains personal text."
                  : "Practice text was omitted."}
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importConsent}
                  onChange={(e) => setImportConsent(e.target.checked)}
                />
                I have permission to keep this report on this device.
              </label>
              <TapButton
                className="secondary-button"
                disabled={!importConsent}
                onActivate={() => void keepImport()}
              >
                Import read-only snapshot
              </TapButton>
            </div>
          )}
        </details>
        <p role="status">{status}</p>
      </section>
    </section>
  );
}
