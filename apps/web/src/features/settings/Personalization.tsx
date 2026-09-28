import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { defaultSettings, type Settings } from "../../db";
import { useApp } from "../../state";
import { TapButton } from "../../ui";
import { SettingsCard, SettingsField, SettingsToggle } from "./Controls";

const fields = [
  "sentenceStyle",
  "sentenceLength",
  "shareRecentContext",
  "sharePersonalContext",
  "communicationPreferences",
  "reducedMotion",
  "preferredInput",
] as const;
type Personalization = Pick<Settings, (typeof fields)[number]>;
function pickPersonalization(settings: Settings): Personalization {
  return Object.fromEntries(
    fields.map((key) => [key, settings[key]]),
  ) as Personalization;
}

export function PersonalizationSettings() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState(() => pickPersonalization(settings));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function change<K extends keyof Personalization>(
    key: K,
    value: Personalization[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setMessage("");
  }
  async function save(next = draft) {
    setBusy(true);
    try {
      const normalized = {
        ...next,
        communicationPreferences: next.communicationPreferences.trim(),
      };
      await updateSettings(normalized);
      setDraft(normalized);
      setMessage("Personalization saved on this device.");
    } catch {
      setMessage("Personalization could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-feature-stack">
      <SettingsCard title="Words that feel like you">
        <p>
          Choose these preferences with the person using Sollu. They choose the
          exact sentence before it is spoken.
        </p>
        <div className="settings-feature-grid">
          <SettingsField label="Sentence style">
            <select
              value={draft.sentenceStyle}
              onChange={(event) =>
                change(
                  "sentenceStyle",
                  event.target.value as Settings["sentenceStyle"],
                )
              }
            >
              <option value="brief">Brief · simple and direct</option>
              <option value="natural">Natural · everyday wording</option>
              <option value="polite">Polite · respectful requests</option>
            </select>
          </SettingsField>
          <SettingsField label="Preferred maximum sentence length">
            <select
              value={draft.sentenceLength}
              onChange={(event) =>
                change(
                  "sentenceLength",
                  Number(event.target.value) as Settings["sentenceLength"],
                )
              }
            >
              <option value={8}>8 words · short</option>
              <option value={12}>12 words · balanced</option>
              <option value={18}>18 words · more detail</option>
            </select>
          </SettingsField>
        </div>
        <SettingsField label="Communication preferences (optional)">
          <textarea
            rows={3}
            maxLength={240}
            value={draft.communicationPreferences}
            placeholder="For example: Use everyday words. Give me extra time."
            onChange={(event) =>
              change("communicationPreferences", event.target.value)
            }
          />
        </SettingsField>
        <p className="settings-feature-muted">
          Style and length guide the sentence engine. Meaning, refusals and
          important details take priority. Saved exact phrases are kept as
          written.
        </p>
      </SettingsCard>
      <SettingsCard title="A comfortable starting point">
        <SettingsField label="First communication tile on Home">
          <select
            value={draft.preferredInput}
            onChange={(event) =>
              change(
                "preferredInput",
                event.target.value as Settings["preferredInput"],
              )
            }
          >
            <option value="speech">Speak</option>
            <option value="type">Type</option>
            <option value="topics">Topics</option>
            <option value="camera">Camera</option>
          </select>
        </SettingsField>
        <p>
          Bring a familiar way to communicate to the first position. The
          microphone and camera only start when the person chooses them.
        </p>
        <SettingsToggle
          checked={draft.reducedMotion}
          onChange={(value) => change("reducedMotion", value)}
        >
          Reduce animation and moving decorations
        </SettingsToggle>
        <p className="settings-feature-muted">
          Text size, high contrast, speech speed, tap timing and the number of
          choices are in General.
        </p>
      </SettingsCard>
      <SettingsCard title="Choose the context the engine can use">
        <p>
          The current fragment, language and current conversation prompt help
          the engine understand the request. These extra context sources are
          optional and start off.
        </p>
        <SettingsToggle
          checked={draft.shareRecentContext}
          onChange={(value) => change("shareRecentContext", value)}
        >
          Use recent conversation context
        </SettingsToggle>
        <p className="settings-feature-muted">
          Include up to three confirmed, chosen messages from the last 10
          minutes with the same listener, place and language. Leave this off to
          keep earlier conversation out of new sentence requests.
        </p>
        <SettingsToggle
          checked={draft.sharePersonalContext}
          onChange={(value) => change("sharePersonalContext", value)}
        >
          Use personal context and communication preferences
        </SettingsToggle>
        <p className="settings-feature-muted">
          May include familiar people, routines, place, approved phrasing,
          vocabulary and the preference note above. With a cloud engine, enabled
          context is sent to that provider through the Sollu server. Photos,
          voice recordings and the full device database are not sent by the
          sentence engine.
        </p>
      </SettingsCard>
      <div className="settings-feature-actions">
        <TapButton
          className="primary"
          disabled={busy}
          onActivate={() => {
            void save();
          }}
        >
          <Save />
          {busy ? "Saving…" : "Save personalization"}
        </TapButton>
        <TapButton
          disabled={busy}
          onActivate={() => {
            setDraft(pickPersonalization(defaultSettings));
            setMessage(
              "Defaults loaded for this tab. Save personalization to apply them. Other settings and saved messages are unchanged.",
            );
          }}
        >
          <RotateCcw />
          Restore defaults for this tab
        </TapButton>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
