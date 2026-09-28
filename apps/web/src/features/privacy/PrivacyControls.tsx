import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApp } from "../../state";
import { api } from "../../lib/api";
import { audio } from "../audio";
import { SettingsCard, SettingsToggle } from "../settings/Controls";
import type { LlmConfiguration } from "../settings/LlmSettings";
import { Link } from "react-router-dom";
import {
  cloudSentencePermission,
  subscribeCloudSentencePermission,
} from "./sentencePolicy";

export function PrivacyControls() {
  const { settings, updateSettings } = useApp();
  const [policy, setPolicy] = useState<LlmConfiguration["policy"]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentenceAllowed, setSentenceAllowed] = useState(
    cloudSentencePermission,
  );
  useEffect(
    () =>
      subscribeCloudSentencePermission(() =>
        setSentenceAllowed(cloudSentencePermission()),
      ),
    [],
  );
  useEffect(() => {
    setSentenceAllowed(cloudSentencePermission());
  }, [settings.localProcessingOnly]);
  useEffect(() => {
    const controller = new AbortController();
    void api<LlmConfiguration>(
      "llm/settings",
      undefined,
      controller.signal,
      "GET",
    )
      .then((result) => {
        if (!controller.signal.aborted) setPolicy(result.policy);
      })
      .catch(() => {
        /* Unknown is shown explicitly; do not infer server policy. */
      });
    return () => controller.abort();
  }, []);
  const localOnly = settings.localProcessingOnly !== false;
  return (
    <SettingsCard title="Local-only privacy protection">
      <p className="notice">
        <ShieldCheck size={20} aria-hidden="true" />{" "}
        {localOnly
          ? "Local speech and media protection is on for this device."
          : "Online browser services are allowed on this device."}
      </p>
      <SettingsToggle
        checked={localOnly}
        disabled={busy}
        onChange={(checked) => {
          setBusy(true);
          setError("");
          void updateSettings({ localProcessingOnly: checked })
            .catch(() =>
              setError(
                "The privacy setting could not be saved. Please try again.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        Require local speech, voices and camera models
      </SettingsToggle>
      <p>
        When on, only browser voices marked local and supported on-device speech
        recognition can be used. No speech language packs or object-recognition
        models are downloaded automatically. If a local voice or recognizer is
        unavailable, use typing, Topics, or a consented exact recording.
      </p>
      <p className="notice">
        Cloud sentence APIs:{" "}
        {sentenceAllowed
          ? "permitted by this device; provider consent and server policy still apply"
          : "off on this device"}
        . Manage the separate text permission in{" "}
        <Link to="/settings?tab=llm">Sentence engine settings</Link>. Switching
        local protection on also resets cloud sentence permission; you can
        enable sentence text separately afterwards.
      </p>
      <p>
        Turning this off allows browser services that may send speech or
        sentence text to their vendor. Speech input remains local until you
        separately choose Google / browser online in Speech recognition. It does
        not enable a cloud sentence provider: the server policy and separate
        sharing permission also apply.
      </p>
      <p>
        Sentence requests still reach the Sollu server. With localhost this is
        your computer; if the app is later hosted elsewhere, it is a separate
        destination that needs its own privacy review. A paired caregiver can
        receive messages you explicitly choose to share.
      </p>
      <dl>
        <dt>Cloud sentence providers on this server</dt>
        <dd>
          {!policy
            ? "Not verified — check Sentence engine settings."
            : policy.allowCloudAI
              ? "Operator permits cloud configuration; device consent is still required."
              : "Blocked by server policy, including OpenAI. Free vocabulary and local Ollama remain available."}
        </dd>
        <dt>Available speech voices for the current language</dt>
        <dd>
          {audio.getVoices(settings.lang).length || "None reported yet"}. The
          browser's local-service flag determines eligibility.
        </dd>
        <dt>Stored records and recordings</dt>
        <dd>
          Kept in this browser. The active database is not encrypted by Sollu;
          use a protected device and browser profile. The caregiver PIN is an
          interface lock.
        </dd>
        <dt>Retention and deletion</dt>
        <dd>
          Saved history and recordings remain until you remove them or clear
          this site’s data. Automatic history expiry is not implemented; the
          browser may also evict stored data. Erase local data in Settings
          removes this browser’s copy, not exported files or another person’s
          copy.
        </dd>
        <dt>Therapist sharing</dt>
        <dd>
          Use the encrypted report option in the therapist dashboard. Clips are
          separate consented downloads. Nothing is automatically sent.
        </dd>
      </dl>
      <p className="settings-feature-muted">
        These controls reduce transfers. They do not certify HIPAA compliance,
        anonymize a person's voice or video, or establish regulatory approval. A
        clinical deployment needs a separate privacy, security and regulatory
        review.
      </p>
      {error && (
        <p className="notice" role="status">
          {error}
        </p>
      )}
    </SettingsCard>
  );
}
