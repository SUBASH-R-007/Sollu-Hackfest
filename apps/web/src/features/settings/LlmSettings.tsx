import { useEffect, useRef, useState } from "react";
import { FlaskConical, RefreshCw, Save, Trash2 } from "lucide-react";
import { api, rememberSentenceEngine } from "../../lib/api";
import { TapButton } from "../../ui";
import { SettingsCard, SettingsField, SettingsToggle } from "./Controls";
import { useApp } from "../../state";
import {
  cloudSentencePermission,
  setCloudSentencePermission,
  subscribeCloudSentencePermission,
} from "../privacy/sentencePolicy";

type ProviderId =
  "mock" | "openai" | "anthropic" | "gemini" | "groq" | "ollama";
type Provider = {
  id: ProviderId;
  label: string;
  defaultModel: string;
  keyConfigured: boolean;
  keySource: "environment" | "session" | "none";
  requiresKey: boolean;
  available?: boolean;
  disabledReason?: string;
};
export type LlmConfiguration = {
  provider: ProviderId;
  model: string;
  timeoutMs: number;
  revision: number;
  cloudConsent: boolean;
  sessionExpiresAt?: number;
  providers: Provider[];
  policy?: { mode: "local-only" | "cloud-permitted"; allowCloudAI: boolean };
};
const environmentKeys: Partial<Record<ProviderId, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

