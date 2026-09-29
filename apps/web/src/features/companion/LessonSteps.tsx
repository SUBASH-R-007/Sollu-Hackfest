import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleSlash,
  Hand,
  Keyboard,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { TapButton } from "../../ui";
import { copy } from "../../lib/copy";
import type { Lang } from "@sollu/shared";
import { audio } from "../audio";
import { scoreTranscript, targetWordTokens } from "../rehab/analysis";
import { startPracticeTranscript } from "../rehab/recognition";
import type { RecognitionMode } from "../privacy/recognitionPreference";
import ListenButton from "./ListenButton";
import { builtMatches, type LessonStep } from "./content";
import type { SpokenResult } from "./practiceRecord";
import type { Outcome } from "./scheduler";

/** What a finished step reports to the lesson. */
export type StepResult =
  | { kind: "spoken"; result: SpokenResult }
  | { kind: "exercise"; outcome: Outcome }
  | { kind: "skipped" };

interface StepProps<T extends LessonStep["type"]> {
  step: Extract<LessonStep, { type: T }>;
  /** Interface language (buttons and instructions). */
  ui: Lang;
  /** False for a moment after a step appears, so a double tap cannot answer it. */
  ready: boolean;
  onDone: (result: StepResult) => void;
  onVoiceUnavailable: () => void;
}

const isHelpPhrase = (key: string) => key.endsWith(":quick.help");

function PhraseCard({
  icon,
  text,
  lang,
}: {
  icon: string;
  text: string;
  lang: "en" | "ta";
}) {
  return (
    <div className="companion-phrase">
      <span className="companion-phrase-icon" aria-hidden="true">
        {icon}
      </span>
      <p lang={lang}>{text}</p>
    </div>
  );
}

function HelpPracticeNote({ phraseKey, ui }: { phraseKey: string; ui: Lang }) {
  if (!isHelpPhrase(phraseKey)) return null;
  return (
    <p className="companion-note">
      {copy(
        ui,
        "Practice only. For real help, use the Help button.",
        "இது பயிற்சி மட்டும். உண்மையான உதவிக்கு ‘உதவி’ பொத்தானைத் தொடுங்கள்.",
      )}
    </p>
  );
}

function recognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const host = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(host.SpeechRecognition ?? host.webkitSpeechRecognition);
}

