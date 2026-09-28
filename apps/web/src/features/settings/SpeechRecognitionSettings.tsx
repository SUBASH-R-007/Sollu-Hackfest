import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { SettingsCard } from "./Controls";
import { useApp } from "../../state";
import { isLocalProcessingOnly } from "../privacy/browserPolicy";
import {
  setRecognitionPreference,
  type RecognitionMode,
} from "../privacy/recognitionPreference";
import { useSpeechRecognitionMode } from "../privacy/useSpeechRecognitionMode";
import { checkLocalRecognition } from "../privacy/recognitionAvailability";

export function SpeechRecognitionSettings() {
  const { settings } = useApp();
  const mode = useSpeechRecognitionMode();
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [support, setSupport] = useState<{
    language: string;
    message: string;
  } | null>(null);
  const id = useId();
  const protectedMode = settings.localProcessingOnly !== false;
  function choose(next: RecognitionMode) {
    try {
      if (next === "browser" && isLocalProcessingOnly())
        throw new Error(
          "Local-only privacy protection blocks online recognition.",
        );
      setRecognitionPreference(next);
      setMessage(
        "Speech recognition choice saved. Start speaking when you are ready.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The choice could not be saved.",
      );
    }
  }
  return (
    <SettingsCard title="Speech recognition">
      <p className="notice">
        Sentence APIs turn text into sentence choices. They do not enable the
        microphone or install local speech recognition. Current speech mode:
        <strong>
          {" "}
          {mode === "local" ? "Local only" : "Google / browser online"}
        </strong>
        .
      </p>
      <p>
        Choose how spoken input becomes text in Speak and Communication
        practice. Changing this choice stops active recognition and saves
        immediately.
      </p>
      <fieldset
        className="recognition-mode-options"
        aria-describedby={`${id}-help`}
      >
        <legend>Recognition mode</legend>
        <label
          className={`recognition-mode-option ${mode === "local" ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name={id}
            value="local"
            checked={mode === "local"}
            onChange={() => choose("local")}
          />
          <span>
            <strong>Local · on this device</strong>
            <small>
              Requires browser support and an installed language pack. No online
              fallback.
            </small>
          </span>
        </label>
        <label
          className={`recognition-mode-option ${mode === "browser" ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name={id}
            value="browser"
            checked={mode === "browser"}
            disabled={protectedMode}
            onChange={() => choose("browser")}
          />
          <span>
            <strong>Google / browser online</strong>
            <small>
              Allows audio to reach your browser’s speech service. Internet may
              be required; no API key is needed.
            </small>
          </span>
        </label>
      </fieldset>
      <p id={`${id}-help`}>
        Chrome can use Google’s speech service. Other browsers may use another
        provider; Sollu cannot choose or verify the vendor. Local recognition,
        including Tamil, depends on the installed browser and language support.
        No language pack is downloaded automatically. Online service retention
        depends on the vendor and cannot be verified by Sollu.
      </p>
      {protectedMode && (
        <p className="notice">
          Local-only privacy protection is on, so online recognition is blocked.
          Review <Link to="/settings?tab=privacy">Privacy settings</Link> to
          turn that protection off before choosing online recognition. Turning
          it off also permits remote browser voices and external model
          downloads; the server’s cloud-AI block remains separate.
        </p>
      )}
      <p className="settings-feature-muted">
        Applies to this browser only. Selecting a mode does not start the
        microphone, upload saved recordings or change the sentence engine.
      </p>
      <button
        type="button"
        className="tap secondary"
        disabled={checking}
        onClick={async () => {
          const language = settings.lang;
          setChecking(true);
          const result = await checkLocalRecognition(language);
          setSupport({ language, message: result });
          setChecking(false);
        }}
      >
        {checking
          ? "Checking local support…"
          : `Check local support for ${settings.lang === "ta" ? "Tamil" : "English"}`}
      </button>
      <p className="settings-feature-muted">
        This check does not open your microphone or download a language pack. If
        this embedded browser cannot start recognition, open the same app
        address in Chrome or Edge. Each browser needs its own settings and
        microphone permission.
      </p>
      <p role="status">
        {support?.language === settings.lang ? support.message : ""}
      </p>
      <p role="status">{message}</p>
    </SettingsCard>
  );
}
