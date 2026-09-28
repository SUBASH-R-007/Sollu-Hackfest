import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TapButton } from "../../ui";
import { weeklyReport, type TherapyReport } from "./report";
import { createTranscriptWordSummarizer } from "./wordAnalysis";

const percent = (value: number | null) =>
  value === null ? "Not measured" : `${(value * 100).toFixed(1)}%`;
const methodLabel = (value: string) => value.replaceAll("_", " ");

export default function WordAccuracyPanel({
  report,
  allowPractice = false,
}: {
  report: TherapyReport;
  allowPractice?: boolean;
}) {
  const [language, setLanguage] = useState("all");
  const [method, setMethod] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [summarize] = useState(createTranscriptWordSummarizer);
  const scoped = useMemo(
    () =>
      report.sessions.filter(
        (session) =>
          (language === "all" || session.language === language) &&
          (method === "all" || session.method === method),
      ),
    [report.sessions, language, method],
  );
  const summary = useMemo(() => summarize(scoped), [scoped, summarize]);
  const weeks = useMemo(
    () =>
      weeklyReport({ ...report, sessions: scoped }).map((week) => ({
        ...week,
        words: summarize(week.rows),
      })),
    [report, scoped, summarize],
  );
  const search = query.trim().normalize("NFKC").toLocaleLowerCase();
  const filtered = summary.words.filter(
    (word) => !search || word.word.includes(search),
  );
  const { coverage, totals } = summary;
  const methods = [
    ...new Set(report.sessions.map((session) => session.method)),
  ];
  function filterChanged() {
    setLimit(20);
  }
  return (
    <section className="panel" aria-labelledby="rehab-word-accuracy-title">
      <h3 id="rehab-word-accuracy-title">
        Reviewed word matches & transcript differences
      </h3>
      <p>
        These measurements compare reviewed transcripts with practice targets.
        An omission means a target word is absent from the aligned transcript; a
        substitution means a different word aligns there. They may reflect
        transcription, phrasing or speech differences. They do not identify a
        diagnosis, pronunciation error or degree of recovery.
      </p>
      <div className="rehab-form-grid print-hide">
        <label>
          Word analysis language
          <select
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value);
              filterChanged();
            }}
          >
            <option value="all">All languages — words remain separate</option>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
          </select>
        </label>
        <label>
          Word analysis method
          <select
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              filterChanged();
            }}
          >
            <option value="all">All methods — words remain separate</option>
            {methods.map((item) => (
              <option key={item} value={item}>
                {methodLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="stats-grid rehab-stats">
        <div className="stat-card rehab-stat">
          <span>Target-word match</span>
          <strong>{percent(summary.wordMatchRate)}</strong>
          <small>
            {totals.matches} matched / {totals.opportunities} target-word
            occurrences · {coverage.reviewedAligned} reviewed records
          </small>
        </div>
        <div className="stat-card rehab-stat">
          <span>Transcript differences</span>
          <strong>{totals.omissions + totals.substitutions}</strong>
          <small>
            {totals.omissions} omissions · {totals.substitutions} substitutions
            · {totals.insertions} extra transcript words
          </small>
        </div>
      </div>
      <p className="muted">
        Target-word match counts matching target words divided by all
        target-word occurrences. Extra transcript words are shown separately;
        they reduce the existing sentence text-match score. Repeated words count
        each occurrence. These two percentages have different denominators and
        are not clinical accuracy measures.
      </p>
      {!report.contentIncluded && (
        <p className="notice">
          This snapshot omits targets and transcripts. Word-level analysis
          cannot be reconstructed; existing sentence scores remain
          sender-supplied summary measurements.
        </p>
      )}
      <label className="print-hide">
        Find a target word
        <input
          type="search"
          value={query}
          maxLength={80}
          onChange={(event) => {
            setQuery(event.target.value);
            filterChanged();
          }}
        />
      </label>
      {filtered.length ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Reviewed word accuracy measurements"
        >
          <table className="attempt-table">
            <caption>
              Sorted by omission plus substitution occurrences, then number of
              opportunities. Each row keeps language and method separate. A
              single record cannot establish a trend.
            </caption>
            <thead>
              <tr>
                <th scope="col">Target word · language · method</th>
                <th scope="col">Matched / opportunities</th>
                <th scope="col">Match</th>
                <th scope="col">Omissions / substitutions</th>
                <th scope="col">Records / marked to revisit</th>
                <th scope="col">Last observed</th>
                {allowPractice && (
                  <th scope="col" className="print-hide">
                    Choose practice
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((word) => (
                <tr key={`${word.language}:${word.method}:${word.word}`}>
                  <th scope="row">
                    {word.word}{" "}
                    <small className="rehab-word-context">
                      {word.language} · {methodLabel(word.method)}
                    </small>
                  </th>
                  <td>
                    {word.matches} / {word.opportunities}
                  </td>
                  <td>{percent(word.matchRate)}</td>
                  <td>
                    {word.omissions} / {word.substitutions}
                  </td>
                  <td>
                    {word.records} / {word.markedRecords}
                  </td>
                  <td>{new Date(word.lastObservedAt).toLocaleDateString()}</td>
                  {allowPractice && (
                    <td className="print-hide">
                      {word.language === report.profile.language &&
                      word.method === report.profile.method &&
                      word.word.length <= 80 ? (
                        <Link
                          className="secondary-button"
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
                        </Link>
                      ) : (
                        "Different current plan"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          No reviewed target-word observations match these filters. Missing,
          unreviewed and AAC records are not counted as errors.
        </p>
      )}
      {filtered.length > limit && (
        <TapButton
          className="secondary-button print-hide"
          onActivate={() => setLimit((previous) => previous + 20)}
        >
          Show 20 more words
        </TapButton>
      )}
      {summary.inserted.length > 0 && (
        <details>
          <summary>Extra words in reviewed transcripts</summary>
          <p>
            Insertions have no target-word denominator. A repeated extra word
            can reflect a useful change in phrasing; review the recording and
            intended message before deciding what to practise.
          </p>
          <ul>
            {summary.inserted.slice(0, 20).map((word) => (
              <li key={`${word.language}:${word.method}:${word.word}`}>
                {word.word} ({word.language} · {methodLabel(word.method)}):{" "}
                {word.occurrences} occurrences in {word.records} records
              </li>
            ))}
          </ul>
          {summary.inserted.length > 20 && (
            <p>Showing the 20 most frequent extra words.</p>
          )}
        </details>
      )}
      <details>
        <summary>Weekly word observations & measurement coverage</summary>
        <p>
          Uses the language and method filters above; the word search only
          filters the word table. Weekly differences can reflect different
          targets, methods, support or transcription. Review comparable tasks
          before interpreting any change.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Weekly word measurements"
        >
          <table className="attempt-table">
            <thead>
              <tr>
                <th scope="col">Week of</th>
                <th scope="col">Reviewed records / total</th>
                <th scope="col">Matched / target words</th>
                <th scope="col">Target-word match</th>
                <th scope="col">Omissions / substitutions / extras</th>
                <th scope="col">Partner feedback</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.week}>
                  <th scope="row">{week.week}</th>
                  <td>
                    {week.words.coverage.reviewedAligned} / {week.count}
                  </td>
                  <td>
                    {week.words.totals.matches} /{" "}
                    {week.words.totals.opportunities}
                  </td>
                  <td>{percent(week.words.wordMatchRate)}</td>
                  <td>
                    {week.words.totals.omissions} /{" "}
                    {week.words.totals.substitutions} /{" "}
                    {week.words.totals.insertions}
                  </td>
                  <td>
                    {week.words.coverage.withPartnerFeedback} / {week.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {coverage.total} filtered records: {coverage.reviewedAligned} reviewed
          and usable for word analysis; {coverage.unreviewed} not reviewed;{" "}
          {coverage.unavailable} without usable included text/source;{" "}
          {coverage.aac} AAC tasks analysed separately.
        </p>
        <ul>
          <li>
            Response time recorded: {coverage.withResponseTime} /{" "}
            {coverage.total}.
          </li>
          <li>
            Partner understanding checked: {coverage.withPartnerFeedback} /{" "}
            {coverage.total}.
          </li>
          <li>
            Before-and-after fatigue ratings: {coverage.withPairedFatigue} /{" "}
            {coverage.total}.
          </li>
          <li>
            Recording evidence referenced: {coverage.withEvidence} /{" "}
            {coverage.total}. Recording is optional and its presence does not
            validate a score.
          </li>
        </ul>
      </details>
      <p className="print-hide">
        Use words the person wants to revisit in their individual practice plan.{" "}
        <Link to="/practice">Open communication practice</Link>.
      </p>
    </section>
  );
}
