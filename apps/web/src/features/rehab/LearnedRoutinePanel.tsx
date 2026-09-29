import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Search, Save, X } from "lucide-react";
import type { RoutineItem } from "@sollu/shared";
import { db } from "../../db";
import { useApp } from "../../state";
import { TapButton } from "../../ui";
import { timeBucket } from "../../lib/context";
import { friendlyError } from "./model";
import {
  SettingsCard,
  SettingsField,
  SettingsToggle,
} from "../settings/Controls";
import {
  confirmLearnedRoutine,
  CONTEXT_DAYPART_LABELS,
  ROUTINE_LOOKBACK_DAYS,
  ROUTINE_SCAN_LIMIT,
  suggestLearnedRoutines,
  type LearnedRoutineSuggestion,
} from "./learnedRoutines";

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const places = ["home", "outside", "other"] as const;
type Draft = Pick<RoutineItem, "label" | "time" | "days" | "place">;

export function LearnedRoutines() {
  const { settings, updateSettings, caregiverUnlocked } = useApp();
  const [suggestions, setSuggestions] = useState<LearnedRoutineSuggestion[]>(
    [],
  );
  const [selected, setSelected] = useState<LearnedRoutineSuggestion | null>(
    null,
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState("");
  const [scanCount, setScanCount] = useState(0);

  async function scan() {
    if (!caregiverUnlocked || busy) return;
    setBusy(true);
    setMessage("");
    setSelected(null);
    setDraft(null);
    try {
      const now = Date.now();
      const attempts = await db.attempts
        .where("startedAt")
        .aboveOrEqual(now - ROUTINE_LOOKBACK_DAYS * 86400000)
        .reverse()
        .limit(ROUTINE_SCAN_LIMIT)
        .toArray();
      setSuggestions(suggestLearnedRoutines(attempts, settings.routines, now));
      setScanCount(attempts.length);
      setScanned(true);
    } catch {
      setMessage("Local communication history could not be read. Try again.");
    } finally {
      setBusy(false);
    }
  }
  function edit(suggestion: LearnedRoutineSuggestion) {
    setSelected(suggestion);
    setDraft({
      label: suggestion.label,
      time: suggestion.time,
      days: [...suggestion.days],
      place: suggestion.place,
    });
    setReviewed(false);
    setMessage("");
  }
  function change(patch: Partial<Draft>) {
    setDraft((previous) => previous && { ...previous, ...patch });
    setReviewed(false);
    setMessage("");
  }
  async function save() {
    if (!caregiverUnlocked || !selected || !draft || busy) return;
    setBusy(true);
    setMessage("");
    try {
      // Re-read the source evidence before saving so deleted/corrected logs cannot
      // silently validate a stale suggestion that has remained open on screen.
      const now = Date.now();
      const attempts = await db.attempts
        .where("startedAt")
        .aboveOrEqual(now - ROUTINE_LOOKBACK_DAYS * 86400000)
        .reverse()
        .limit(ROUTINE_SCAN_LIMIT)
        .toArray();
      const current = suggestLearnedRoutines(
        attempts,
        settings.routines,
        now,
      ).find((item) => item.key === selected.key);
      if (!current)
        throw new Error(
          "This pattern changed or is already saved. Review the local patterns again.",
        );
      const routine = confirmLearnedRoutine(
        current,
        draft,
        reviewed,
        settings.routines,
      );
      await updateSettings({ routines: [...settings.routines, routine] });
      setSuggestions((previous) =>
        previous.filter((item) => item.key !== selected.key),
      );
      setSelected(null);
      setDraft(null);
      setReviewed(false);
      setMessage(
        "Reviewed routine saved on this device. Your existing context-sharing permissions still apply.",
      );
    } catch (error) {
      setMessage(
        friendlyError(error, "The routine could not be saved. Try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsCard title="Learn from everyday communication">
        <p>
          Review repeated, understood choices from this device. A pattern needs
          at least three different dates in the same half-hour, place and
          everyday topic. It is a suggestion to review together, not proof of a
          daily need.
        </p>
        <p className="settings-feature-muted">
          This check runs only when you choose it. It reads up to{" "}
          {ROUTINE_SCAN_LIMIT} recent communication records from the last{" "}
          {ROUTINE_LOOKBACK_DAYS} days. Demo messages, clinical messages,
          refusals, uncertain statements and practice recordings are excluded.
          It never learns from an unchosen fragment.
        </p>
        {settings.demo && (
          <p className="notice">
            Demo clock is currently on. Its messages do not teach routines.
            Switch to the device clock for everyday communication.
          </p>
        )}
        <TapButton
          disabled={busy || !caregiverUnlocked}
          onActivate={() => {
            void scan();
          }}
        >
          <Search />
          {busy ? "Checking…" : "Review local communication patterns"}
        </TapButton>
        {scanned && (
          <p className="settings-feature-muted">
            Checked {scanCount} local records.{" "}
            {suggestions.length
              ? "Review a suggestion below; nothing has been activated."
              : "No new eligible patterns. Continue ordinary communication, or add a routine manually. Repeated requests alone do not establish a routine."}
          </p>
        )}
        {suggestions.length > 0 && (
          <ul
            className="context-routine-list"
            aria-label="Suggested routines from communication"
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion.key}>
                <div className="context-routine-copy">
                  <strong>{suggestion.label}</strong>
                  <span>
                    {CONTEXT_DAYPART_LABELS[suggestion.timeBucket]} · around{" "}
                    {suggestion.time} · {suggestion.place}
                  </span>
                  <span>
                    {suggestion.count} understood choices across{" "}
                    {suggestion.dates.length} dates
                  </span>
                  <span>Dates: {suggestion.dates.join(", ")}</span>
                  <span>Example chosen message: {suggestion.example}</span>
                </div>
                <TapButton disabled={busy} onActivate={() => edit(suggestion)}>
                  Review {suggestion.label}
                </TapButton>
              </li>
            ))}
          </ul>
        )}
        {selected && draft && (
          <div
            className="context-routine-editor"
            role="group"
            aria-label="Review learned routine"
          >
            <p>
              Check the activity, approximate time, place and days with the
              person. Observed dates do not imply that this happens every week.
            </p>
            <div className="settings-feature-grid">
              <SettingsField label="Learned routine label">
                <input
                  maxLength={120}
                  value={draft.label}
                  onChange={(event) => change({ label: event.target.value })}
                />
              </SettingsField>
              <SettingsField label="Learned routine time">
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) => change({ time: event.target.value })}
                />
              </SettingsField>
              <SettingsField label="Learned routine place">
                <select
                  value={draft.place}
                  onChange={(event) =>
                    change({ place: event.target.value as Draft["place"] })
                  }
                >
                  {places.map((place) => (
                    <option key={place} value={place}>
                      {place === "home"
                        ? "Home"
                        : place === "outside"
                          ? "Outside"
                          : "Other"}
                    </option>
                  ))}
                </select>
              </SettingsField>
            </div>
            <fieldset className="context-weekdays">
              <legend>Reviewed weekdays</legend>
              {weekdays.map((day, index) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={draft.days.includes(index)}
                    onChange={(event) =>
                      change({
                        days: event.target.checked
                          ? [...draft.days, index]
                          : draft.days.filter((value) => value !== index),
                      })
                    }
                  />
                  {day}
                </label>
              ))}
            </fieldset>
            <SettingsToggle checked={reviewed} onChange={setReviewed}>
              We reviewed these details together and want this routine used as a
              context clue.
            </SettingsToggle>
            <div className="settings-feature-actions">
              <TapButton
                className="primary"
                disabled={busy || !reviewed || !caregiverUnlocked}
                onActivate={() => {
                  void save();
                }}
              >
                <Save />
                Save reviewed routine
              </TapButton>
              <TapButton
                disabled={busy}
                onActivate={() => {
                  setSelected(null);
                  setDraft(null);
                  setReviewed(false);
                }}
              >
                <X />
                Cancel review
              </TapButton>
            </div>
          </div>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <p className="settings-feature-muted">
          Only a reviewed label, schedule and place become routine context.
          Saving does not enable cloud sharing. Remove a learned routine in
          Weekly routines to stop using it; a new local check will need your
          review again.
        </p>
      </SettingsCard>
      <SettingsCard title="Connect communication and practice">
        <p>
          <CalendarClock aria-hidden="true" /> Device daypart:{" "}
          <strong>
            {CONTEXT_DAYPART_LABELS[timeBucket(new Date().getHours())]}
          </strong>
          . Everyday communication and practice are tracked separately.
        </p>
        <p>
          Use meaningful everyday messages in your practice plan. Choose a
          comfortable time and rest when needed. Practice recordings, diagnoses,
          fatigue ratings and therapist notes are not included in
          sentence-engine context.
        </p>
        <Link to="/practice" className="tap">
          Open communication practice
        </Link>
      </SettingsCard>
    </>
  );
}
