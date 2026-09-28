import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { topics, type RoutineItem } from "@sollu/shared";
import type { Settings } from "../../db";
import {
  clockNow,
  getNearbyRoutines,
  isSampleRoutine,
} from "../../lib/context";
import { useApp } from "../../state";
import { TapButton } from "../../ui";
import { SettingsCard, SettingsField, SettingsToggle } from "./Controls";
import "./context-settings.css";

const places = [
  ["home", "Home"],
  ["clinic", "Clinic"],
  ["hospital", "Hospital"],
  ["outside", "Outside"],
  ["other", "Other"],
] as const;
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const contextFields = [
  "useTimeContext",
  "usePlaceContext",
  "useRoutineContext",
  "routineWindowMinutes",
  "demo",
  "demoTime",
  "demoSetAt",
  "place",
  "sharePersonalContext",
] as const;
type ContextPreferences = Pick<Settings, (typeof contextFields)[number]>;
function preferences(settings: Settings): ContextPreferences {
  return Object.fromEntries(
    contextFields.map((key) => [key, settings[key]]),
  ) as ContextPreferences;
}
function blankRoutine(): RoutineItem {
  return {
    id: crypto.randomUUID(),
    label: "",
    topic: "food",
    time: "13:00",
    days: [0, 1, 2, 3, 4, 5, 6],
    source: "caregiver",
    confirmed: false,
  };
}
function placeLabel(place: Settings["place"] | undefined) {
  return places.find(([id]) => id === place)?.[1] ?? "Any place";
}
function dayLabel(days: number[]) {
  return days.length === 7
    ? "Every day"
    : [...days]
        .sort((a, b) => a - b)
        .map((day) => weekdays[day]!.slice(0, 3))
        .join(", ");
}
function relativeTime(minutesAway: number) {
  const minutes = Math.round(minutesAway);
  if (minutes === 0) return "Around now";
  return minutes > 0 ? `In ${minutes} min` : `${Math.abs(minutes)} min ago`;
}

