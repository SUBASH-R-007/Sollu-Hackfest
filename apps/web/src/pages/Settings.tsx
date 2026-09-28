import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Check,
  BrainCircuit,
  Copy,
  Link2,
  Mic,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import {
  candidate,
  defaultPhrases,
  quickPhrases,
  type Lang,
} from "@sollu/shared";
import {
  db,
  getKV,
  hashPin,
  recordingId,
  setKV,
  type Consent,
  type Settings as UserSettings,
} from "../db";
import { api } from "../lib/api";
import { createPairing } from "../lib/relay";
import { useApp } from "../state";
import { Back, Hint, PageTitle, TapButton } from "../ui";
import { audio, type VoiceInfo } from "../features/audio";
import { startPhraseRecording, type PhraseRecorder } from "../features/voice";
import { MemoryPanel, OfflinePanel } from "./Communication";
import { BackupPanel } from "./Support";
import {
  LlmSettings,
  type LlmConfiguration,
} from "../features/settings/LlmSettings";
import { PersonalizationSettings } from "../features/settings/Personalization";

const sections = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "personalize", label: "Personalize", icon: SlidersHorizontal },
  { id: "llm", label: "Sentence engine", icon: BrainCircuit },
  { id: "voice", label: "Voice Studio", icon: Mic },
  { id: "link", label: "Link phones", icon: Link2 },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
] as const;
type Section = (typeof sections)[number]["id"];
const fieldStyle = {
  width: "100%",
  minHeight: 56,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #9b8ba7",
  background: "#fff",
  color: "var(--ink)",
  font: "inherit",
} as const;
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: 20,
} as const;
const rowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      className="settings-field"
      style={{ display: "grid", alignContent: "start", gap: 8 }}
    >
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className="setting-toggle"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        minHeight: 72,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
          accentColor: "var(--brand)",
        }}
      />
      <span>{children}</span>
    </label>
  );
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="settings-card panel"
      style={{
        display: "grid",
        gap: 18,
        padding: 24,
        border: "1px solid var(--line)",
        borderRadius: 20,
        background: "#fff",
      }}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function General() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState(settings);
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void getKV<string>("accessCode").then((value) =>
      setAccessCode(value ?? ""),
    );
  }, []);
  const change = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));
  async function save() {
    if (!draft.name.trim()) {
      setMessage("Enter the person’s preferred name.");
      return;
    }
    if (draft.demo && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.demoTime)) {
      setMessage("Choose a valid starting time for the demo clock.");
      return;
    }
    if (pin && (!/^\d{4}$/.test(pin) || pin !== pinAgain)) {
      setMessage("Use the same four-digit PIN in both fields.");
      return;
    }
    setSaving(true);
    try {
      const next = {
        ...draft,
        name: draft.name.trim(),
        demoSetAt: Date.now(),
        ...(pin ? { pinHash: await hashPin(pin) } : {}),
      };
      await updateSettings(next);
      await setKV("accessCode", accessCode);
      setDraft(next);
      setPin("");
      setPinAgain("");
      setMessage("Settings saved on this device.");
    } catch {
      setMessage("Settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="settings-stack" style={{ display: "grid", gap: 24 }}>
      <Card title="Make Sollu feel familiar">
        <div style={gridStyle}>
          <Field label="Preferred name">
            <input
              style={fieldStyle}
              maxLength={80}
              value={draft.name}
              onChange={(event) => change("name", event.target.value)}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Primary language">
            <select
              style={fieldStyle}
              value={draft.lang}
              onChange={(event) => change("lang", event.target.value as Lang)}
            >
              <option value="ta">தமிழ் · Tamil</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Preferred hand">
            <select
              style={fieldStyle}
              value={draft.hand}
              onChange={(event) =>
                change("hand", event.target.value as "left" | "right")
              }
            >
              <option value="left">Left hand</option>
              <option value="right">Right hand</option>
            </select>
          </Field>
          <Field label="Text size">
            <select
              style={fieldStyle}
              value={draft.textScale}
              onChange={(event) =>
                change(
                  "textScale",
                  Number(event.target.value) as 1 | 1.25 | 1.5,
                )
              }
            >
              <option value={1}>Comfortable</option>
              <option value={1.25}>Large</option>
              <option value={1.5}>Extra large</option>
            </select>
          </Field>
          <Field label="Usual place">
            <select
              style={fieldStyle}
              value={draft.place}
              onChange={(event) =>
                change("place", event.target.value as UserSettings["place"])
              }
            >
              {["home", "clinic", "hospital", "outside", "other"].map(
                (place) => (
                  <option key={place}>{place}</option>
                ),
              )}
            </select>
          </Field>
        </div>
        <div style={gridStyle}>
          <Toggle
            checked={draft.keepLeft}
            onChange={(value) => change("keepLeft", value)}
          >
            Keep important controls on the left
          </Toggle>
          <Toggle
            checked={draft.highContrast}
            onChange={(value) => change("highContrast", value)}
          >
            High contrast
          </Toggle>
          <Toggle
            checked={draft.showGloss}
            onChange={(value) => change("showGloss", value)}
          >
            Show the English meaning under Tamil
          </Toggle>
          <Toggle
            checked={draft.twoStep}
            onChange={(value) => change("twoStep", value)}
          >
            Select a sentence, then tap it again to speak
          </Toggle>
        </div>
      </Card>
      <Card title="Comfort & access">
        <div style={gridStyle}>
          <Field label="Choices shown at once">
            <select
              style={fieldStyle}
              value={draft.choiceCount}
              onChange={(e) =>
                change("choiceCount", Number(e.target.value) as 1 | 2 | 3)
              }
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ignore repeated taps within">
            <select
              style={fieldStyle}
              value={draft.tapFilterMs}
              onChange={(e) => change("tapFilterMs", Number(e.target.value))}
            >
              {[200, 400, 600, 800].map((n) => (
                <option key={n} value={n}>
                  {n} ms
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pause before speech input finishes">
            <select
              style={fieldStyle}
              value={draft.pauseSeconds}
              onChange={(e) => change("pauseSeconds", Number(e.target.value))}
            >
              {[3, 5, 8].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </select>
          </Field>
          <Field label="Device speech speed">
            <select
              style={fieldStyle}
              value={draft.speechRate}
              onChange={(e) => change("speechRate", Number(e.target.value))}
            >
              <option value={0.7}>Slower</option>
              <option value={0.9}>Steady</option>
              <option value={1}>Normal</option>
            </select>
          </Field>
          <Field label="Speaker gender (optional)">
            <select
              style={fieldStyle}
              value={draft.speakerGender}
              onChange={(e) =>
                change(
                  "speakerGender",
                  e.target.value as UserSettings["speakerGender"],
                )
              }
            >
              <option value="unspecified">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Dialect or wording preference (optional)">
            <input
              style={fieldStyle}
              maxLength={120}
              value={draft.dialectNote}
              onChange={(e) => change("dialectNote", e.target.value)}
            />
          </Field>
          <Toggle
            checked={draft.quietMode}
            onChange={(v) => change("quietMode", v)}
          >
            Quiet screen: fewer labels and no decorative motion
          </Toggle>
        </div>
      </Card>
      <Card title="People close to you">
        <p>
          These optional phone numbers are used only when you choose Send SMS.
        </p>
        <div style={gridStyle}>
          {draft.contacts
            .filter((contact) => contact.isCaregiver)
            .map((contact) => (
              <Field key={contact.id} label={`${contact.name} · phone number`}>
                <input
                  type="tel"
                  style={fieldStyle}
                  maxLength={30}
                  placeholder="Optional"
                  value={contact.phone ?? ""}
                  onChange={(event) =>
                    change(
                      "contacts",
                      draft.contacts.map((person) =>
                        person.id === contact.id
                          ? { ...person, phone: event.target.value }
                          : person,
                      ),
                    )
                  }
                />
              </Field>
            ))}
        </div>
      </Card>
      <Card title="Demo and measured comparison">
        <Toggle
          checked={draft.demo}
          onChange={(value) => change("demo", value)}
        >
          Use the labelled demo clock and sample inputs
        </Toggle>
        <Field label="Demo starting time">
          <input
            style={fieldStyle}
            type="time"
            disabled={!draft.demo}
            value={draft.demoTime}
            onChange={(event) => change("demoTime", event.target.value)}
          />
        </Field>
        <Toggle
          checked={draft.stage}
          onChange={(value) => change("stage", value)}
        >
          Show measured taps and time on screen
        </Toggle>
        <p>
          Saving restarts the demo clock at this time. The counter reports the
          actual interaction.
        </p>
      </Card>
      <Card title="Caregiver access">
        <div style={gridStyle}>
          <Field label="New four-digit caregiver PIN (optional)">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              style={fieldStyle}
              maxLength={4}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <Field label="Repeat new PIN">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              style={fieldStyle}
              maxLength={4}
              value={pinAgain}
              onChange={(event) =>
                setPinAgain(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
        </div>
        <Field label="Server access code (only if your server requires one)">
          <input
            style={fieldStyle}
            type="password"
            autoComplete="off"
            value={accessCode}
            maxLength={200}
            onChange={(event) => setAccessCode(event.target.value)}
          />
        </Field>
        <p>
          The PIN keeps caregiver controls separate. It does not encrypt the
          device’s database.
        </p>
      </Card>
      <TapButton
        className="primary full"
        disabled={saving}
        onActivate={() => {
          void save();
        }}
      >
        <Save />
        <span>{saving ? "Saving…" : "Save settings"}</span>
      </TapButton>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function VoiceStudio() {
  const { settings } = useApp();
  const [lang, setLang] = useState<Lang>(settings.lang);
  const [phrase, setPhrase] = useState(quickPhrases[settings.lang].help.text);
  const [custom, setCustom] = useState(false);
  const [owner, setOwner] = useState(settings.name);
  const [givenBy, setGivenBy] = useState<Consent["givenBy"]>("self");
  const [consented, setConsented] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [state, setState] = useState<
    "idle" | "opening" | "recording" | "saving"
  >("idle");
  const [message, setMessage] = useState("");
  const [voices, setVoices] = useState<VoiceInfo[]>(audio.getVoices(lang));
  const [withdraw, setWithdraw] = useState(false);
  const recorder = useRef<PhraseRecorder | null>(null);
  const epoch = useRef(0);
  const saved = useLiveQuery(() => db.recordings.toArray()) ?? [];
  const options = [
    ...Object.values(quickPhrases[lang]),
    ...defaultPhrases[lang],
  ];
  const canRecord =
    consented &&
    owner.trim().length > 0 &&
    phrase.trim().length > 0 &&
    state === "idle";
  const busy = state !== "idle";
  useEffect(() => {
    setVoices(audio.getVoices(lang));
    const timer = setTimeout(() => setVoices(audio.getVoices(lang)), 800);
    return () => clearTimeout(timer);
  }, [lang]);
  useEffect(
    () => () => {
      epoch.current += 1;
      recorder.current?.cancel();
      audio.stop();
    },
    [],
  );
  function resetDraft() {
    setBlob(null);
    setReviewed(false);
    setMessage("");
    audio.stop();
  }
  async function start() {
    if (!canRecord) return;
    resetDraft();
    setState("opening");
    const run = ++epoch.current;
    try {
      const next = await startPhraseRecording();
      if (run !== epoch.current) {
        next.cancel();
        return;
      }
      recorder.current = next;
      setState("recording");
      setMessage("Recording. Say only the exact sentence shown below.");
    } catch (error) {
      if (run === epoch.current) {
        setState("idle");
        setMessage(
          error instanceof Error
            ? error.message
            : "The microphone could not start.",
        );
      }
    }
  }
  async function finish() {
    if (!recorder.current) return;
    const run = epoch.current;
    const current = recorder.current;
    recorder.current = null;
    try {
      const result = await current.stop();
      if (run === epoch.current) {
        setBlob(result);
        setState("idle");
        setMessage("Recording ready. Listen, check the words, then save.");
      }
    } catch (error) {
      if (run === epoch.current) {
        setState("idle");
        setMessage(
          error instanceof Error
            ? error.message
            : "Please try recording again.",
        );
      }
    }
  }
  function cancel() {
    epoch.current += 1;
    recorder.current?.cancel();
    recorder.current = null;
    setState("idle");
    resetDraft();
  }
  async function preview(
    event: Event,
    text: string,
    language: Lang,
    recording?: Blob,
    consentId?: string,
  ) {
    const ticket = audio.createTap(event, text, {
      role: "caregiver",
      surface: "studio",
    });
    if (consentId !== undefined) {
      try {
        if (!(await db.consents.get(consentId))) {
          setMessage(
            "This recording no longer has active consent and cannot be played.",
          );
          return;
        }
      } catch {
        setMessage(
          "Consent could not be checked. This recording has not been played.",
        );
        return;
      }
    }
    const result = await audio.speak({
      text,
      lang: language,
      ticket,
      channel: "studio",
      recording,
      onStart: () =>
        setMessage(
          recording
            ? "Playing the saved recording…"
            : "Playing a device voice…",
        ),
    });
    if (result.status === "completed") setMessage("Preview finished.");
    else if (result.status === "expired")
      setMessage("Audio was not ready in time. Tap Listen again.");
    else if (result.status === "unavailable")
      setMessage(
        "A device voice for this language is not installed. A saved recording can still play.",
      );
    else if (result.status !== "cancelled")
      setMessage("The preview could not play. Please try another recording.");
  }
  async function save() {
    if (!blob || !reviewed || !consented || !owner.trim() || !phrase.trim())
      return;
    setState("saving");
    const text = phrase.trim();
    const consent: Consent = {
      id: crypto.randomUUID(),
      name: owner.trim(),
      givenBy,
      at: Date.now(),
      scope: "recorded_phrases",
    };
    try {
      await db.transaction(
        "rw",
        [db.consents, db.recordings, db.phrases],
        async () => {
          await db.consents.put(consent);
          await db.recordings.put({
            id: recordingId(text, lang),
            text,
            lang,
            blob,
            consentId: consent.id,
            createdAt: Date.now(),
          });
          if (custom)
            await db.phrases.put({
              id: recordingId(text, lang),
              lang,
              pinned: true,
              candidate: candidate(text, text, "saved phrase", "💬"),
            });
        },
      );
      setBlob(null);
      setReviewed(false);
      setMessage(
        "Exact phrase saved. It is ready in My phrases or the matching quick button.",
      );
    } catch {
      setMessage("The recording could not be saved. Please try again.");
    } finally {
      setState("idle");
    }
  }
  async function remove(id: string) {
    audio.stop();
    try {
      await db.recordings.delete(id);
      setMessage(
        "Recording deleted from this device. The text remains available.",
      );
    } catch {
      setMessage("The recording could not be deleted. Please try again.");
    }
  }
  async function withdrawAll() {
    cancel();
    try {
      await db.transaction("rw", [db.recordings, db.consents], async () => {
        await db.recordings.clear();
        await db.consents.clear();
      });
      setConsented(false);
      setWithdraw(false);
      setMessage(
        "All recorded-phrase consent and saved voice recordings have been removed from this device.",
      );
    } catch {
      setMessage("The recordings could not be removed. Please try again.");
    }
  }
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Hint>
        Free own-voice phrases: record each exact sentence once. Sollu replays
        that recording when the person chooses the same sentence. This does not
        create a generative voice clone.
      </Hint>
      <Card title="1. The voice owner’s permission">
        <Field label="Whose voice is this?">
          <input
            style={fieldStyle}
            disabled={busy}
            value={owner}
            maxLength={80}
            onChange={(event) => {
              setOwner(event.target.value);
              setConsented(false);
              resetDraft();
            }}
          />
        </Field>
        <Field label="How consent is given">
          <select
            style={fieldStyle}
            disabled={busy}
            value={givenBy}
            onChange={(event) => {
              setGivenBy(event.target.value as Consent["givenBy"]);
              setConsented(false);
              resetDraft();
            }}
          >
            <option value="self">The person agrees themselves</option>
            <option value="self_supported">
              The person agrees with communication support
            </option>
            <option value="voice_donor">
              A consenting family member donates their voice
            </option>
          </select>
        </Field>
        <Toggle
          checked={consented}
          onChange={(value) => {
            if (!busy) {
              setConsented(value);
              if (!value) resetDraft();
            }
          }}
        >
          The named voice owner agrees to record and store these exact phrases
          on this device and replay them when chosen. They can withdraw consent
          and delete them at any time.
        </Toggle>
      </Card>
      <Card title="2. Record one exact sentence">
        <div style={gridStyle}>
          <Field label="Recording language">
            <select
              style={fieldStyle}
              disabled={busy}
              value={lang}
              onChange={(event) => {
                const next = event.target.value as Lang;
                setLang(next);
                setPhrase(quickPhrases[next].help.text);
                setCustom(false);
                resetDraft();
              }}
            >
              <option value="ta">தமிழ் · Tamil</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Choose a sentence">
            <select
              style={fieldStyle}
              disabled={busy}
              value={custom ? "__custom__" : phrase}
              onChange={(event) => {
                const next = event.target.value;
                setCustom(next === "__custom__");
                setPhrase(next === "__custom__" ? "" : next);
                resetDraft();
              }}
            >
              {options.map((option) => (
                <option key={option.text} value={option.text}>
                  {option.text}
                </option>
              ))}
              <option value="__custom__">
                Write an exact personal phrase…
              </option>
            </select>
          </Field>
        </div>
        {custom && (
          <Field label="Exact sentence to record">
            <textarea
              style={fieldStyle}
              rows={3}
              disabled={busy}
              maxLength={500}
              value={phrase}
              onChange={(event) => {
                setPhrase(event.target.value);
                resetDraft();
              }}
            />
          </Field>
        )}
        <blockquote
          className="studio-sentence"
          lang={lang}
          style={{
            padding: 22,
            margin: 0,
            borderRadius: 16,
            background: "var(--lavender)",
            fontSize: "1.45rem",
            fontWeight: 600,
          }}
        >
          {phrase || "Write the sentence you want to keep."}
        </blockquote>
        <p>
          Record one consenting speaker in a quiet place. Say this sentence
          exactly. The audio stays on this device.
        </p>
        <div style={rowStyle}>
          {state === "recording" ? (
            <TapButton
              className="stop-button"
              onActivate={() => {
                void finish();
              }}
            >
              <Square />
              Stop recording
            </TapButton>
          ) : (
            <TapButton
              className="primary"
              disabled={!canRecord}
              onActivate={() => {
                void start();
              }}
            >
              <Mic />
              {state === "opening"
                ? "Opening microphone…"
                : blob
                  ? "Record again"
                  : "Start recording"}
            </TapButton>
          )}
          {(state === "opening" || state === "recording") && (
            <TapButton onActivate={cancel}>
              <X />
              Cancel recording
            </TapButton>
          )}
          {blob && (
            <TapButton
              onActivate={(event) => {
                void preview(event, phrase.trim(), lang, blob);
              }}
            >
              <Volume2 />
              Listen to this recording
            </TapButton>
          )}
          <TapButton
            onActivate={() => {
              audio.stop();
              setMessage("Playback stopped.");
            }}
          >
            <Square />
            Stop playback
          </TapButton>
        </div>
        {blob && (
          <>
            <Toggle checked={reviewed} onChange={setReviewed}>
              I listened and checked that the recording says exactly this
              sentence.
            </Toggle>
            <TapButton
              className="primary"
              disabled={!reviewed || !consented || !owner.trim() || busy}
              onActivate={() => {
                void save();
              }}
            >
              <Save />
              Save exact phrase
            </TapButton>
          </>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </Card>
      <Card title={`Saved recordings · ${saved.length}`}>
        {saved.length === 0 ? (
          <p>
            No phrases recorded yet. Start with “I need help!” for offline use.
          </p>
        ) : (
          saved.map((recording) => (
            <div
              key={recording.id}
              className="recording-row"
              style={{
                display: "grid",
                gap: 12,
                borderBottom: "1px solid var(--line)",
                paddingBottom: 16,
              }}
            >
              <strong lang={recording.lang}>{recording.text}</strong>
              <small>
                {recording.lang === "ta" ? "Tamil" : "English"} · exact recorded
                phrase
              </small>
              <div style={rowStyle}>
                <TapButton
                  aria-label={`Listen: ${recording.text}`}
                  onActivate={(event) => {
                    void preview(
                      event,
                      recording.text,
                      recording.lang,
                      recording.blob,
                      recording.consentId,
                    );
                  }}
                >
                  <Volume2 />
                  Listen
                </TapButton>
                <TapButton
                  aria-label={`Delete recording: ${recording.text}`}
                  onActivate={() => {
                    void remove(recording.id);
                  }}
                >
                  <Trash2 />
                  Delete recording
                </TapButton>
              </div>
            </div>
          ))
        )}
        {saved.length > 0 && (
          <>
            <Toggle checked={withdraw} onChange={setWithdraw}>
              Withdraw all recorded-phrase consent and remove every saved voice
              recording on this device.
            </Toggle>
            <TapButton
              disabled={!withdraw || busy}
              className="danger"
              onActivate={() => {
                void withdrawAll();
              }}
            >
              <Trash2 />
              Withdraw consent and delete recordings
            </TapButton>
          </>
        )}
      </Card>
      <Card title="Device voice fallback">
        <p>
          Sentences without a matching recording use a browser or
          operating-system voice. Local voices can work offline. Other voices
          may use your browser’s online service.
        </p>
        <div style={rowStyle}>
          <TapButton onActivate={() => setVoices(audio.getVoices(lang))}>
            <RefreshCw />
            Refresh voices
          </TapButton>
          <TapButton
            onActivate={(event) => {
              void preview(event, quickPhrases[lang].yes.text, lang);
            }}
          >
            <Volume2 />
            Test device voice: {quickPhrases[lang].yes.text}
          </TapButton>
        </div>
        {voices.length ? (
          <ul>
            {voices.map((voice, index) => (
              <li key={`${voice.name}-${index}`}>
                {voice.name} · {voice.lang} ·{" "}
                {voice.localService
                  ? "Local device voice"
                  : "May use an online service"}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No {lang === "ta" ? "Tamil" : "English"} voice is available yet.
            Install one in the device’s language or speech settings, or save
            exact recordings. Help can still sound a neutral alert tone.
          </p>
        )}
        <p>
          Paid cloud cloning is not connected in this build. No voice is
          uploaded or cloned by these controls.
        </p>
      </Card>
    </div>
  );
}

function LinkPhones() {
  const { settings, connected, refreshPairing } = useApp();
  const caregivers = settings.contacts.filter((contact) => contact.isCaregiver);
  const [contactId, setContactId] = useState(caregivers[0]?.id ?? "");
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function pair() {
    const contact = caregivers.find((person) => person.id === contactId);
    if (!contact) return;
    setWorking(true);
    setMessage("");
    setQr("");
    try {
      const result = await createPairing(contact.name, contact.id);
      setLink(result.url);
      refreshPairing();
      const QRCode = await import("qrcode");
      setQr(
        await QRCode.toDataURL(result.url, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      );
      setMessage(
        "Open this private link on the caregiver’s phone, or scan the QR code.",
      );
    } catch {
      setMessage(
        "Could not finish pairing. Check that the local server is running. If a link appears below, you can still copy it.",
      );
    } finally {
      setWorking(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage(
        "Private link copied. Share it only with the chosen caregiver.",
      );
    } catch {
      setMessage(
        "Copying is unavailable. Select and copy the private link below.",
      );
    }
  }
  return (
    <Card title="A familiar person, one phone away">
      <p>
        The chosen sentence can appear on a caregiver’s phone. Help can sound a
        neutral alert after they enable alerts. The caregiver cannot make this
        device speak.
      </p>
      <Field label="Caregiver">
        <select
          style={fieldStyle}
          value={contactId}
          disabled={working}
          onChange={(event) => setContactId(event.target.value)}
        >
          {caregivers.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </Field>
      <TapButton
        className="primary"
        disabled={!contactId || working}
        onActivate={() => {
          void pair();
        }}
      >
        <Link2 />
        {working ? "Creating private link…" : "Create caregiver link"}
      </TapButton>
      <p className="notice">
        Patient connection:{" "}
        {connected ? "Connected to relay" : "Not connected to relay"}. Delivery
        is confirmed only when the caregiver phone sends a receipt.
      </p>
      {qr && (
        <img
          src={qr}
          alt="Scan this private QR code on the caregiver’s phone"
          width={280}
          height={280}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      )}
      {link && (
        <>
          <Field label="Private pairing link">
            <textarea
              style={fieldStyle}
              rows={4}
              value={link}
              readOnly
              spellCheck={false}
            />
          </Field>
          <TapButton
            onActivate={() => {
              void copy();
            }}
          >
            <Copy />
            Copy private link
          </TapButton>
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <Hint>
        The link contains the room key. Messages are encrypted on the sending
        device. Keep the link private; anyone holding it can join as this
        caregiver.
      </Hint>
      <p>
        Both phones need access to the same server. A localhost link works only
        on this computer. Phone setup over HTTPS is a later hosting step.
      </p>
    </Card>
  );
}

function Privacy() {
  const { stop } = useApp();
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function erase() {
    if (confirmation !== "DELETE") return;
    setWorking(true);
    stop();
    audio.stop();
    try {
      await db.transaction("rw", db.tables, async () => {
        await Promise.all(db.tables.map((table) => table.clear()));
      });
      location.assign("/");
    } catch {
      setWorking(false);
      setMessage("Some device data could not be erased. Please try again.");
    }
  }
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card title="Where your information goes">
        <div style={{ overflowX: "auto" }}>
          <table className="privacy-table attempt-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Data flow in this build</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Find sentences</td>
                <td>
                  Free vocabulary uses prepared meanings. Local Ollama runs on
                  the Sollu server computer. A cloud engine sends your fragment,
                  language and current conversation prompt to the selected
                  provider through the server only after cloud sharing is
                  enabled. Optional history and personal context are controlled
                  in Personalize. Provider retention policies apply.
                </td>
              </tr>
              <tr>
                <td>Configure a sentence-engine key</td>
                <td>
                  A pasted API key stays in server memory for this device
                  session, expiring after 12 hours of inactivity or a server
                  restart. It is excluded from this browser’s database and
                  backups. A separately configured server environment key stays
                  configured until the server owner removes it.
                </td>
              </tr>
              <tr>
                <td>Speak into the browser</td>
                <td>
                  The browser or operating system may send microphone audio to
                  its speech-recognition service. Availability and retention
                  depend on that service.
                </td>
              </tr>
              <tr>
                <td>Play a device voice</td>
                <td>
                  Exact sentence text is passed to the browser’s speech system.
                  Some installed voices work locally; others may use an online
                  service.
                </td>
              </tr>
              <tr>
                <td>Record an exact phrase</td>
                <td>
                  The recording and consent record stay in this browser’s device
                  database. They are not uploaded or used to generate new
                  speech.
                </td>
              </tr>
              <tr>
                <td>Use Camera</td>
                <td>
                  A recognition model downloads on first use. Photos are
                  processed locally and discarded when you leave. Only an object
                  label enters the sentence request.
                </td>
              </tr>
              <tr>
                <td>Link a caregiver</td>
                <td>
                  Messages are encrypted before relay. The server sees
                  connection metadata and encrypted messages. The private
                  pairing link contains the decryption key.
                </td>
              </tr>
              <tr>
                <td>History and therapist view</td>
                <td>
                  Attempts, unpicked options, chosen phrases, settings and
                  learned phrasing remain in this device database. CSV export
                  creates a file you control.
                </td>
              </tr>
              <tr>
                <td>Send SMS</td>
                <td>
                  The SMS link opens your messaging app with a draft. You choose
                  whether to send it.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The sentence engine handles text; it does not clone or upload your
          voice. API keys can be forgotten in Sentence engine settings. This
          browser’s storage is not a substitute for a secure device lock.
        </p>
      </Card>
      <OfflinePanel />
      <MemoryPanel />
      <BackupPanel />
      <Card title="Erase this device’s Sollu data">
        <p>
          Forget server session keys in Sentence engine before erasing this
          browser’s data. Erasing browser data does not remove server
          environment keys.
        </p>
        <p>
          This removes saved recordings, consent, phrases, history, learned
          phrasing, settings, the caregiver PIN and local pairing keys from this
          browser. Data already received on another phone or exported to a file
          is separate.
        </p>
        <Field label="Type DELETE to confirm">
          <input
            style={fieldStyle}
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
        <TapButton
          className="danger"
          disabled={confirmation !== "DELETE" || working}
          onActivate={() => {
            void erase();
          }}
        >
          <Trash2 />
          {working ? "Erasing…" : "Erase all local data"}
        </TapButton>
        {message && <p role="status">{message}</p>}
      </Card>
    </div>
  );
}

export default function Settings() {
  const [search, setSearch] = useSearchParams();
  const requested = search.get("tab");
  const active: Section = sections.some((section) => section.id === requested)
    ? (requested as Section)
    : "general";
  const [provider, setProvider] = useState("Checking local server…");
  function refreshHealth() {
    void api<LlmConfiguration>("llm/settings", undefined, undefined, "GET")
      .then((result) => {
        const selected = result.providers.find(
          (item) => item.id === result.provider,
        );
        const mode = selected?.label ?? "Sentence engine unavailable";
        const readiness =
          selected?.requiresKey && !selected.keyConfigured
            ? " · key needed; free vocabulary fallback"
            : selected?.requiresKey && !result.cloudConsent
              ? " · cloud sharing off"
              : "";
        setProvider(
          `${mode}${readiness} · browser speech and exact recordings`,
        );
      })
      .catch(() =>
        setProvider(
          "Server unavailable · saved phrases and local recordings remain on this device",
        ),
      );
  }
  useEffect(() => {
    refreshHealth();
  }, []);
  function select(section: Section) {
    audio.stop();
    setSearch({ tab: section });
  }
  return (
    <div className="settings-page">
      <Back label="Back to Home" />
      <PageTitle
        eyebrow="CAREGIVER SPACE"
        title="A little more personal."
        subtitle="Make Sollu comfortable for the person who uses it."
      />
      <div
        className="provider-status"
        role="status"
        style={{ ...rowStyle, marginBottom: 20 }}
      >
        <span className="mode-badge">{provider}</span>
        <TapButton
          aria-label="Refresh provider status"
          onActivate={refreshHealth}
        >
          <RefreshCw size={20} />
          <span>Refresh</span>
        </TapButton>
      </div>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings sections"
        style={{ ...rowStyle, marginBottom: 24 }}
      >
        {sections.map((section, index) => (
          <TapButton
            key={section.id}
            id={`tab-${section.id}`}
            role="tab"
            aria-selected={active === section.id}
            aria-controls={`panel-${section.id}`}
            tabIndex={active === section.id ? 0 : -1}
            style={{ minHeight: 72 }}
            className={active === section.id ? "primary active" : "secondary"}
            onActivate={() => select(section.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight")
                next = (index + 1) % sections.length;
              else if (event.key === "ArrowLeft")
                next = (index + sections.length - 1) % sections.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = sections.length - 1;
              else return;
              event.preventDefault();
              select(sections[next]!.id);
              document.getElementById(`tab-${sections[next]!.id}`)?.focus();
            }}
          >
            <section.icon size={21} />
            <span>{section.label}</span>
            {active === section.id && <Check size={16} />}
          </TapButton>
        ))}
      </div>
      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
      >
        {active === "general" ? (
          <General />
        ) : active === "personalize" ? (
          <PersonalizationSettings />
        ) : active === "llm" ? (
          <LlmSettings onChanged={refreshHealth} />
        ) : active === "voice" ? (
          <VoiceStudio />
        ) : active === "link" ? (
          <LinkPhones />
        ) : (
          <Privacy />
        )}
      </div>
    </div>
  );
}
