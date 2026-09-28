import { scoreTranscript, speechWords, type TranscriptScore } from "./analysis";
import type { ReportSession } from "./report";

export interface WordObservation {
  word: string;
  language: ReportSession["language"];
  method: ReportSession["method"];
  opportunities: number;
  matches: number;
  omissions: number;
  substitutions: number;
  records: number;
  markedRecords: number;
  lastObservedAt: number;
  matchRate: number;
}

export interface InsertedWord {
  word: string;
  language: ReportSession["language"];
  method: ReportSession["method"];
  occurrences: number;
  records: number;
}

type WordScore = Pick<TranscriptScore, "matchPct" | "alignment">;

/** Component-scoped weak caching avoids repeating token alignment for weekly views and filters.
 * Old report rows can be collected; nothing is persisted or retained in a global patient cache.
 * Only alignment is retained, not the dynamic-programming matrix or duplicate error arrays.
 */
export function createTranscriptWordSummarizer(score = scoreTranscript) {
  const cache = new WeakMap<
    ReportSession,
    { target: string; transcript: string; value: WordScore }
  >();
  return (sessions: ReportSession[]) =>
    summarizeWords(sessions, (session) => {
      const target = session.target!,
        transcript = session.transcript!;
      const previous = cache.get(session);
      if (previous?.target === target && previous.transcript === transcript)
        return previous.value;
      const { matchPct, alignment } = score(target, transcript);
      const value = { matchPct, alignment };
      cache.set(session, { target, transcript, value });
      return value;
    });
}

/** A transcript comparison is not evidence that the speaker made an acoustic error. */
export function transcriptWordSummary(sessions: ReportSession[]) {
  return summarizeWords(sessions, (session) =>
    scoreTranscript(session.target!, session.transcript!),
  );
}

function summarizeWords(
  sessions: ReportSession[],
  scoreFor: (session: ReportSession) => WordScore,
) {
  const unique = new Map<string, ReportSession>();
  for (const session of sessions) {
    const previous = unique.get(session.id);
    if (!previous || previous.at < session.at) unique.set(session.id, session);
  }
  const rows = [...unique.values()];
  const coverage = {
    total: rows.length,
    aac: 0,
    unreviewed: 0,
    unavailable: 0,
    reviewedAligned: 0,
    withResponseTime: 0,
    withPartnerFeedback: 0,
    withPairedFatigue: 0,
    withEvidence: 0,
  };
  const words = new Map<string, WordObservation & { ids: Set<string> }>();
  const inserted = new Map<string, InsertedWord & { ids: Set<string> }>();
  const totals = {
    opportunities: 0,
    matches: 0,
    omissions: 0,
    substitutions: 0,
    insertions: 0,
  };
  for (const session of rows) {
    if (session.responseSeconds !== null) coverage.withResponseTime++;
    if (session.partnerUnderstanding !== "unknown")
      coverage.withPartnerFeedback++;
    if (session.fatigueBefore !== null && session.fatigueAfter !== null)
      coverage.withPairedFatigue++;
    if (session.media.length) coverage.withEvidence++;
    if (session.kind === "aac" || session.method === "aac") {
      coverage.aac++;
      continue;
    }
    if (!session.transcriptReviewed) {
      coverage.unreviewed++;
      continue;
    }
    if (
      session.transcriptSource === "none" ||
      session.target === undefined ||
      session.transcript === undefined
    ) {
      coverage.unavailable++;
      continue;
    }
    const score = scoreFor(session);
    if (score.matchPct === null) {
      coverage.unavailable++;
      continue;
    }
    coverage.reviewedAligned++;
    const marked = new Set(
      session.missedWords.flatMap((word) => {
        const tokens = speechWords(word);
        return tokens.length === 1 ? tokens : [];
      }),
    );
    for (const aligned of score.alignment) {
      if (aligned.kind === "insertion") {
        const word = aligned.heard!;
        const key = JSON.stringify([session.language, session.method, word]);
        const entry = inserted.get(key) ?? {
          word,
          language: session.language,
          method: session.method,
          occurrences: 0,
          records: 0,
          ids: new Set<string>(),
        };
        entry.occurrences++;
        entry.ids.add(session.id);
        inserted.set(key, entry);
        totals.insertions++;
        continue;
      }
      const word = aligned.expected!;
      const key = JSON.stringify([session.language, session.method, word]);
      const entry = words.get(key) ?? {
        word,
        language: session.language,
        method: session.method,
        opportunities: 0,
        matches: 0,
        omissions: 0,
        substitutions: 0,
        records: 0,
        markedRecords: 0,
        lastObservedAt: 0,
        matchRate: 0,
        ids: new Set<string>(),
      };
      entry.opportunities++;
      totals.opportunities++;
      const metric =
        aligned.kind === "match"
          ? "matches"
          : aligned.kind === "omission"
            ? "omissions"
            : "substitutions";
      entry[metric]++;
      totals[metric]++;
      if (!entry.ids.has(session.id) && marked.has(word)) entry.markedRecords++;
      entry.ids.add(session.id);
      entry.lastObservedAt = Math.max(entry.lastObservedAt, session.at);
      words.set(key, entry);
    }
  }
  return {
    coverage,
    totals,
    wordMatchRate: totals.opportunities
      ? totals.matches / totals.opportunities
      : null,
    words: [...words.values()]
      .map(({ ids, ...entry }) => ({
        ...entry,
        records: ids.size,
        matchRate: entry.matches / entry.opportunities,
      }))
      .sort(
        (a, b) =>
          b.omissions + b.substitutions - (a.omissions + a.substitutions) ||
          b.opportunities - a.opportunities ||
          a.word.localeCompare(b.word),
      ),
    inserted: [...inserted.values()]
      .map(({ ids, ...entry }) => ({ ...entry, records: ids.size }))
      .sort(
        (a, b) => b.occurrences - a.occurrences || a.word.localeCompare(b.word),
      ),
  };
}
