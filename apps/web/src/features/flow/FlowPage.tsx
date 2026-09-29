import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Mic,
  Smartphone,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { candidate, type Lang } from "@sollu/shared";
import { useApp } from "../../state";
import { Back, PageTitle, TapButton } from "../../ui";
import { copy } from "../../lib/copy";
import {
  extractTranscript,
  type TranscriptResults,
} from "../../lib/transcript";
import { transcribeRecording, transcriptionStatus } from "../../lib/api";
import { audio } from "../audio";
import { captureEvidence, type EvidenceCapture } from "../rehab/capture";
import { prepareBrowserRecognition } from "../privacy/browserPolicy";
import { recognitionErrorMessage } from "../privacy/recognitionDiagnostics";
import { useSpeechRecognitionMode } from "../privacy/useSpeechRecognitionMode";
import {
  cloudTranscriptionPermission,
  subscribeCloudTranscriptionPermission,
} from "../privacy/transcriptionPolicy";
import { cleanTranscript } from "./cleanup";
import "./flow.css";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: TranscriptResults }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Engine = "device" | "cloud";
type Phase = "idle" | "starting" | "listening" | "transcribing";
/** Long dictation is fine; the microphone closes after this, keeping words. */
const maxDictationMs = 3 * 60_000;
// Silence ends a browser session; reopen it quietly a bounded number of times.
const maxRestarts = 30;

