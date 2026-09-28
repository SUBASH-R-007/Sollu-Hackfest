import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Hand,
  MessageCircle,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { db } from "../db";
import { attemptsCsv, download, isStruggle, metrics } from "../lib/metrics";
import { Back, Empty, PageTitle, TapButton } from "../ui";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateTime = (at: number) =>
  new Date(at).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Therapist() {
  const attempts = useLiveQuery(
    () => db.attempts.orderBy("startedAt").reverse().toArray(),
    [],
  );
  const [startDate, setStartDate] = useState(() => localDate(new Date()));
  const [endDate, setEndDate] = useState(() => localDate(new Date()));
  const [studyMode, setStudyMode] = useState(true);
  const [exportStatus, setExportStatus] = useState("");
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  const visible = useMemo(() => {
    if (invalidRange) return [];
    const start = startDate
      ? new Date(`${startDate}T00:00:00`).getTime()
      : -Infinity;
    const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
    end?.setDate(end.getDate() + 1);
    return (attempts ?? []).filter(
      (attempt) =>
        attempt.startedAt >= start &&
        attempt.startedAt < (end?.getTime() ?? Infinity),
    );
  }, [attempts, startDate, endDate, invalidRange]);
  const summary = metrics(visible);
  const struggles = visible.filter(isStruggle);
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: struggles.filter(
      (attempt) => new Date(attempt.startedAt).getHours() === hour,
    ).length,
  }));
  const highestHour = Math.max(1, ...hourly.map((item) => item.count));

  function exportCsv() {
    download(
      new Blob([attemptsCsv(visible, studyMode)], {
        type: "text/csv;charset=utf-8;",
      }),
      `sollu-communication-${startDate || "all"}-${endDate || "all"}${studyMode ? "-study" : ""}.csv`,
    );
    setExportStatus(
      `${visible.length} attempts exported. Keep the file somewhere private.`,
    );
  }

  const statCards = [
    {
      label: "Confirmed understood",
      value: visible.filter((a) => a.communicationOutcome === "understood")
        .length,
      icon: <CheckCircle2 size={22} aria-hidden="true" />,
    },
    {
      label: "Attempts",
      value: summary.total,
      icon: <MessageCircle size={22} aria-hidden="true" />,
    },
    {
      label: "Spoken",
      value: summary.spoken,
      icon: <CheckCircle2 size={22} aria-hidden="true" />,
    },
    {
      label: "Needed another try",
      value: summary.struggles,
      icon: <BarChart3 size={22} aria-hidden="true" />,
    },
    {
      label: "None of these",
      value: summary.none,
      icon: <MessageCircle size={22} aria-hidden="true" />,
    },
    {
      label: "Median taps",
      value: summary.spoken ? summary.medianTaps.toFixed(1) : "—",
      icon: <Hand size={22} aria-hidden="true" />,
    },
    {
      label: "Median seconds",
      value: summary.spoken ? `${summary.medianSeconds.toFixed(1)}s` : "—",
      icon: <Clock3 size={22} aria-hidden="true" />,
    },
  ];

  return (
    <section className="therapist-page">
      <Back to="/settings" label="Caregiver settings" />
      <PageTitle
        eyebrow="Small moments, useful patterns"
        title="Communication log."
        subtitle="A record of choices and moments that needed another try. For conversation and support, never a clinical assessment."
        action={
          <TapButton
            className="secondary-button print-hide"
            onActivate={() => window.print()}
          >
            <Printer size={20} aria-hidden="true" />
            Print
          </TapButton>
        }
      />
      <div className="privacy-caption">
        <ShieldCheck size={17} aria-hidden="true" />
        <span>
          Stored in this browser. Nothing on this page is sent to a therapist or
          server.
        </span>
      </div>
      <div className="date-filter panel print-hide">
        <label htmlFor="log-start">
          From
          <input
            id="log-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label htmlFor="log-end">
          To
          <input
            id="log-end"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <TapButton
          className="secondary-button"
          onActivate={() => {
            const today = localDate(new Date());
            setStartDate(today);
            setEndDate(today);
          }}
        >
          Today
        </TapButton>
        <TapButton
          className="secondary-button"
          onActivate={() => {
            setStartDate("");
            setEndDate("");
          }}
        >
          All dates
        </TapButton>
      </div>
      {invalidRange && (
        <p role="alert" className="notice error-notice">
          Choose a start date on or before the end date.
        </p>
      )}
      {attempts === undefined ? (
        <p role="status">Loading the local communication log…</p>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <span className="stat-icon">{stat.icon}</span>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
          <p className="muted">
            Tap and time medians use spoken attempts. Mock, demo-time and cached
            entries remain labelled below; these numbers are not a clinical
            outcome measure. “Confirmed understood” records the person’s
            explicit choice after checking with their partner; playback and
            delivery alone do not count.
          </p>
          {!visible.length ? (
            <Empty icon="🌱" title="Every conversation starts somewhere">
              There are no recorded attempts in this date range. After the
              person chooses a sentence or leaves an attempt, it can appear
              here.
            </Empty>
          ) : (
            <>
              <section className="panel" aria-labelledby="struggle-chart-title">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">When another try helped</span>
                    <h2 id="struggle-chart-title">Struggles by hour</h2>
                  </div>
                  <span className="muted">
                    Local clock · {struggles.length} total
                  </span>
                </div>
                <p>
                  A struggle means a retry, a rejected set, an unfinished
                  attempt, or more than 30 seconds before speech.
                </p>
                <div
                  className="hourly-chart"
                  role="list"
                  aria-label="Struggles by local hour"
                >
                  {hourly.map((item) => (
                    <div
                      className="hourly-column"
                      role="listitem"
                      key={item.hour}
                      aria-label={`${String(item.hour).padStart(2, "0")}:00, ${item.count} struggles`}
                    >
                      <span className="hourly-count" aria-hidden="true">
                        {item.count || ""}
                      </span>
                      <span className="hourly-track" aria-hidden="true">
                        <span
                          className="hourly-bar"
                          style={{
                            height: `${(item.count / highestHour) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="hourly-label" aria-hidden="true">
                        {String(item.hour).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel" aria-labelledby="struggle-list-title">
                <h2 id="struggle-list-title">Moments to talk about</h2>
                {struggles.length ? (
                  <div className="struggle-list">
                    {struggles.slice(0, 10).map((attempt) => (
                      <article className="struggle-card" key={attempt.id}>
                        <div className="section-heading">
                          <span className="eyebrow">
                            {attempt.modality} · {dateTime(attempt.startedAt)}
                          </span>
                          <span className="badge">
                            {attempt.outcome === "spoken"
                              ? "Found their words"
                              : "Not yet spoken"}
                          </span>
                        </div>
                        <h3>{attempt.fragmentRaw || "Topic / quick phrase"}</h3>
                        {attempt.chosenText && (
                          <p lang={attempt.outputLang}>{attempt.chosenText}</p>
                        )}
                        <p className="muted">
                          {
                            attempt.rounds.filter((round) => round.noneOfThese)
                              .length
                          }{" "}
                          rejected sets · {attempt.sttRetries} speech retries ·{" "}
                          {attempt.taps} taps
                        </p>
                        {attempt.rounds
                          .filter((round) => round.noneOfThese)
                          .map((round, index) => (
                            <details key={`${round.round}-${index}`}>
                              <summary>
                                Sentences they did not choose · round{" "}
                                {round.round}
                              </summary>
                              <ul>
                                {round.candidates.map(
                                  (candidate, candidateIndex) => (
                                    <li
                                      key={`${candidate.text}-${candidateIndex}`}
                                      lang={attempt.outputLang}
                                    >
                                      {candidate.text}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </details>
                          ))}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No struggles recorded in this range.</p>
                )}
                {struggles.length > 10 && (
                  <p className="muted">
                    Showing the ten most recent moments. The CSV includes all
                    attempts in this date range.
                  </p>
                )}
              </section>
              <section className="panel" aria-labelledby="attempts-title">
                <h2 id="attempts-title">Recent attempts</h2>
                <div className="table-scroll">
                  <table className="attempt-table">
                    <caption>
                      {visible.length} attempts in the selected range; latest 50
                      shown
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">When / input</th>
                        <th scope="col">Words</th>
                        <th scope="col">Outcome</th>
                        <th scope="col">Taps / time</th>
                        <th scope="col">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.slice(0, 50).map((attempt) => (
                        <tr key={attempt.id}>
                          <td>
                            {dateTime(attempt.startedAt)}
                            <small>{attempt.modality}</small>
                          </td>
                          <td>
                            <span lang={attempt.outputLang}>
                              {attempt.chosenText || attempt.fragmentRaw || "—"}
                            </span>
                            {attempt.chosenGloss &&
                              attempt.chosenGloss !== attempt.chosenText && (
                                <small>{attempt.chosenGloss}</small>
                              )}
                          </td>
                          <td>
                            {attempt.outcome === "spoken"
                              ? "Spoken"
                              : attempt.outcome === "topics_fallback"
                                ? "Moved to Topics"
                                : "Left unfinished"}
                          </td>
                          <td>
                            {attempt.taps} taps
                            <small>
                              {attempt.timeToSpeechMs === undefined
                                ? "No audio start"
                                : `${(attempt.timeToSpeechMs / 1000).toFixed(1)}s`}
                            </small>
                          </td>
                          <td>
                            {attempt.demoCached && (
                              <span className="badge">CACHED</span>
                            )}
                            {attempt.demoClock && (
                              <span className="badge">Demo time</span>
                            )}
                            {attempt.rounds.some(
                              (round) =>
                                round.model?.toLowerCase().includes("mock") ||
                                round.source === "mock",
                            ) && <span className="badge">Mock</span>}
                            {attempt.offline && (
                              <span className="badge">Offline</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <section
            className="panel export-panel print-hide"
            aria-labelledby="export-title"
          >
            <h2 id="export-title">Take the log with you</h2>
            <p>
              CSV files are readable by anyone who has the file. Share only with
              people you choose.
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={studyMode}
                onChange={(event) => setStudyMode(event.target.checked)}
              />
              Study export: leave out raw fragments and contact names
            </label>
            <p className="muted">
              Study exports use a fixed participant code and include dates,
              input language, outcomes and measured counts. They are not
              encrypted or guaranteed anonymous.
            </p>
            {!studyMode && (
              <p className="notice">
                Raw fragments may include people’s names or other personal
                details. Review the file before sharing it.
              </p>
            )}
            <TapButton
              className="primary-button"
              disabled={!visible.length || invalidRange}
              onActivate={exportCsv}
            >
              <Download size={21} aria-hidden="true" />
              Export CSV
            </TapButton>
            <p role="status">{exportStatus}</p>
          </section>
        </>
      )}
    </section>
  );
}