export function ContextSettings() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState(() => preferences(settings));
  const [realNow, setRealNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<RoutineItem | null>(null);
  const [routineMessage, setRoutineMessage] = useState("");
  const [deleted, setDeleted] = useState<RoutineItem | null>(null);
  const editorRef = useRef<HTMLInputElement>(null);
  const previewSettings = { ...settings, ...draft };
  const now = clockNow(previewSettings, realNow);
  const nearby = getNearbyRoutines(previewSettings, now);
  const editingExisting = Boolean(
    editing && settings.routines.some((routine) => routine.id === editing.id),
  );
  useEffect(() => {
    const timer = window.setInterval(() => setRealNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing?.id]);

  function change<K extends keyof ContextPreferences>(
    key: K,
    value: ContextPreferences[K],
  ) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "demo" || key === "demoTime"
        ? { demoSetAt: Date.now() }
        : {}),
    }));
    setMessage("");
    setRealNow(Date.now());
  }
  async function saveContext() {
    if (!timePattern.test(draft.demoTime)) {
      setMessage("Choose a valid demo starting time.");
      return;
    }
    setBusy(true);
    try {
      const next = {
        ...draft,
        demoSetAt:
          draft.demo !== settings.demo || draft.demoTime !== settings.demoTime
            ? Date.now()
            : settings.demoSetAt,
      };
      await updateSettings(next);
      setDraft(next);
      setRealNow(Date.now());
      setMessage("Context settings saved on this device.");
    } catch {
      setMessage("Context settings could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function editRoutine(routine: RoutineItem) {
    setEditing({ ...routine, days: [...routine.days], confirmed: false });
    setRoutineMessage("");
  }
  function changeRoutine<K extends keyof RoutineItem>(
    key: K,
    value: RoutineItem[K],
  ) {
    setEditing(
      (previous) =>
        previous && {
          ...previous,
          [key]: value,
          ...(key !== "confirmed" ? { confirmed: false } : {}),
        },
    );
    setRoutineMessage("");
  }
  async function saveRoutine() {
    if (!editing) return;
    if (
      !editing.label.trim() ||
      editing.label.trim().length > 120 ||
      !timePattern.test(editing.time) ||
      !editing.days.length
    ) {
      setRoutineMessage(
        "Enter an activity, a valid time and at least one day.",
      );
      return;
    }
    if (!editingExisting && settings.routines.length >= 32) {
      setRoutineMessage(
        "This device can save up to 32 routines. Edit or remove one first.",
      );
      return;
    }
    const next = {
      ...editing,
      label: editing.label.trim(),
      days: [...new Set(editing.days)].sort((a, b) => a - b),
      source: "caregiver" as const,
      ...(editing.confirmed ? { isSample: false } : {}),
    };
    const duplicate = settings.routines.some(
      (routine) =>
        routine.id !== next.id &&
        routine.label.trim().toLocaleLowerCase() ===
          next.label.toLocaleLowerCase() &&
        routine.time === next.time &&
        routine.place === next.place &&
        routine.days.some((day) => next.days.includes(day)),
    );
    if (duplicate) {
      setRoutineMessage(
        "This activity is already saved at that time and place on one of these days. Edit the existing routine.",
      );
      return;
    }
    setBusy(true);
    try {
      await updateSettings({
        routines: editingExisting
          ? settings.routines.map((routine) =>
              routine.id === next.id ? next : routine,
            )
          : [...settings.routines, next],
      });
      setEditing(null);
      setDeleted(null);
      setRoutineMessage(
        next.confirmed
          ? "Routine saved and available as a context clue."
          : "Routine saved for review. It will not be used until reviewed together.",
      );
    } catch {
      setRoutineMessage("The routine could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function removeRoutine(routine: RoutineItem) {
    setBusy(true);
    try {
      await updateSettings({
        routines: settings.routines.filter((item) => item.id !== routine.id),
      });
      if (editing?.id === routine.id) setEditing(null);
      setDeleted(routine);
      setRoutineMessage(`Removed ${routine.label}. You can undo this below.`);
    } catch {
      setRoutineMessage("The routine could not be removed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function undoDelete() {
    if (!deleted || settings.routines.length >= 32) return;
    setBusy(true);
    try {
      await updateSettings({ routines: [...settings.routines, deleted] });
      setRoutineMessage(`Restored ${deleted.label}.`);
      setDeleted(null);
    } catch {
      setRoutineMessage("The routine could not be restored. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-feature-stack context-settings">
      <SettingsCard title="Give a few words more context">
        <p>
          Time, the selected place and familiar routines can help suggest a
          possible meaning. A routine is a clue, not proof of what the person
          wants. They still choose the exact sentence.
        </p>
        <SettingsToggle
          checked={draft.useTimeContext}
          onChange={(value) => change("useTimeContext", value)}
        >
          Use current time for sentence suggestions
        </SettingsToggle>
        <SettingsToggle
          checked={draft.usePlaceContext}
          onChange={(value) => change("usePlaceContext", value)}
        >
          Use the selected place for sentence suggestions
        </SettingsToggle>
        <SettingsToggle
          checked={draft.useRoutineContext}
          onChange={(value) => change("useRoutineContext", value)}
        >
          Use reviewed routines for sentence suggestions
        </SettingsToggle>
        <div className="settings-feature-grid">
          <SettingsField label="Current place">
            <select
              value={draft.place}
              onChange={(event) =>
                change("place", event.target.value as Settings["place"])
              }
            >
              {places.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Routine time window">
            <select
              value={draft.routineWindowMinutes}
              onChange={(event) =>
                change(
                  "routineWindowMinutes",
                  Number(
                    event.target.value,
                  ) as Settings["routineWindowMinutes"],
                )
              }
            >
              <option value={15}>15 minutes before or after</option>
              <option value={45}>45 minutes before or after</option>
              <option value={90}>90 minutes before or after</option>
            </select>
          </SettingsField>
        </div>
        <p className="settings-feature-muted">
          Place is selected manually. Sollu does not track GPS. Routines with a
          specific place are used only when place context is enabled and that
          place matches.
        </p>
        <div className="settings-feature-grid">
          <SettingsField label="Clock source">
            <select
              value={draft.demo ? "demo" : "real"}
              onChange={(event) =>
                change("demo", event.target.value === "demo")
              }
            >
              <option value="real">Device clock · everyday use</option>
              <option value="demo">
                Demo clock · practice with sample inputs
              </option>
            </select>
          </SettingsField>
          <SettingsField label="Demo starting time">
            <input
              type="time"
              disabled={!draft.demo}
              value={draft.demoTime}
              onChange={(event) => change("demoTime", event.target.value)}
            />
          </SettingsField>
        </div>
        <p className="settings-feature-muted">
          Changing the demo clock starts it from the saved time. Other context
          changes keep the current clock running. Switch to the device clock for
          everyday use.
        </p>
      </SettingsCard>
      <SettingsCard title="Preview of these settings">
        <p className="settings-feature-muted">
          This preview includes your unsaved changes. Save context settings to
          apply them.
        </p>
        <div className="context-preview-facts">
          <div>
            <CalendarClock aria-hidden="true" />
            <span>
              {draft.demo ? "Demo clock" : "Device clock"}
              <strong>
                {now.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}{" "}
                · {weekdays[now.getDay()]}
              </strong>
              {!draft.useTimeContext && <small>Time context is off</small>}
            </span>
          </div>
          <div>
            <MapPin aria-hidden="true" />
            <span>
              Selected place<strong>{placeLabel(draft.place)}</strong>
              {!draft.usePlaceContext && <small>Place context is off</small>}
            </span>
          </div>
        </div>
        <div className="context-nearby" aria-label="Nearby routine preview">
          <h3>Nearby routines</h3>
          {!draft.useRoutineContext ? (
            <p>Routine context is off.</p>
          ) : !draft.useTimeContext ? (
            <p>Enable time context to match routines to the current time.</p>
          ) : nearby.length ? (
            <ul>
              {nearby.map(({ routine, minutesAway }) => (
                <li key={routine.id}>
                  <strong>
                    {routine.label}
                    {isSampleRoutine(routine) ? " · demo sample" : ""}
                  </strong>
                  <span>
                    {routine.time} · {relativeTime(minutesAway)} ·{" "}
                    {placeLabel(routine.place)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No reviewed routines match this time, day and place.</p>
          )}
        </div>
        <p className="settings-feature-muted">
          Demo previews may include fictional sample routines. Nearby activities
          can help interpret a fragment. They never confirm a symptom, a dose,
          an activity completed or a message to speak automatically.
        </p>
      </SettingsCard>
      <SettingsCard title="Choose what the sentence engine receives">
        <SettingsToggle
          checked={draft.sharePersonalContext}
          onChange={(value) => change("sharePersonalContext", value)}
        >
          Use personal context and communication preferences
        </SettingsToggle>
        <p>
          Turn this on to include enabled place and routine clues, familiar
          people, vocabulary, approved phrasing and communication preferences in
          sentence requests. This is the same permission as in Personalize.
        </p>
        <p className="settings-feature-muted">
          With a cloud sentence engine, this information is sent through the
          Sollu server to that provider after cloud text sharing is enabled.
          When this permission is off, personal clues remain on this device for
          the free vocabulary fallback. Enabled time context may still be sent.
          Saving routines does not enable sharing.
        </p>
      </SettingsCard>
      <div className="settings-feature-actions">
        <TapButton
          className="primary"
          disabled={busy}
          onActivate={() => {
            void saveContext();
          }}
        >
          <Save />
          {busy ? "Saving…" : "Save context settings"}
        </TapButton>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <SettingsCard title={`Weekly routines · ${settings.routines.length}/32`}>
        <p>
          Start with activities that matter to this person. The initial routines
          are fictional examples; review or replace them together. These are
          communication clues, not medication reminders or treatment
          instructions.
        </p>
        <p className="settings-feature-muted">
          Routine changes save immediately. Editing a routine asks for a fresh
          review before it can be used.
        </p>
        {settings.routines.length ? (
          <ul className="context-routine-list" aria-label="Saved routines">
            {[...settings.routines]
              .sort(
                (a, b) =>
                  a.time.localeCompare(b.time) ||
                  a.label.localeCompare(b.label),
              )
              .map((routine) => (
                <li key={routine.id}>
                  <div className="context-routine-copy">
                    <strong>{routine.label}</strong>
                    <span>
                      {routine.time} · {dayLabel(routine.days)} ·{" "}
                      {placeLabel(routine.place)}
                    </span>
                    <span>
                      {topics.find((topic) => topic.id === routine.topic)?.en ??
                        routine.topic}{" "}
                      ·{" "}
                      {isSampleRoutine(routine)
                        ? "Sample routine · review together"
                        : routine.confirmed
                          ? "Reviewed together"
                          : "Awaiting review · not used"}
                    </span>
                  </div>
                  <div className="settings-feature-actions">
                    <TapButton
                      disabled={busy}
                      aria-label={`Edit routine: ${routine.label}`}
                      onActivate={() => editRoutine(routine)}
                    >
                      <Pencil />
                      Edit
                    </TapButton>
                    <TapButton
                      disabled={busy}
                      aria-label={`Delete routine: ${routine.label}`}
                      onActivate={() => {
                        void removeRoutine(routine);
                      }}
                    >
                      <Trash2 />
                      Delete
                    </TapButton>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <p>No routines saved. Add one below.</p>
        )}
        <TapButton
          disabled={busy || settings.routines.length >= 32}
          onActivate={() => {
            setEditing(blankRoutine());
            setRoutineMessage("");
          }}
        >
          <Plus />
          Add routine
        </TapButton>
        {settings.routines.length >= 32 && (
          <p className="settings-feature-muted">
            You have reached 32 routines. Edit or remove a routine to make
            space.
          </p>
        )}
        {editing && (
          <div
            className="context-routine-editor"
            role="group"
            aria-label="Routine editor"
          >
            <h3>{editingExisting ? "Edit routine" : "New routine"}</h3>
            <SettingsField label="Activity">
              <input
                ref={editorRef}
                maxLength={120}
                value={editing.label}
                placeholder="For example: Tea in the garden"
                onChange={(event) => changeRoutine("label", event.target.value)}
              />
            </SettingsField>
            <div className="settings-feature-grid">
              <SettingsField label="Routine topic">
                <select
                  value={editing.topic}
                  onChange={(event) =>
                    changeRoutine(
                      "topic",
                      event.target.value as RoutineItem["topic"],
                    )
                  }
                >
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.en}
                    </option>
                  ))}
                </select>
              </SettingsField>
              <SettingsField label="Routine time">
                <input
                  type="time"
                  value={editing.time}
                  onChange={(event) =>
                    changeRoutine("time", event.target.value)
                  }
                />
              </SettingsField>
              <SettingsField label="Routine place">
                <select
                  value={editing.place ?? ""}
                  onChange={(event) =>
                    changeRoutine(
                      "place",
                      event.target.value
                        ? (event.target.value as Settings["place"])
                        : undefined,
                    )
                  }
                >
                  <option value="">Any place</option>
                  {places.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </SettingsField>
            </div>
            <fieldset className="context-weekdays">
              <legend>Days of the week · choose at least one</legend>
              {weekdays.map((day, index) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={editing.days.includes(index)}
                    onChange={(event) =>
                      changeRoutine(
                        "days",
                        event.target.checked
                          ? [...editing.days, index]
                          : editing.days.filter((value) => value !== index),
                      )
                    }
                  />
                  <span>{day}</span>
                </label>
              ))}
            </fieldset>
            <SettingsToggle
              checked={editing.confirmed}
              onChange={(value) => changeRoutine("confirmed", value)}
            >
              Reviewed with the person
            </SettingsToggle>
            <p className="settings-feature-muted">
              Confirm the activity, days, time and place together. You can save
              an unreviewed routine; it will stay out of sentence suggestions.
            </p>
            <div className="settings-feature-actions">
              <TapButton
                className="primary"
                disabled={busy}
                onActivate={() => {
                  void saveRoutine();
                }}
              >
                <Save />
                Save routine
              </TapButton>
              <TapButton
                disabled={busy}
                onActivate={() => {
                  setEditing(null);
                  setRoutineMessage("");
                }}
              >
                Cancel routine edit
              </TapButton>
            </div>
          </div>
        )}
        {routineMessage && (
          <p className="notice" role="status">
            {routineMessage}
          </p>
        )}
        {deleted && (
          <TapButton
            disabled={busy || settings.routines.length >= 32}
            onActivate={() => {
              void undoDelete();
            }}
          >
            <Undo2 />
            Undo delete: {deleted.label}
          </TapButton>
        )}
      </SettingsCard>
    </div>
  );
}