export default function FlowPage() {
  const { settings, updateSettings, begin, generate, speak } = useApp();
  const recognitionMode = useSpeechRecognitionMode();
  const t = (en: string, ta: string) => copy(settings.lang, en, ta);
  const [lang, setLang] = useState<Lang>(settings.speechLang ?? settings.lang);
  const [engine, setEngine] = useState<Engine>("device");
  const [cloudAllowed, setCloudAllowed] = useState(
    cloudTranscriptionPermission,
  );
  const [cloudReady, setCloudReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [raw, setRaw] = useState("");
  const [text, setText] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  // A cloud recording that reached the length limit waits for a Send tap.
  const [pending, setPending] = useState<Blob | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const cancelRef = useRef<() => void>(() => {});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const stop = () => cancelRef.current();
    window.addEventListener("sollu:stop", stop);
    return () => {
      mounted.current = false;
      window.removeEventListener("sollu:stop", stop);
      cancelRef.current();
    };
  }, []);
  useEffect(
    () =>
      subscribeCloudTranscriptionPermission(() => {
        const allowed = cloudTranscriptionPermission();
        setCloudAllowed(allowed);
        if (!allowed) {
          setEngine("device");
          cancelRef.current();
        }
      }),
    [],
  );
  useEffect(() => {
    setCloudAllowed(cloudTranscriptionPermission());
  }, [settings.localProcessingOnly]);
  useEffect(() => {
    if (!cloudAllowed) return setCloudReady(false);
    let active = true;
    void transcriptionStatus()
      .then((result) => active && setCloudReady(result.available))
      .catch(() => active && setCloudReady(false));
    return () => {
      active = false;
    };
  }, [cloudAllowed]);
  const canUseCloud = cloudAllowed && cloudReady;

  function showWords(heard: string, heardAlternatives: string[] = []) {
    const tidy = cleanTranscript(heard);
    setRaw(heard);
    setText(tidy.text);
    setRemoved(tidy.removed);
    setAlternatives(heardAlternatives);
  }

  function startDevice() {
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setStatus(
        recognitionErrorMessage(
          "recognition-unavailable",
          recognitionMode,
          lang,
        ),
      );
      return;
    }
    // Continue after existing words: dictation adds to what is already there.
    let committed = raw.trim();
    let active = true;
    let restarts = 0;
    let rec: Recognition | null = null;
    const cap = setTimeout(
      () =>
        finish(
          t(
            "The microphone has stopped. Your words are kept.",
            "மைக் நின்றது. உங்கள் வார்த்தைகள் இருக்கின்றன.",
          ),
        ),
      maxDictationMs,
    );
    const close = () => {
      if (!rec) return;
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* Already ended. */
      }
      rec = null;
    };
    function finish(message = "") {
      if (!active) return;
      active = false;
      clearTimeout(cap);
      close();
      if (!mounted.current) return;
      setPhase("idle");
      setStatus(message);
    }
    function open() {
      let current: Recognition;
      try {
        current = prepareBrowserRecognition(Constructor!);
      } catch (error) {
        finish(error instanceof Error ? error.message : "");
        return;
      }
      rec = current;
      const prefix = committed;
      current.lang = lang === "ta" ? "ta-IN" : "en-IN";
      current.continuous = true;
      current.interimResults = true;
      current.maxAlternatives = 3;
      current.onstart = () => {
        if (active && mounted.current) setPhase("listening");
      };
      current.onresult = (event) => {
        if (!active || !mounted.current) return;
        const result = extractTranscript(event.results, prefix);
        committed = result.text.trim();
        showWords(result.text, result.alternatives);
      };
      current.onerror = (event) => {
        // Silence is not a failure in dictation; the session reopens.
        if (event.error === "no-speech" || event.error === "aborted") return;
        finish(
          recognitionErrorMessage(event.error, recognitionMode, current.lang),
        );
      };
      current.onend = () => {
        if (!active) return;
        if (restarts++ >= maxRestarts) {
          finish();
          return;
        }
        rec = null;
        open();
      };
      try {
        current.start();
      } catch (error) {
        finish(error instanceof Error ? error.message : "");
      }
    }
    stopRef.current = () => finish();
    cancelRef.current = () => finish();
    setPhase("starting");
    setStatus("");
    open();
  }

  async function startCloud() {
    const controller = new AbortController();
    let recorder: EvidenceCapture | null = null;
    cancelRef.current = () => {
      controller.abort();
      recorder?.cancel();
      recorder = null;
      if (mounted.current) setPhase("idle");
    };
    const finishRecording = async (send: boolean) => {
      const current = recorder;
      recorder = null;
      if (!current || controller.signal.aborted) return;
      setPhase("transcribing");
      try {
        const { blob } = await current.stop();
        if (!send) {
          // Audio leaves the device only on a tap, never because time ran out.
          if (!mounted.current || controller.signal.aborted) return;
          setPending(blob);
          setStatus(
            t(
              "Two-minute limit reached. Tap Send to turn it into text.",
              "இரண்டு நிமிட எல்லை. எழுத்தாக்க ‘அனுப்பு’ தொடுங்கள்.",
            ),
          );
          return;
        }
        // Permission is rechecked inside transcribeRecording at dispatch.
        const heard = await transcribeRecording(blob, lang, controller.signal);
        if (!mounted.current || controller.signal.aborted) return;
        showWords([raw.trim(), heard].filter(Boolean).join(" "), []);
        setStatus(
          heard
            ? ""
            : t(
                "No words were heard. Try again.",
                "வார்த்தைகள் கேட்கவில்லை. மீண்டும் முயலுங்கள்.",
              ),
        );
      } catch (error) {
        if (mounted.current && !controller.signal.aborted)
          setStatus(error instanceof Error ? error.message : "");
      } finally {
        if (mounted.current && !controller.signal.aborted) setPhase("idle");
      }
    };
    stopRef.current = () => void finishRecording(true);
    setPhase("starting");
    setStatus("");
    try {
      recorder = await captureEvidence(
        "audio",
        controller.signal,
        () => void finishRecording(false),
      );
      if (controller.signal.aborted) {
        recorder.cancel();
        return;
      }
      setPhase("listening");
    } catch (error) {
      recorder = null;
      if (mounted.current && !controller.signal.aborted) {
        setPhase("idle");
        setStatus(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? recognitionErrorMessage("not-allowed", recognitionMode, lang)
            : error instanceof Error
              ? error.message
              : "",
        );
      }
    }
  }

  async function sendPending() {
    const blob = pending;
    if (!blob) return;
    setPending(null);
    setPhase("transcribing");
    try {
      const heard = await transcribeRecording(blob, lang);
      if (!mounted.current) return;
      showWords([raw.trim(), heard].filter(Boolean).join(" "));
      setStatus("");
    } catch (error) {
      if (mounted.current)
        setStatus(error instanceof Error ? error.message : "");
    } finally {
      if (mounted.current) setPhase("idle");
    }
  }
  function start() {
    audio.stop();
    if (engine === "cloud" && canUseCloud) void startCloud();
    else startDevice();
  }
  function chooseLang(next: Lang) {
    if (next === lang || phase !== "idle") return;
    setLang(next);
    void updateSettings({ speechLang: next }).catch(() => {});
  }
  const busy = phase !== "idle";
  const words = text.trim();
  return (
    <section className="flow-page">
      <Back />
      <PageTitle
        eyebrow={t("VOICE FLOW", "பேச்சு → எழுத்து")}
        title={t(
          "Speak freely. We tidy it up.",
          "தாராளமாகப் பேசுங்கள். நாங்கள் சீராக்குகிறோம்.",
        )}
        subtitle={t(
          "Talk as long as you like. Pauses are fine.",
          "எவ்வளவு நேரம் வேண்டுமானாலும் பேசுங்கள். இடைவெளி பரவாயில்லை.",
        )}
      />
      <div
        className="flow-choices"
        role="group"
        aria-label={t("I will speak in", "நான் பேசும் மொழி")}
      >
        {(["ta", "en"] as const).map((value) => (
          <TapButton
            key={value}
            aria-pressed={lang === value}
            className={lang === value ? "selected" : ""}
            disabled={busy}
            onActivate={() => chooseLang(value)}
          >
            🎤 {value === "ta" ? "தமிழ்" : "English"}
          </TapButton>
        ))}
      </div>
      <div
        className="flow-choices"
        role="group"
        aria-label={t("How your speech becomes text", "பேச்சு எழுத்தாகும் வழி")}
      >
        <TapButton
          aria-pressed={engine === "device"}
          className={engine === "device" ? "selected" : ""}
          disabled={busy}
          onActivate={() => setEngine("device")}
        >
          <Smartphone />
          {t("On this device", "இந்தச் சாதனத்தில்")}
        </TapButton>
        <TapButton
          aria-pressed={engine === "cloud"}
          className={engine === "cloud" ? "selected" : ""}
          disabled={busy || !canUseCloud}
          onActivate={() => setEngine("cloud")}
        >
          <Sparkles />
          {t("High accuracy (OpenAI)", "அதிகத் துல்லியம் (OpenAI)")}
        </TapButton>
      </div>
      <p className="flow-note">
        {engine === "cloud" && canUseCloud
          ? t(
              "Your recording is sent to OpenAI for transcription when you tap Stop.",
              "நிறுத்து தொட்டதும் உங்கள் பதிவு எழுத்தாக்க OpenAI-க்கு அனுப்பப்படும்.",
            )
          : recognitionMode === "local"
            ? t(
                "On-device recognition. Tamil needs an installed language pack.",
                "சாதனத்திலேயே கேட்கும். தமிழுக்கு மொழித் தொகுப்பு வேண்டும்.",
              )
            : t(
                "Your browser’s speech service may receive the audio.",
                "உலாவியின் பேச்சுச் சேவை குரலைப் பெறலாம்.",
              )}
        {!canUseCloud &&
          ` ${t(
            "High accuracy is off; a caregiver can turn it on in Settings.",
            "அதிகத் துல்லியம் அணைந்துள்ளது; பராமரிப்பாளர் அமைப்புகளில் இயக்கலாம்.",
          )}`}
      </p>
      <TapButton
        className={`flow-mic ${busy ? "is-active" : ""}`}
        disabled={phase === "transcribing"}
        aria-pressed={busy}
        onActivate={() => (busy ? stopRef.current() : start())}
      >
        {busy ? <Square fill="currentColor" /> : <Mic />}
        {phase === "transcribing"
          ? t("Turning speech into text…", "பேச்சை எழுத்தாக்குகிறது…")
          : busy
            ? engine === "cloud"
              ? t("Stop and send", "நிறுத்தி அனுப்பு")
              : t("Stop", "நிறுத்து")
            : words
              ? t("Keep talking", "தொடர்ந்து பேசு")
              : t("Start speaking", "பேசத் தொடங்கு")}
      </TapButton>
      {pending && !busy && (
        <div className="flow-actions">
          <TapButton className="primary" onActivate={() => void sendPending()}>
            <Sparkles />
            {t("Send to turn into text", "எழுத்தாக்க அனுப்பு")}
          </TapButton>
          <TapButton
            onActivate={() => {
              setPending(null);
              setStatus("");
            }}
          >
            <X />
            {t("Discard recording", "பதிவை நீக்கு")}
          </TapButton>
        </div>
      )}
      <p className="flow-status" role="status" aria-live="polite">
        {phase === "starting"
          ? t("Starting the microphone…", "மைக் தொடங்குகிறது…")
          : phase === "listening"
            ? t("Listening…", "கேட்கிறது…")
            : status}
      </p>
      <label className="flow-text">
        <span>{t("Your words", "உங்கள் வார்த்தைகள்")}</span>
        <textarea
          lang={lang}
          rows={4}
          maxLength={500}
          value={text}
          disabled={busy}
          placeholder={t(
            "Your words appear here.",
            "உங்கள் வார்த்தைகள் இங்கே வரும்.",
          )}
          onChange={(event) => {
            setText(event.target.value);
            setRemoved([]);
          }}
        />
      </label>
      {raw && raw.trim() !== words && (
        <p className="flow-heard">
          {t("Heard", "கேட்டது")}: <span lang={lang}>{raw}</span>
          {removed.length > 0 &&
            ` · ${t("tidied", "நீக்கியது")}: ${removed.join(", ")}`}
        </p>
      )}
      {words && !busy && (
        <div className="flow-actions">
          <TapButton
            className="primary"
            onActivate={() => {
              const fragment = {
                modality: "speech" as const,
                raw: words,
                sttAlternatives: alternatives
                  .filter((item) => item.trim() && item.length <= 120)
                  .slice(0, 5),
              };
              begin(fragment);
              // Sentences follow the chosen language rule, not the speech language.
              void generate(fragment, 1);
            }}
          >
            <Sparkles />
            {t("Find what I mean", "நான் சொல்ல வந்ததைக் கண்டுபிடி")}
          </TapButton>
          <TapButton
            onActivate={(event) => {
              // The person's own reviewed words, spoken only on this exact tap.
              const c = candidate(words, words, "dictation", "🗣️");
              speak(
                c,
                audio.createTap(event, words, {
                  role: "patient",
                  surface: "patient",
                }),
                false,
                lang,
              );
            }}
          >
            <Volume2 />
            {t("Say exactly", "அப்படியே சொல்")}:{" "}
            <span lang={lang}>{words}</span>
          </TapButton>
          <TapButton
            onActivate={() => {
              void navigator.clipboard
                ?.writeText(words)
                .then(() => setStatus(t("Copied.", "நகலெடுக்கப்பட்டது.")))
                .catch(() =>
                  setStatus(t("Could not copy.", "நகலெடுக்க முடியவில்லை.")),
                );
            }}
          >
            <Copy />
            {t("Copy", "நகலெடு")}
          </TapButton>
          <TapButton
            onActivate={() => {
              setRaw("");
              setText("");
              setRemoved([]);
              setAlternatives([]);
              setStatus("");
            }}
          >
            <X />
            {t("Clear", "அழி")}
          </TapButton>
        </div>
      )}
      {!words && !busy && (
        <p className="flow-note">
          <Check aria-hidden="true" />{" "}
          {t(
            "Fillers like “um” and repeated words are removed; nothing is added.",
            "“ம்ம்” போன்ற ஒலிகளும் திரும்பும் சொற்களும் நீக்கப்படும்; எதுவும் சேர்க்கப்படாது.",
          )}
        </p>
      )}
    </section>
  );
}
