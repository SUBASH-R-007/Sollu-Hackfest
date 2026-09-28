import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { db } from "../../db";
import { TapButton } from "../../ui";
import { CONDITION_PROFILES, EXERCISES, LOCAL_PATIENT_ID } from "./model";
import {
  getRehabPlan,
  getRehabProfile,
  listPractice,
  listReviews,
  rehabDb,
} from "./store";
import { clinicianSummary } from "./clinicianSummary";
import { useProgressClock } from "./useProgressClock";
import "./clinician.css";

export type ClinicianReviewTarget =
  | { section: "record"; practiceId: string; at: number }
  | { section: "plan" | "transfer" };

const date = (at: number) =>
  new Date(at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const value = (n: number | null, suffix = "") =>
  n === null ? "Not measured" : `${n.toFixed(1)}${suffix}`;

export default function ClinicianOverview({
  onReview,
  onLog,
}: {
  onReview: (target?: ClinicianReviewTarget) => void;
  onLog: () => void;
}) {
  const data = useLiveQuery(async () => {
    const [profile, plan, sessions, reviews, attempts, availableMediaIds] =
      await Promise.all([
        getRehabProfile(),
        getRehabPlan(),
        listPractice(),
        listReviews(),
        db.attempts.toArray(),
        rehabDb.media.where("patientId").equals(LOCAL_PATIENT_ID).primaryKeys(),
      ]);
    return { profile, plan, sessions, reviews, attempts, availableMediaIds };
  }, []);
  const [days, setDays] = useState<7 | 28>(7);
  const [queueFilter, setQueueFilter] = useState<
    "all" | "evidence" | "transcript"
  >("all");
  const [limit, setLimit] = useState(8);
  const now = useProgressClock();
  const summary = useMemo(
    () => (data ? clinicianSummary({ ...data, days, now }) : null),
    [data, days, now],
  );
  if (!data || !summary)
    return (
      <p role="status">Loading the clinician overview from this device…</p>
    );
  const queue = summary.pending.filter(
    (row) =>
      queueFilter === "all" ||
      (queueFilter === "evidence"
        ? row.availableClips > 0
        : row.needsTranscriptReview),
  );
  const communication = summary.communication;
  const tasks = [
    ...data.plan.exerciseIds
      .map((id) => EXERCISES.find((exercise) => exercise.id === id)?.title)
      .filter(Boolean),
    ...data.plan.customTargets,
  ];
  return (
    <div className="rehab-dashboard clinician-overview">
      <section
        className="panel clinician-hero"
        aria-labelledby="clinician-overview-title"
      >
        <div>
          <span className="eyebrow">One device · one active profile</span>
          <h2 id="clinician-overview-title">Clinical review workspace</h2>
          <p>
            {data.profile.displayName || "Local patient"} ·{" "}
            {
              CONDITION_PROFILES.find(
                (item) => item.id === data.profile.condition,
              )?.label
            }{" "}
            · {data.profile.language === "ta" ? "Tamil" : "English"}
          </p>
          <p>
            Review participation, recorded observations and communication
            support together. These app measures do not establish diagnosis,
            treatment response or recovery.
          </p>
        </div>
        <ClipboardList size={40} aria-hidden="true" />
      </section>
      <p className="privacy-caption">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          Local review only. Reviewer names are entered manually and are not
          authenticated. Nothing here sends a report or recording to a
          clinician.
        </span>
      </p>
      <div
        className="clinician-period print-hide"
        aria-label="Overview time period"
      >
        {([7, 28] as const).map((period) => (
          <TapButton
            key={period}
            aria-pressed={days === period}
            onActivate={() => {
              setDays(period);
              setLimit(8);
            }}
          >
            Last {period} days
          </TapButton>
        ))}
        <span className="muted">
          {date(summary.from)}–{date(summary.to)} · device clock · today so far
        </span>
      </div>
      <div className="stats-grid rehab-stats">
        <OverviewStat
          title="Practice records"
          value={String(summary.sessions.length)}
          detail={`${summary.activeDays} active days in ${days} days; each saved exercise is one record`}
        />
        <OverviewStat
          title="Awaiting reviewer entry"
          value={String(summary.pendingReview)}
          detail={`${summary.reviewedRecords} of ${summary.sessions.length} records have a local reviewer entry`}
        />
        <OverviewStat
          title="Reviewed transcripts"
          value={`${summary.scoreableTranscripts} / ${summary.speechRecords}`}
          detail="Non-AAC records with reviewed, non-empty transcripts available for text comparison"
        />
        <OverviewStat
          title="Partner reported understood"
          value={`${summary.partnerUnderstood} / ${summary.partnerChecked}`}
          detail={`${summary.sessions.length - summary.partnerChecked} practice records not checked; partly understood stays separate`}
        />
      </div>
      <div className="rehab-two-columns">
        <section
          className="panel"
          aria-labelledby="clinician-communication-title"
        >
          <h3 id="clinician-communication-title">
            <Activity size={22} aria-hidden="true" />
            Everyday communication
          </h3>
          <dl className="clinician-measures">
            <div>
              <dt>Reported understood after checking</dt>
              <dd>
                {communication.understood} / {communication.assessed} assessed{" "}
                {communication.rate === null
                  ? "(not measured)"
                  : `(${Math.round(communication.rate * 100)}%)`}
              </dd>
            </div>
            <div>
              <dt>Feedback coverage</dt>
              <dd>
                {communication.assessed} / {communication.eligible} eligible
                attempts
              </dd>
            </div>
            <div>
              <dt>Median taps to audio start</dt>
              <dd>
                {value(communication.taps.median)} · n={communication.taps.n}
              </dd>
            </div>
            <div>
              <dt>Median seconds to audio start</dt>
              <dd>
                {value(communication.seconds.median, "s")} · n=
                {communication.seconds.n}
              </dd>
            </div>
          </dl>
          <p className="muted">
            {communication.unassessed} attempts have no assessed feedback;{" "}
            {communication.excluded} demo-time or cached attempts excluded.
            Playback is not proof of understanding. Timing starts at attempt
            creation, and missing values are excluded.
          </p>
          <TapButton className="secondary-button print-hide" onActivate={onLog}>
            Open communication log <ArrowRight size={18} aria-hidden="true" />
          </TapButton>
        </section>
        <section className="panel" aria-labelledby="clinician-plan-title">
          <h3 id="clinician-plan-title">
            <ClipboardList size={22} aria-hidden="true" />
            Current plan & participation
          </h3>
          <p className="clinician-goal">
            <strong>
              {summary.thisWeek} / {data.profile.weeklyTarget}
            </strong>{" "}
            saved practice records this calendar week
          </p>
          <progress
            aria-label="Weekly practice record goal"
            value={Math.min(summary.thisWeek, data.profile.weeklyTarget)}
            max={data.profile.weeklyTarget}
          />
          <p className="muted">
            Week beginning {date(summary.weekFrom)} · all languages and methods
            · personal participation goal, not a prescribed dose. Rest and
            alternative communication count as valid choices.
          </p>
          {data.profile.goals.length ? (
            <ul>
              {data.profile.goals.map((goal, index) => (
                <li key={`${index}-${goal}`}>{goal}</li>
              ))}
            </ul>
          ) : (
            <p>
              No participation goals entered yet. Agree on goals with the
              person.
            </p>
          )}
          <details>
            <summary>Selected practice targets ({tasks.length})</summary>
            {tasks.length ? (
              <ul>
                {tasks.map((task, index) => (
                  <li key={`${index}-${task}`}>{task}</li>
                ))}
              </ul>
            ) : (
              <p>No practice targets selected.</p>
            )}
            {data.profile.clinicianInstructions && (
              <p>
                <strong>Recorded instructions:</strong>{" "}
                {data.profile.clinicianInstructions}
              </p>
            )}
          </details>
          <TapButton
            className="secondary-button print-hide"
            onActivate={() => onReview({ section: "plan" })}
          >
            Review individual plan <ArrowRight size={18} aria-hidden="true" />
          </TapButton>
        </section>
      </div>
      <section className="panel" aria-labelledby="clinician-queue-title">
        <div className="section-heading">
          <h3 id="clinician-queue-title">
            <FileCheck2 size={22} aria-hidden="true" />
            Review queue
          </h3>
          <span className="badge">{summary.pending.length} records</span>
        </div>
        <p>
          Records without a reviewer entry or with an entered transcript
          awaiting confirmation. Oldest first within this period; this is an
          administrative queue, not a clinical priority or urgency rating.
        </p>
        <label className="clinician-queue-filter print-hide">
          Show records
          <select
            value={queueFilter}
            onChange={(event) => {
              setQueueFilter(event.target.value as typeof queueFilter);
              setLimit(8);
            }}
          >
            <option value="all">All pending review</option>
            <option value="evidence">With available audio / video</option>
            <option value="transcript">Transcript needs confirmation</option>
          </select>
        </label>
        {queue.length ? (
          <ul className="clinician-queue">
            {queue
              .slice(0, limit)
              .map(
                ({
                  record,
                  needsReview,
                  needsTranscriptReview,
                  availableClips,
                }) => (
                  <li key={record.id}>
                    <div>
                      <span className="eyebrow">
                        {date(record.createdAt)} · {record.kind} ·{" "}
                        {record.language === "ta" ? "Tamil" : "English"}
                      </span>
                      <h4 lang={record.language}>{record.target}</h4>
                      <p>
                        {needsReview
                          ? "No reviewer entry yet"
                          : "Reviewer entry present"}
                        {needsTranscriptReview
                          ? " · transcript awaiting confirmation"
                          : ""}{" "}
                        · {availableClips} available clips
                      </p>
                    </div>
                    <TapButton
                      className="secondary-button print-hide"
                      aria-label={`Review record: ${record.target}`}
                      onActivate={() =>
                        onReview({
                          section: "record",
                          practiceId: record.id,
                          at: record.createdAt,
                        })
                      }
                    >
                      Review record <ArrowRight size={18} aria-hidden="true" />
                    </TapButton>
                  </li>
                ),
              )}
          </ul>
        ) : (
          <p className="notice">
            {summary.sessions.length
              ? "No records match this review filter in the selected period."
              : "No saved practice records in this period. Records appear after the person saves practice; recording is optional."}
          </p>
        )}
        {queue.length > limit && (
          <TapButton
            className="secondary-button print-hide"
            onActivate={() => setLimit((old) => old + 8)}
          >
            Show 8 more pending records
          </TapButton>
        )}
      </section>
      <section className="panel" aria-labelledby="clinician-readiness-title">
        <h3 id="clinician-readiness-title">
          <ShieldCheck size={22} aria-hidden="true" />
          Evidence & measurement coverage
        </h3>
        <dl className="clinician-measures">
          <div>
            <dt>Records with available evidence</dt>
            <dd>
              {summary.recordsWithEvidence} / {summary.sessions.length}
            </dd>
          </div>
          <div>
            <dt>Audio / video references available locally</dt>
            <dd>
              {summary.availableClips} available · {summary.missingClips}{" "}
              unavailable
            </dd>
          </div>
          <div>
            <dt>Practice response times recorded</dt>
            <dd>
              {summary.response.n} / {summary.sessions.length} · median{" "}
              {value(summary.response.median, "s")}
            </dd>
          </div>
          <div>
            <dt>Before / after fatigue pairs</dt>
            <dd>
              {summary.fatiguePairs} / {summary.sessions.length}
            </dd>
          </div>
        </dl>
        <p className="muted">
          Evidence is optional. Availability checks saved clip references, not
          recording quality or clinical validity. Text comparison does not
          measure pronunciation. Practice response time runs from task start to
          the first response marker, not speech onset; a rest restarts this
          timer. Missing measurements stay missing. Compare similar language,
          task and communication methods in the detailed report.
        </p>
        <div className="rehab-actions print-hide">
          <TapButton className="primary-button" onActivate={() => onReview()}>
            Open progress report <ArrowRight size={18} aria-hidden="true" />
          </TapButton>
          <TapButton
            className="secondary-button"
            onActivate={() => onReview({ section: "transfer" })}
          >
            Export or import a report
          </TapButton>
        </div>
      </section>
    </div>
  );
}

function OverviewStat({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="stat-card rehab-stat">
      <strong>{value}</strong>
      <span>{title}</span>
      <small>{detail}</small>
    </article>
  );
}
