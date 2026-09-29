import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Coffee,
  MessageCircle,
  Target,
} from "lucide-react";
import { PageTitle } from "../../ui";
import {
  CONDITION_PROFILES,
  COMMUNICATION_METHODS,
  exerciseInLanguage,
  type CommunicationMethod,
  type PracticeRecord,
  type RehabPlan,
  type RehabProfile,
} from "./model";
import { getRehabProfile, getRehabPlan, listPractice } from "./store";
import {
  practiceProgress,
  practiceWordSessions,
  type ProgressDays,
} from "./progress";
import { createTranscriptWordSummarizer } from "./wordAnalysis";
import { useProgressClock } from "./useProgressClock";
import "./hub.css";

const methodLabels: Record<CommunicationMethod, string> = {
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
const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString([], { month: "short", day: "numeric" });
const percent = (value: number | null) =>
  value === null ? "Not measured" : `${Math.round(value * 100)}%`;
const measurement = (value: number | null, suffix = "") =>
  value === null ? "Not recorded" : `${value.toFixed(1)}${suffix}`;

export default function RehabilitationHub() {
  const data = useLiveQuery(async () => {
    try {
      const [profile, plan, records] = await Promise.all([
        getRehabProfile(),
        getRehabPlan(),
        listPractice(),
      ]);
      return { profile, plan, records, error: null };
    } catch {
      return {
        error:
          "Your practice records could not be opened. Reload this page to try again.",
      };
    }
  }, []);
  if (!data) return <p role="status">Opening your rehabilitation…</p>;
  if (data.error || !data.profile || !data.plan || !data.records)
    return <p role="alert">{data.error}</p>;
  return <Hub profile={data.profile} plan={data.plan} records={data.records} />;
}

function Hub({
  profile,
  plan,
  records,
}: {
  profile: RehabProfile;
  plan: RehabPlan;
  records: PracticeRecord[];
}) {
  const [params] = useSearchParams();
  const tab = params.get("tab") === "progress" ? "progress" : "overview";
  const [days, setDays] = useState<ProgressDays>(7);
  const [language, setLanguage] = useState<"all" | "en" | "ta">("all");
  const [method, setMethod] = useState<"all" | CommunicationMethod>("all");
  const now = useProgressClock();
  const [summarizeWords] = useState(createTranscriptWordSummarizer);
  const overview = useMemo(
    () =>
      practiceProgress(
        records,
        { days: 7, language: "all", method: "all" },
        new Date(now),
      ),
    [records, now],
  );
  const progress = useMemo(
    () => practiceProgress(records, { days, language, method }, new Date(now)),
    [records, days, language, method, now],
  );
  const wordSessions = useMemo(() => {
    const sessions = practiceWordSessions(records);
    return new Map(records.map((record, index) => [record, sessions[index]]));
  }, [records]);
  const words = useMemo(
    () =>
      summarizeWords(
        tab === "progress"
          ? progress.records.map((record) => wordSessions.get(record)!)
          : [],
      ),
    [summarizeWords, wordSessions, progress.records, tab],
  );
  const revisit = words.words
    .filter((word) => word.omissions + word.substitutions > 0)
    .slice(0, 6);
  const condition = CONDITION_PROFILES.find(
    (item) => item.id === profile.condition,
  )!;
  const libraryTargets = [
    ...new Set(
      plan.exerciseIds.flatMap(
        (id) => exerciseInLanguage(id, profile.language) ?? [],
      ),
    ),
  ];
  const planTargets = [
    ...libraryTargets.map((exercise) => exercise.target),
    ...plan.customTargets,
  ];
  const weeklyPercent = Math.min(
    100,
    (overview.weekCount / profile.weeklyTarget) * 100,
  );
  const view = tab === "overview" ? overview : progress;
  return (
    <section className="rehabilitation-hub">
      <PageTitle
        eyebrow="Your communication, your pace"
        title="My rehabilitation"
        subtitle="Practise useful messages. See what you have recorded. Rest whenever you need."
      />
      <nav className="hub-view-tabs" aria-label="Rehabilitation views">
        <Link
          to="/rehabilitation?tab=overview"
          aria-current={tab === "overview" ? "page" : undefined}
        >
          <BookOpen size={22} aria-hidden="true" />
          Overview
        </Link>
        <Link
          to="/rehabilitation?tab=progress"
          aria-current={tab === "progress" ? "page" : undefined}
        >
          <ChartNoAxesCombined size={22} aria-hidden="true" />
          Progress
        </Link>
      </nav>
      {tab === "overview" ? (
        <>
          <div className="hub-hero">
            <div className="hub-hero-copy">
              <span className="hub-kicker">
                A little practice, when it suits you
              </span>
              <h2>Make room for your voice</h2>
              <p>
                Use speech, typing, pointing or a communication aid. Choose the
                method that feels comfortable today.
              </p>
              <Link className="hub-primary-link" to="/practice">
                <BookOpen size={23} aria-hidden="true" />
                Open my practice
                <ArrowRight size={22} aria-hidden="true" />
              </Link>
              <span className="hub-caption">
                You choose when to begin. Recording is optional.
              </span>
            </div>
            <section className="hub-week" aria-labelledby="hub-week-title">
              <CalendarDays size={28} aria-hidden="true" />
              <h2 id="hub-week-title">This week</h2>
              <p className="hub-week-total">
                {overview.weekCount} / {profile.weeklyTarget} saved practices
              </p>
              <progress
                value={Math.min(overview.weekCount, profile.weeklyTarget)}
                max={profile.weeklyTarget}
                aria-label="Weekly practice target"
              />
              <p>
                {weeklyPercent >= 100
                  ? "Your saved-practice target is reached. There is no need to do more."
                  : "This is your personal target. Change it with your caregiver or clinician when needed."}
              </p>
              <small>
                Since Monday, {dateLabel(overview.weekStart)} · all languages
                and methods. Each saved attempt counts once.
              </small>
            </section>
          </div>
          <div className="hub-two-columns">
            <section className="hub-card" aria-labelledby="hub-goals-title">
              <h2 id="hub-goals-title">
                <Target size={24} aria-hidden="true" />
                My communication goals
              </h2>
              {profile.goals.length ? (
                <ul className="hub-goals">
                  {profile.goals.map((goal, index) => (
                    <li key={`${index}-${goal}`}>{goal}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No personal goals are saved yet. Choose meaningful everyday
                  messages together with your caregiver or clinician.
                </p>
              )}
              <Link className="hub-text-link" to="/clinician?view=rehab">
                Review goals and practice plan
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </section>
            <section className="hub-card" aria-labelledby="hub-plan-title">
              <h2 id="hub-plan-title">
                <BookOpen size={24} aria-hidden="true" />
                My practice plan
              </h2>
              <p>
                {profile.language === "ta" ? "Tamil" : "English"} ·{" "}
                {methodLabels[profile.communicationMethod]}
              </p>
              <p>
                {profile.practiceMinutes}-minute planning guide. Stop sooner or
                take breaks whenever you wish.
              </p>
              {planTargets.length ? (
                <ul className="hub-plan-targets">
                  {planTargets.slice(0, 3).map((target, index) => (
                    <li key={`${index}-${target}`}>{target}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No targets are selected in this language. Add a useful message
                  in your practice plan.
                </p>
              )}
              {planTargets.length > 3 && (
                <small>
                  {planTargets.length - 3} more targets in your plan
                </small>
              )}
              {profile.clinicianInstructions && (
                <details>
                  <summary>Saved instructions</summary>
                  <p className="hub-preserve-lines">
                    {profile.clinicianInstructions}
                  </p>
                  <small>
                    Entered on this device; the author’s identity is not
                    verified.
                  </small>
                </details>
              )}
            </section>
          </div>
          <div className="hub-rest-note">
            <Coffee size={27} aria-hidden="true" />
            <div>
              <h2>Rest is part of your plan</h2>
              <p>{condition.caution}</p>
              <p>
                A blank day is simply a day with no saved practice. It is not a
                missed goal or a sign of decline.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <section
            className="hub-card hub-filter-card"
            aria-labelledby="hub-progress-title"
          >
            <h2 id="hub-progress-title">Your recorded progress</h2>
            <p>
              Choose the records to view. A change can reflect different tasks,
              support or transcription; it does not establish recovery.
            </p>
            <div className="hub-filters">
              <label>
                Progress period
                <select
                  value={days}
                  onChange={(event) =>
                    setDays(Number(event.target.value) as ProgressDays)
                  }
                >
                  <option value={7}>Last 7 days</option>
                  <option value={28}>Last 28 days</option>
                </select>
              </label>
              <label>
                Progress language
                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as typeof language)
                  }
                >
                  <option value="all">All languages</option>
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                </select>
              </label>
              <label>
                Progress method
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as typeof method)
                  }
                >
                  <option value="all">All methods</option>
                  {COMMUNICATION_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {methodLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="hub-caption">
              {dateLabel(progress.from)} – {dateLabel(progress.to)} · local
              dates, through now. All progress cards below follow these filters.
            </p>
          </section>
          <div
            className="hub-stat-grid"
            role="group"
            aria-label="Practice measurements"
          >
            <Metric
              title="Saved practices"
              value={String(progress.records.length)}
              detail="Each saved attempt counts once"
            />
            <Metric
              title="Active days"
              value={String(progress.activeDays)}
              detail={`of ${days} local calendar days`}
            />
            <Metric
              title="Response time"
              value={measurement(progress.response.median, " s")}
              detail={`Median · ${progress.response.n} recorded. Practice start to response marker, not speech onset; a rest resets timing.`}
            />
            <Metric
              title="Partner reported understanding"
              value={percent(progress.understanding.rate)}
              detail={`${progress.understanding.yes} yes / ${progress.understanding.known} checked · ${progress.understanding.unknown} not checked`}
            />
          </div>
          {!progress.records.length && (
            <div className="hub-empty" role="status">
              <BookOpen size={28} aria-hidden="true" />
              <h2>No saved practice in this view</h2>
              <p>
                Try another filter or save a practice when you are ready.
                Missing records are not failures.
              </p>
              <Link className="hub-text-link" to="/practice">
                Open practice
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </div>
          )}
        </>
      )}
      <section className="hub-card" aria-labelledby="hub-calendar-title">
        <div className="hub-section-heading">
          <div>
            <h2 id="hub-calendar-title">
              <CalendarDays size={24} aria-hidden="true" />
              Practice days
            </h2>
            <p>
              {tab === "overview" ? "Last 7 days" : `Last ${days} days`} ·
              number of saved attempts each day
            </p>
          </div>
          {tab === "overview" && (
            <Link className="hub-text-link" to="/rehabilitation?tab=progress">
              Explore progress
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          )}
        </div>
        <ol className="hub-calendar" aria-label="Daily saved practices">
          {view.calendar.map((day) => (
            <li key={day.day} className={day.count ? "has-practice" : ""}>
              <time dateTime={day.day}>
                {new Date(day.at).toLocaleDateString([], { weekday: "short" })}
                <strong>{dateLabel(day.at)}</strong>
              </time>
              <span>{day.count} saved</span>
            </li>
          ))}
        </ol>
      </section>
      {tab === "progress" && (
        <>
          <div className="hub-two-columns">
            <section className="hub-card" aria-labelledby="hub-comfort-title">
              <h2 id="hub-comfort-title">
                <Coffee size={24} aria-hidden="true" />
                Energy and effort
              </h2>
              <p>
                Recorded ratings from 0 (none) to 10 (most). These are
                observations, not a readiness score.
              </p>
              <dl className="hub-ratings">
                <Rating
                  label="Average fatigue before"
                  data={progress.fatigueBefore}
                />
                <Rating
                  label="Average fatigue after"
                  data={progress.fatigueAfter}
                />
                <Rating label="Average effort" data={progress.effort} />
              </dl>
              <p className="hub-caption">
                Different records may supply each average. Follow your comfort
                and individual plan.
              </p>
            </section>
            <section
              className="hub-card"
              aria-labelledby="hub-understanding-title"
            >
              <h2 id="hub-understanding-title">
                <MessageCircle size={24} aria-hidden="true" />
                Communicating together
              </h2>
              <dl className="hub-ratings">
                <div>
                  <dt>Partner’s feedback</dt>
                  <dd>
                    {progress.understanding.yes} understood ·{" "}
                    {progress.understanding.partly} partly ·{" "}
                    {progress.understanding.no} not understood
                  </dd>
                </div>
                <div>
                  <dt>Your own feedback</dt>
                  <dd>
                    {progress.selfUnderstanding.yes} understood /{" "}
                    {progress.selfUnderstanding.known} checked ·{" "}
                    {progress.selfUnderstanding.unknown} not checked
                  </dd>
                </div>
                <div>
                  <dt>AAC tasks completed</dt>
                  <dd>
                    {progress.aac.completed} / {progress.aac.assessed} checked ·{" "}
                    {progress.aac.total - progress.aac.assessed} not checked
                  </dd>
                </div>
                <div>
                  <dt>Records with saved evidence</dt>
                  <dd>
                    {progress.evidenceRecords} / {progress.records.length}{" "}
                    practices
                  </dd>
                </div>
              </dl>
              <p className="hub-caption">
                Partly understood stays in the checked denominator. Audio and
                video are optional; they do not verify understanding.
              </p>
            </section>
          </div>
          <section className="hub-card" aria-labelledby="hub-words-title">
            <div className="hub-section-heading">
              <div>
                <h2 id="hub-words-title">Words to revisit</h2>
                <p>
                  Reviewed target words with transcript differences. Choose
                  words that are useful to you.
                </p>
              </div>
              <div className="hub-word-rate">
                <strong>{percent(words.wordMatchRate)}</strong>
                <span>
                  {words.totals.matches} / {words.totals.opportunities} target
                  words matched
                </span>
              </div>
            </div>
            <p className="hub-caption">
              {words.coverage.reviewedAligned} reviewed comparisons ·{" "}
              {words.coverage.unreviewed} unreviewed · {words.coverage.aac} AAC
              · {words.coverage.unavailable} unavailable. Text matching does not
              measure pronunciation or diagnose a speech error.
            </p>
            {revisit.length ? (
              <ul className="hub-word-list">
                {revisit.map((word) => (
                  <li key={`${word.language}-${word.method}-${word.word}`}>
                    <div>
                      <strong lang={word.language}>{word.word}</strong>
                      <p>
                        {word.omissions} absent · {word.substitutions} different
                        · {word.opportunities} target occurrences
                      </p>
                      <small>
                        {word.language === "ta" ? "Tamil" : "English"} ·{" "}
                        {methodLabels[word.method]}
                      </small>
                    </div>
                    {word.language === profile.language &&
                    word.method === profile.communicationMethod &&
                    word.word.length <= 80 ? (
                      <Link
                        className="hub-small-action"
                        to="/practice"
                        state={{
                          practiceTarget: {
                            target: word.word,
                            language: word.language,
                            method: word.method,
                            kind: "word",
                          },
                        }}
                        aria-label={`Practise ${word.word}`}
                      >
                        Practise
                        <ArrowRight size={20} aria-hidden="true" />
                      </Link>
                    ) : (
                      <small>Review with the matching plan</small>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No reviewed word differences in this view. Unreviewed,
                unavailable and AAC transcripts are not counted as errors.
              </p>
            )}
          </section>
        </>
      )}
      <section className="hub-card" aria-labelledby="hub-recent-title">
        <h2 id="hub-recent-title">Recent practice</h2>
        <p>
          {tab === "overview" ? "Last 7 days" : "In the selected period"} · up
          to 5 latest saved attempts
        </p>
        {view.records.length ? (
          <ol className="hub-timeline">
            {view.records.slice(0, 5).map((record) => (
              <li key={record.id}>
                <time dateTime={new Date(record.createdAt).toISOString()}>
                  {new Date(record.createdAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                <h3 lang={record.language}>{record.target}</h3>
                <p>
                  {record.kind === "aac"
                    ? "AAC practice"
                    : `${record.kind[0].toUpperCase()}${record.kind.slice(1)} practice`}{" "}
                  · {methodLabels[record.communicationMethod]}
                </p>
                <span>
                  Partner: {understandingLabels[record.partnerUnderstanding]}
                </span>
                {record.mediaIds.length > 0 && (
                  <small> · Evidence saved on this device</small>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="hub-empty-copy">
            Your saved attempts will appear here. Start with one useful message
            when you feel ready.
          </p>
        )}
      </section>
      <footer className="hub-footer">
        <p>
          Based on records saved in this browser. Counts and comparisons support
          discussion with your care team; they are not clinical outcome
          measures.
        </p>
        <Link className="hub-text-link" to="/clinician">
          Open clinician dashboard
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}

function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="hub-metric">
      <h3>{title}</h3>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
function Rating({
  label,
  data,
}: {
  label: string;
  data: { n: number; value: number | null };
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {measurement(data.value, " / 10")}
        <small>{data.n} recorded</small>
      </dd>
    </div>
  );
}