/** a. Listen & repeat — the result is one tap, word chips or "Not yet". */
export function ListenStep({
  step,
  ui,
  ready,
  onDone,
  onVoiceUnavailable,
  recognitionMode,
  usesAid,
}: StepProps<"listen"> & {
  recognitionMode: RecognitionMode;
  /** The person's profile method is a communication aid. */
  usesAid: boolean;
}) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const { phrase } = step;
  const words = useMemo(() => targetWordTokens(phrase.text), [phrase.text]);
  const [notSaid, setNotSaid] = useState<number[]>([]);
  const [micOpen, setMicOpen] = useState(false);
  const [micState, setMicState] = useState<"idle" | "starting" | "listening">(
    "idle",
  );
  const [heard, setHeard] = useState("");
  const [micStatus, setMicStatus] = useState("");
  const stopMic = useRef<(() => void) | null>(null);
  const canUseMic = useMemo(
    () => !usesAid && recognitionAvailable(),
    [usesAid],
  );

  function endMic() {
    stopMic.current?.();
    stopMic.current = null;
    setMicState("idle");
  }
  useEffect(() => {
    const stop = () => {
      stopMic.current?.();
      stopMic.current = null;
      setMicState("idle");
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("sollu:stop", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stop();
      window.removeEventListener("sollu:stop", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  function finish(result: SpokenResult) {
    endMic();
    onDone({ kind: "spoken", result });
  }
  function listenOnce() {
    // Tapping this button is the explicit permission for this attempt only.
    let ended = false;
    audio.stop();
    endMic();
    setHeard("");
    setMicStatus("");
    setMicState("starting");
    try {
      const stop = startPracticeTranscript(
        phrase.lang,
        (text) => setHeard(text),
        (error) => {
          ended = true;
          stopMic.current = null;
          setMicState("idle");
          if (error) setMicStatus(error);
        },
        () => setMicState("listening"),
      );
      if (!ended) stopMic.current = stop;
    } catch (error) {
      setMicState("idle");
      setMicStatus(
        error instanceof Error
          ? error.message
          : t("Speech recognition is not available.", "பேச்சு அறிதல் இல்லை."),
      );
    }
  }
  const score = heard ? scoreTranscript(phrase.text, heard) : null;
  const busy = micState !== "idle";

  return (
    <>
      <PhraseCard icon={phrase.icon} text={phrase.text} lang={phrase.lang} />
      <HelpPracticeNote phraseKey={phrase.key} ui={ui} />
      <div className="companion-row">
        <ListenButton
          text={phrase.text}
          lang={phrase.lang}
          label={t("Listen", "கேள்")}
          disabled={!ready || busy}
          onUnavailable={onVoiceUnavailable}
        />
      </div>
      <p className="companion-instruction">
        {t(
          "Say it when you are ready. Pointing or your aid is fine too.",
          "தயாரானதும் சொல்லுங்கள். காட்டியோ உதவிக் கருவியாலோ சொல்லலாம்.",
        )}
      </p>
      <div className="companion-results">
        {!usesAid && (
          <TapButton
            className="companion-result primary"
            disabled={!ready || busy}
            onActivate={() => finish({ type: "said" })}
          >
            <Check aria-hidden="true" />
            <span>{t("Said it", "சொன்னேன்")}</span>
          </TapButton>
        )}
        <TapButton
          className={`companion-result${usesAid ? " primary" : ""}`}
          disabled={!ready || busy}
          onActivate={() => finish({ type: "aid" })}
        >
          <Hand aria-hidden="true" />
          <span>
            {t(
              "I practised using my communication aid",
              "என் உதவிக் கருவியுடன் பழகினேன்",
            )}
          </span>
        </TapButton>
        <TapButton
          className="companion-result"
          disabled={!ready || busy}
          onActivate={() => finish({ type: "notYet" })}
        >
          <CircleSlash aria-hidden="true" />
          <span>{t("Not yet", "இன்னும் இல்லை")}</span>
        </TapButton>
      </div>
      {!usesAid && words.length > 1 && (
        <div
          className="companion-chips"
          role="group"
          aria-label={t(
            "Tap any word that was not clear",
            "தெளிவாக வராத சொல்லைத் தொடுங்கள்",
          )}
        >
          <small>
            {t(
              "Tap any word that was not clear",
              "தெளிவாக வராத சொல்லைத் தொடுங்கள்",
            )}
          </small>
          <div className="companion-chip-row">
            {words.map((word, index) => (
              <TapButton
                key={`${word}-${index}`}
                lang={phrase.lang}
                aria-pressed={notSaid.includes(index)}
                className={
                  notSaid.includes(index)
                    ? "companion-chip missed"
                    : "companion-chip"
                }
                disabled={!ready || busy}
                onActivate={() =>
                  setNotSaid((current) =>
                    current.includes(index)
                      ? current.filter((item) => item !== index)
                      : [...current, index].sort((a, b) => a - b),
                  )
                }
              >
                {word}
              </TapButton>
            ))}
          </div>
          {notSaid.length > 0 && (
            <TapButton
              className="companion-result primary"
              disabled={!ready || busy}
              onActivate={() => finish({ type: "words", notSaid })}
            >
              <ArrowRight aria-hidden="true" />
              <span>{t("Save and continue", "சேமித்துத் தொடருங்கள்")}</span>
            </TapButton>
          )}
        </div>
      )}
      {canUseMic && (
        <div className="companion-mic">
          {!micOpen ? (
            <TapButton
              className="secondary"
              disabled={!ready}
              aria-expanded={false}
              onActivate={() => setMicOpen(true)}
            >
              <Mic aria-hidden="true" />
              <span>{t("Check with microphone", "மைக் மூலம் சரிபார்")}</span>
            </TapButton>
          ) : (
            <>
              <p className="companion-note">
                {recognitionMode === "browser"
                  ? t(
                      "Your browser may send microphone audio to its speech-recognition service. It listens once, only after you tap.",
                      "உங்கள் உலாவி மைக் ஒலியை அதன் பேச்சு அறியும் சேவைக்கு அனுப்பலாம். நீங்கள் தொட்ட பிறகு ஒருமுறை மட்டும் கேட்கும்.",
                    )
                  : t(
                      "Only an on-device recognizer with an installed language pack can run. It listens once, only after you tap.",
                      "சாதனத்திலேயே உள்ள பேச்சு அறிதல் மட்டும் இயங்கும். நீங்கள் தொட்ட பிறகு ஒருமுறை மட்டும் கேட்கும்.",
                    )}
              </p>
              <div className="companion-row">
                {micState === "idle" ? (
                  <TapButton
                    className="secondary"
                    disabled={!ready}
                    onActivate={listenOnce}
                  >
                    <Mic aria-hidden="true" />
                    <span>
                      {t("Allow and listen once", "அனுமதித்து ஒருமுறை கேள்")}
                    </span>
                  </TapButton>
                ) : (
                  <TapButton className="secondary" onActivate={endMic}>
                    <MicOff aria-hidden="true" />
                    <span>{t("Stop listening", "கேட்பதை நிறுத்து")}</span>
                  </TapButton>
                )}
              </div>
              {busy && <p role="status">{t("Listening…", "கேட்கிறது…")}</p>}
              {heard && (
                <div className="companion-heard">
                  <p>
                    {t("Heard:", "கேட்டது:")}{" "}
                    <span lang={phrase.lang}>{heard}</span>
                  </p>
                  <p>
                    <strong>
                      {score?.matchPct === null || score === null
                        ? t("Not scored", "மதிப்பிடப்படவில்லை")
                        : t(
                            `${Math.round(score.matchPct)}% text match — words only, not pronunciation`,
                            `${Math.round(score.matchPct)}% சொல் பொருத்தம் — வார்த்தைகள் மட்டும், உச்சரிப்பு அல்ல`,
                          )}
                    </strong>
                  </p>
                  <TapButton
                    className="secondary"
                    disabled={!ready || busy}
                    onActivate={() =>
                      finish({ type: "browser", transcript: heard })
                    }
                  >
                    <ArrowRight aria-hidden="true" />
                    <span>
                      {t(
                        "Continue with this transcript",
                        "இந்த எழுத்துடன் தொடருங்கள்",
                      )}
                    </span>
                  </TapButton>
                </div>
              )}
              {micStatus && <p role="status">{micStatus}</p>}
            </>
          )}
        </div>
      )}
    </>
  );
}

/** b. Choose the phrase that fits the picture. No penalty for a wrong choice. */
export function ChooseStep({
  step,
  ui,
  ready,
  onDone,
  onVoiceUnavailable,
}: StepProps<"choose">) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const { phrase, options } = step;
  const [picked, setPicked] = useState<string | null>(null);
  const right = picked === phrase.key;
  return (
    <>
      <div className="companion-cue">
        <span className="companion-phrase-icon" aria-hidden="true">
          {phrase.icon}
        </span>
        {phrase.cue && <p lang={phrase.lang}>{phrase.cue}</p>}
      </div>
      <div
        className="companion-options"
        role="group"
        aria-label={t(
          "Choose the phrase",
          "சரியான வாக்கியத்தைத் தேர்ந்தெடுங்கள்",
        )}
      >
        {options.map((option) => {
          const state =
            picked === null
              ? ""
              : option.key === phrase.key
                ? " right"
                : option.key === picked
                  ? " picked"
                  : "";
          return (
            <div className="companion-option-row" key={option.key}>
              <TapButton
                className={`companion-option${state}`}
                lang={option.lang}
                aria-pressed={picked === option.key}
                aria-disabled={picked !== null}
                disabled={!ready}
                onActivate={() => {
                  if (picked === null) setPicked(option.key);
                }}
              >
                <span>{option.text}</span>
                {picked !== null && option.key === phrase.key && (
                  <Check aria-hidden="true" />
                )}
              </TapButton>
              <ListenButton
                className="companion-listen-small"
                text={option.text}
                lang={option.lang}
                label={t("Listen", "கேள்")}
                disabled={!ready}
                onUnavailable={onVoiceUnavailable}
                iconOnly
              />
            </div>
          );
        })}
      </div>
      <div aria-live="polite" className="companion-feedback">
        {picked !== null &&
          (right ? (
            <p>{t("Yes, that's it.", "ஆமா, அதுதான்!")}</p>
          ) : (
            <p>
              {t("This one fits the picture:", "படத்துக்குப் பொருந்துவது இது:")}{" "}
              <strong lang={phrase.lang}>{phrase.text}</strong>
            </p>
          ))}
      </div>
      {picked !== null && (
        <TapButton
          className="companion-next primary"
          disabled={!ready}
          onActivate={() =>
            onDone({ kind: "exercise", outcome: right ? "correct" : "missed" })
          }
        >
          <ArrowRight aria-hidden="true" />
          <span>{t("Next", "அடுத்து")}</span>
        </TapButton>
      )}
    </>
  );
}

/** c. Build the sentence by tapping word tiles in order. */
export function BuildStep({
  step,
  ui,
  ready,
  onDone,
  onVoiceUnavailable,
}: StepProps<"build">) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const { phrase, words, tileOrder } = step;
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<"right" | "wrong" | null>(null);
  const [firstOutcome, setFirstOutcome] = useState<Outcome | null>(null);
  const complete = placed.length === words.length;
  function check() {
    const ok = builtMatches(words, placed);
    setChecked(ok ? "right" : "wrong");
    if (firstOutcome === null) setFirstOutcome(ok ? "correct" : "missed");
  }
  return (
    <>
      <div className="companion-cue">
        <span className="companion-phrase-icon" aria-hidden="true">
          {phrase.icon}
        </span>
        {phrase.cue && <p lang={phrase.lang}>{phrase.cue}</p>}
      </div>
      <p className="companion-instruction">
        {t(
          "Tap the words in order. Tap a placed word to remove it.",
          "வார்த்தைகளை வரிசையாகத் தொடுங்கள். நீக்க, வைத்த வார்த்தையைத் தொடுங்கள்.",
        )}
      </p>
      <div
        className="companion-built"
        role="group"
        aria-label={t("Your sentence", "உங்கள் வாக்கியம்")}
      >
        {placed.length === 0 && (
          <span className="companion-built-empty" aria-hidden="true">
            …
          </span>
        )}
        {placed.map((index, position) => (
          <TapButton
            key={`placed-${index}`}
            className="companion-tile placed"
            lang={phrase.lang}
            aria-label={`${t("Remove", "நீக்கு")}: ${words[index]}`}
            disabled={!ready || checked === "right"}
            onActivate={() => {
              setChecked(null);
              setPlaced((current) =>
                current.filter((_, item) => item !== position),
              );
            }}
          >
            {words[index]}
          </TapButton>
        ))}
      </div>
      <div
        className="companion-bank"
        role="group"
        aria-label={t("Word tiles", "வார்த்தைகள்")}
      >
        {tileOrder.map((index) =>
          placed.includes(index) ? (
            <span
              key={`bank-${index}`}
              className="companion-tile-gap"
              aria-hidden="true"
            />
          ) : (
            <TapButton
              key={`bank-${index}`}
              className="companion-tile"
              lang={phrase.lang}
              disabled={!ready || checked === "right"}
              onActivate={() => {
                setChecked(null);
                setPlaced((current) =>
                  current.includes(index) ? current : [...current, index],
                );
              }}
            >
              {words[index]}
            </TapButton>
          ),
        )}
      </div>
      <div aria-live="polite" className="companion-feedback">
        {checked === "right" && (
          <p>
            {t("Well done — that's the sentence.", "நல்லது — வாக்கியம் சரி.")}
          </p>
        )}
        {checked === "wrong" && (
          <p>
            {t("Here is the sentence:", "வாக்கியம் இதுதான்:")}{" "}
            <strong lang={phrase.lang}>{phrase.text}</strong>
          </p>
        )}
      </div>
      <div className="companion-row">
        {checked === null && (
          <TapButton
            className="companion-next primary"
            disabled={!ready || !complete}
            onActivate={check}
          >
            <Check aria-hidden="true" />
            <span>{t("Check", "சரிபார்")}</span>
          </TapButton>
        )}
        {checked === "wrong" && (
          <TapButton
            className="secondary"
            disabled={!ready}
            onActivate={() => {
              setChecked(null);
              setPlaced([]);
            }}
          >
            <RotateCcw aria-hidden="true" />
            <span>{t("Try again", "மீண்டும் முயலுங்கள்")}</span>
          </TapButton>
        )}
        {checked !== null && (
          <>
            <ListenButton
              text={phrase.text}
              lang={phrase.lang}
              label={t("Listen", "கேள்")}
              disabled={!ready}
              onUnavailable={onVoiceUnavailable}
            />
            <TapButton
              className="companion-next primary"
              disabled={!ready}
              onActivate={() =>
                onDone({
                  kind: "exercise",
                  outcome: firstOutcome ?? "missed",
                })
              }
            >
              <ArrowRight aria-hidden="true" />
              <span>{t("Next", "அடுத்து")}</span>
            </TapButton>
          </>
        )}
      </div>
    </>
  );
}

/** d. Say it your way — speaking, typing and pointing all count. */
export function YourWayStep({
  step,
  ui,
  ready,
  onDone,
  onVoiceUnavailable,
}: StepProps<"yourWay">) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const { phrase } = step;
  const [method, setMethod] = useState<"speak" | "type" | "point">("speak");
  const [typed, setTyped] = useState("");
  const methods: [typeof method, string, typeof MessageCircle][] = [
    ["speak", t("Spoke", "பேசினேன்"), MessageCircle],
    ["type", t("Typed", "எழுதினேன்"), Keyboard],
    ["point", t("Pointed", "காட்டினேன்"), Hand],
  ];
  return (
    <>
      <PhraseCard icon={phrase.icon} text={phrase.text} lang={phrase.lang} />
      <HelpPracticeNote phraseKey={phrase.key} ui={ui} />
      <div className="companion-row">
        <ListenButton
          text={phrase.text}
          lang={phrase.lang}
          label={t("Listen", "கேள்")}
          disabled={!ready}
          onUnavailable={onVoiceUnavailable}
        />
      </div>
      <p className="companion-instruction">
        {t(
          "Speak, type or point — every way counts.",
          "பேசலாம், எழுதலாம், காட்டலாம் — எல்லாமே சரி.",
        )}
      </p>
      <div
        className="companion-methods"
        role="group"
        aria-label={t("Say it your way", "உங்கள் வழியில் சொல்லுங்கள்")}
      >
        {methods.map(([id, label, Icon]) => (
          <TapButton
            key={id}
            className={
              method === id ? "companion-method selected" : "companion-method"
            }
            aria-pressed={method === id}
            disabled={!ready}
            onActivate={() => setMethod(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </TapButton>
        ))}
      </div>
      {method === "type" && (
        <label className="companion-type">
          {t("Type here (not saved)", "இங்கே எழுதுங்கள் (சேமிக்கப்படாது)")}
          <textarea
            lang={phrase.lang}
            maxLength={300}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>
      )}
      <div className="companion-row">
        <TapButton
          className="companion-next primary"
          disabled={!ready}
          onActivate={() =>
            onDone({ kind: "spoken", result: { type: "yourWay", method } })
          }
        >
          <Check aria-hidden="true" />
          <span>{t("I did it", "செய்தேன்")}</span>
        </TapButton>
        <TapButton
          className="secondary"
          disabled={!ready}
          onActivate={() => onDone({ kind: "skipped" })}
        >
          <ArrowRight aria-hidden="true" />
          <span>{t("Skip", "தவிர்")}</span>
        </TapButton>
      </div>
    </>
  );
}