export function LlmSettings({ onChanged }: { onChanged: () => void }) {
  const { settings, updateSettings } = useApp();
  const [sentenceAllowed, setSentenceAllowed] = useState(
    cloudSentencePermission,
  );
  const [saved, setSaved] = useState<LlmConfiguration>();
  const [provider, setProvider] = useState<ProviderId>("mock");
  const [model, setModel] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [apiKey, setApiKey] = useState("");
  const [cloudConsent, setCloudConsent] = useState(false);
  const [busy, setBusy] = useState<
    "load" | "save" | "test" | "forget" | "reset" | null
  >("load");
  const [message, setMessage] = useState("");
  const mounted = useRef(false);
  const request = useRef<AbortController | null>(null);
  const selected = saved?.providers.find((item) => item.id === provider);
  const isCloud = selected?.requiresKey === true;
  const cloudBlocked = saved?.policy?.allowCloudAI !== true || !sentenceAllowed;
  const dirty = Boolean(
    saved &&
    (saved.provider !== provider ||
      saved.model !== model.trim() ||
      saved.timeoutMs !== timeoutMs ||
      saved.cloudConsent !== cloudConsent ||
      apiKey),
  );

  function apply(configuration: LlmConfiguration) {
    setSaved(configuration);
    setProvider(configuration.provider);
    setModel(configuration.model);
    setTimeoutMs(configuration.timeoutMs);
    setCloudConsent(configuration.cloudConsent);
    setApiKey("");
  }
  function changed() {
    window.dispatchEvent(new Event("sollu:llm-settings-changed"));
    onChanged();
  }
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setApiKey("");
    setBusy("load");
    setMessage("");
    try {
      const result = await api<LlmConfiguration>(
        "llm/settings",
        undefined,
        controller.signal,
        "GET",
      );
      if (mounted.current && !controller.signal.aborted) apply(result);
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setMessage(
          "Engine settings could not load. Check the Sollu server and your server access code, then refresh.",
        );
    } finally {
      if (mounted.current && !controller.signal.aborted) setBusy(null);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(
    () =>
      subscribeCloudSentencePermission(() => {
        setSentenceAllowed(cloudSentencePermission());
        request.current?.abort();
        setApiKey("");
        setBusy(null);
      }),
    [],
  );
  // Keep the legacy online-device opt-in reflected when a caregiver changes it.
  useEffect(() => {
    setSentenceAllowed(cloudSentencePermission());
  }, [settings.localProcessingOnly]);

  function allowSentences(allowed: boolean) {
    try {
      setCloudSentencePermission(allowed);
      setSentenceAllowed(cloudSentencePermission());
      setMessage(
        allowed
          ? "Cloud sentence APIs are available. Choose a provider, add its key and enable that provider's text sharing. Microphone and voice settings have not changed."
          : "Cloud sentence requests are off on this device. Free vocabulary and local Ollama remain available.",
      );
    } catch {
      setSentenceAllowed(false);
      setMessage(
        "The sentence permission could not be saved. Cloud requests remain blocked.",
      );
    }
  }

  function selectProvider(value: ProviderId) {
    const next = saved?.providers.find((item) => item.id === value);
    setProvider(value);
    setModel(
      value === saved?.provider ? saved.model : (next?.defaultModel ?? ""),
    );
    setCloudConsent(value === saved?.provider ? saved.cloudConsent : false);
    setApiKey("");
    setMessage("");
  }
  async function save(mode: "save" | "forget" | "reset" = "save") {
    if (!saved) return;
    if (mode === "save" && isCloud && !cloudConsent) {
      setMessage(
        "Review and enable cloud text sharing before saving a cloud engine.",
      );
      return;
    }
    const keyForRequest = mode === "save" ? apiKey.trim() : "";
    setApiKey("");
    const body =
      mode === "reset"
        ? { provider: "mock", cloudConsent: false }
        : mode === "forget"
          ? { provider, removeKey: true }
          : {
              provider,
              model: model.trim(),
              timeoutMs,
              cloudConsent,
              ...(keyForRequest ? { apiKey: keyForRequest } : {}),
            };
    const controller = new AbortController();
    request.current = controller;
    setBusy(mode);
    setMessage("");
    try {
      const result = await api<LlmConfiguration>(
        "llm/settings",
        body,
        controller.signal,
      );
      rememberSentenceEngine(result.provider);
      if (!mounted.current || controller.signal.aborted) return;
      apply(result);
      changed();
      setMessage(
        mode === "reset"
          ? "Free vocabulary is active. Cloud text sharing is off for this engine configuration. Stored session keys can still be forgotten separately."
          : mode === "forget"
            ? "Session key removed. A server environment key is still used if one is configured."
            : "Sentence engine settings saved for this device on the Sollu server. No provider request was made.",
      );
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setMessage(
          "Settings could not be saved. Check the model, timeout and cloud consent, then try again. For privacy, the key field has been cleared.",
        );
    } finally {
      if (mounted.current && !controller.signal.aborted) setBusy(null);
    }
  }
  async function test() {
    const controller = new AbortController();
    request.current = controller;
    setBusy("test");
    setMessage("");
    try {
      const result = await api<{
        ok: boolean;
        message: string;
        provider: string;
        model: string;
        latencyMs: number;
      }>(
        "llm/test",
        { localOnly: !cloudSentencePermission() },
        controller.signal,
      );
      if (mounted.current)
        setMessage(
          `${result.ok ? "Connection test passed" : "Connection test did not pass"}: ${result.message} (${Math.round(result.latencyMs)} ms)`,
        );
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setMessage(
          "The test could not finish. Check the server, key, model and provider account. Free vocabulary remains available for communication.",
        );
    } finally {
      if (mounted.current && !controller.signal.aborted) setBusy(null);
    }
  }
  return (
    <div className="settings-feature-stack">
      <SettingsCard title="A sentence engine that understands context">
        <p className="notice">
          {saved?.policy?.allowCloudAI === false
            ? "Cloud sentence providers are blocked by server privacy policy. Use free vocabulary or Ollama on the local server computer."
            : !sentenceAllowed
              ? "Cloud sentence APIs are off on this device. Enable the text-only permission below to use them."
              : saved?.policy?.allowCloudAI === true
                ? "This server permits cloud providers. Explicit device sharing permission is still required."
                : "Checking server privacy policy. Cloud providers remain unavailable until verified."}
        </p>
        <SettingsToggle
          checked={sentenceAllowed}
          disabled={
            !saved || saved.policy?.allowCloudAI !== true || busy !== null
          }
          onChange={allowSentences}
        >
          Allow cloud sentence APIs on this device
        </SettingsToggle>
        <p className="settings-feature-muted">
          This permits sentence text to reach your chosen provider after you
          save its sharing permission. It does not enable online microphone
          recognition, remote speaking voices or camera model downloads. Saved
          recordings are not uploaded.
        </p>
        {saved?.policy?.allowCloudAI === false && (
          <p className="notice">
            The server operator must set <code>ALLOW_CLOUD_AI=1</code> in the
            server environment and restart the API server. Then refresh engine
            settings below.
          </p>
        )}
        {saved && (
          <TapButton disabled={busy !== null} onActivate={() => void load()}>
            <RefreshCw />
            Refresh engine settings
          </TapButton>
        )}
        <p>
          Help turn a short fragment into a complete sentence. Suggestions still
          need the person’s exact-sentence tap before speaking. The engine never
          starts audio itself.
        </p>
        {!saved ? (
          <>
            <p>
              {busy === "load"
                ? "Loading sentence engines…"
                : "Engine settings are unavailable."}
            </p>
            <TapButton
              disabled={busy !== null}
              onActivate={() => {
                void load();
              }}
            >
              <RefreshCw />
              Refresh engine settings
            </TapButton>
          </>
        ) : (
          <>
            <div className="settings-feature-grid">
              <SettingsField label="Sentence engine">
                <select
                  value={provider}
                  disabled={busy !== null}
                  onChange={(event) =>
                    selectProvider(event.target.value as ProviderId)
                  }
                >
                  {saved.providers.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        item.available === false ||
                        (item.requiresKey && cloudBlocked)
                      }
                    >
                      {item.label}
                      {item.available === false ||
                      (item.requiresKey && cloudBlocked)
                        ? " — blocked by privacy protection"
                        : ""}
                    </option>
                  ))}
                </select>
              </SettingsField>
              <SettingsField label="Model">
                <input
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={120}
                  value={model}
                  disabled={busy !== null || provider === "mock"}
                  onChange={(event) => {
                    setModel(event.target.value);
                    setMessage("");
                  }}
                />
              </SettingsField>
              <SettingsField label="Maximum wait for the engine">
                <select
                  value={timeoutMs}
                  disabled={busy !== null}
                  onChange={(event) => setTimeoutMs(Number(event.target.value))}
                >
                  {[8000, 15000, 30000].includes(timeoutMs) ? null : (
                    <option value={timeoutMs}>
                      {timeoutMs / 1000} seconds
                    </option>
                  )}
                  <option value={8000}>8 seconds</option>
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                </select>
              </SettingsField>
            </div>
            <SettingsToggle
              checked={settings.mixPreparedWithAi === true}
              onChange={(value) => {
                void updateSettings({ mixPreparedWithAi: value }).catch(() =>
                  setMessage(
                    "This choice could not be saved. Please try again.",
                  ),
                );
              }}
            >
              Also offer prepared vocabulary phrases with AI suggestions
            </SettingsToggle>
            <p className="settings-feature-muted">
              Model access and pricing depend on the provider account.{" "}
              {settings.mixPreparedWithAi === true
                ? "AI suggestions come first; prepared vocabulary phrases may fill spare choices and replace AI suggestions when the engine fails, times out or cannot be verified."
                : "Only the selected engine’s suggestions are shown. If it fails, times out or cannot be verified, Sollu says so and offers prepared phrases only when the person taps for them."}{" "}
              Health and help words always use prepared wording.
            </p>
            {provider === "mock" ? (
              <p className="settings-key-status">
                Free vocabulary · no API key or model download. Uses prepared
                meanings and known context. It cannot freely rewrite any
                sentence.
              </p>
            ) : provider === "ollama" ? (
              <p className="settings-key-status">
                Free local Ollama · requires Ollama and a suitable model on the
                Sollu server computer. No paid API key is needed. Speed depends
                on the computer; no model is downloaded by this screen.
              </p>
            ) : (
              <>
                <p className="settings-key-status">
                  {selected?.keyConfigured
                    ? selected.keySource === "environment"
                      ? "Key configured in the server environment. It is never shown here."
                      : "Session key configured in server memory. It is never shown here."
                    : "No API key configured for this provider."}
                </p>
                <SettingsField label="API key (optional if already configured)">
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={1024}
                    placeholder="Paste a key to use for this server session"
                    value={apiKey}
                    disabled={busy !== null}
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                </SettingsField>
                <p className="settings-feature-muted">
                  The pasted key travels to the Sollu server and stays only in
                  server memory for this device session. It expires after 12
                  hours of inactivity or a server restart. It is never saved in
                  this browser’s database, local storage or backups. This field
                  clears when you save, switch providers or leave this tab.
                </p>
                <SettingsToggle
                  checked={cloudConsent}
                  disabled={busy !== null}
                  onChange={setCloudConsent}
                >
                  Allow text sharing with {selected?.label} to generate sentence
                  suggestions
                </SettingsToggle>
                <p className="settings-feature-muted">
                  This shares the current fragment, language, current
                  conversation prompt and necessary sentence instructions
                  through the Sollu server. Optional conversation history and
                  personal context are controlled in Personalize. Provider
                  retention and account policies apply. Choose Free vocabulary
                  or Local Ollama to stop cloud sentence requests.
                </p>
                <p className="settings-feature-muted">
                  Fragments and questions can contain names or health
                  information. Sharing permission and context filtering do not
                  anonymize them. A provider’s no-training policy does not mean
                  no retention. Review the intended service and account terms
                  before sharing; clinical use requires a separate privacy and
                  security review.
                </p>
                <details>
                  <summary>Use a server environment key instead</summary>
                  <p>
                    Set <code>{environmentKeys[provider]}</code> in the server’s
                    private environment and restart the server. Never put a key
                    in web code or a <code>VITE_</code> variable. An environment
                    key may be available to other devices authorized to use that
                    server.
                  </p>
                  <p>
                    Forgetting a session key does not remove a server
                    environment key. Remove the environment variable and restart
                    the server to remove that source.
                  </p>
                </details>
              </>
            )}
            <div className="settings-feature-actions">
              <TapButton
                className="primary"
                disabled={
                  busy !== null ||
                  selected?.available === false ||
                  (isCloud && cloudBlocked) ||
                  (isCloud && !cloudConsent) ||
                  (provider !== "mock" && !model.trim())
                }
                onActivate={() => {
                  void save();
                }}
              >
                <Save />
                {busy === "save" ? "Saving…" : "Save engine settings"}
              </TapButton>
              {selected?.keySource === "session" && (
                <TapButton
                  disabled={busy !== null}
                  onActivate={() => {
                    void save("forget");
                  }}
                >
                  <Trash2 />
                  Forget session key
                </TapButton>
              )}
              <TapButton
                disabled={busy !== null}
                onActivate={() => {
                  void save("reset");
                }}
              >
                <RefreshCw />
                Use free vocabulary
              </TapButton>
            </div>
          </>
        )}
      </SettingsCard>
      {saved && (
        <SettingsCard title="Check the saved engine">
          <p>
            Run one short synthetic request, such as “water please”. This sends
            no personal conversation or recordings. Cloud providers may charge
            for this test.
          </p>
          {dirty && (
            <p className="notice">
              Save the edited engine settings before running a test.
            </p>
          )}
          <TapButton
            disabled={
              busy !== null ||
              dirty ||
              (saved.providers.find((item) => item.id === saved.provider)
                ?.requiresKey === true &&
                cloudBlocked) ||
              (saved.providers.find((item) => item.id === saved.provider)
                ?.requiresKey === true &&
                !saved.providers.find((item) => item.id === saved.provider)
                  ?.keyConfigured)
            }
            onActivate={() => {
              void test();
            }}
          >
            <FlaskConical />
            {busy === "test"
              ? "Testing connection…"
              : "Run synthetic connection test"}
          </TapButton>
          <p className="settings-feature-muted">
            A successful connection confirms API access only. It does not
            validate sentence accuracy, Tamil quality or clinical suitability.
            Voice and speech-recognition settings remain separate.
          </p>
        </SettingsCard>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
