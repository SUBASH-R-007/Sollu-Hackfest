import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mic,
  Video,
  Coffee,
  Check,
  Volume2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { db } from "../../db";
import { useApp } from "../../state";
import { Back, PageTitle, TapButton } from "../../ui";
import { copy } from "../../lib/copy";
import { audio } from "../audio";
import {
  CONDITION_PROFILES,
  LOCAL_PATIENT_ID,
  daypartAt,
  exerciseInLanguage,
  friendlyError,
  measuredSeconds,
  type RehabProfile,
  type RehabPlan,
  type PracticeRecord,
  type MediaRecord,
  type Understanding,
  type PracticeKind,
} from "./model";
import {
  getRehabProfile,
  getRehabPlan,
  listPractice,
  savePractice,
} from "./store";
import {
  markedTranscript,
  scoreTranscript,
  suggestPracticeTargets,
  targetWordTokens,
} from "./analysis";
import { captureEvidence, type EvidenceCapture } from "./capture";
import { startPracticeTranscript } from "./recognition";
import { useSpeechRecognitionMode } from "../privacy/useSpeechRecognitionMode";
import EvidencePlayer from "./EvidencePlayer";
import "./rehab.css";

export default function PracticePage() {
  const data = useLiveQuery(async () => {
    const [profile, plan, records] = await Promise.all([
      getRehabProfile(),
      getRehabPlan(),
      listPractice(),
    ]);
    return { profile, plan, records };
  }, []);
  if (!data) return <p role="status">Opening your practice…</p>;
  return <Practice {...data} />;
}

/** 0–10 as large buttons (no dropdowns or dragging). Tap again to clear. */
function ScaleButtons({
  label,
  hint,
  value,
  set,
}: {
  label: string;
  hint: string;
  value: number | null;
  set: (value: number | null) => void;
}) {
  return (
    <div className="rehab-scale" role="group" aria-label={label}>
      <strong>{label}</strong>
      <small>{hint}</small>
      <div className="rehab-scale-buttons">
        {Array.from({ length: 11 }, (_, i) => (
          <TapButton
            key={i}
            aria-label={`${label}: ${i}`}
            aria-pressed={value === i}
            className={value === i ? "selected" : ""}
            onActivate={() => set(value === i ? null : i)}
          >
            {i}
          </TapButton>
        ))}
      </div>
    </div>
  );
}

function UnderstandingButtons({
  label,
  value,
  set,
  lang,
}: {
  label: string;
  value: Understanding;
  set: (value: Understanding) => void;
  lang: "ta" | "en";
}) {
  const options: [Understanding, string][] = [
    ["yes", copy(lang, "Yes", "ஆம்")],
    ["partly", copy(lang, "Partly", "கொஞ்சம்")],
    ["no", copy(lang, "No", "இல்லை")],
  ];
  return (
    <div className="rehab-scale" role="group" aria-label={label}>
      <strong>{label}</strong>
      <div className="rehab-actions">
        {options.map(([option, text]) => (
          <TapButton
            key={option}
            aria-pressed={value === option}
            className={value === option ? "selected" : ""}
            onActivate={() => set(value === option ? "unknown" : option)}
          >
            {text}
          </TapButton>
        ))}
      </div>
    </div>
  );
}

type PracticeItem = {
  id: string;
  title: string;
  kind: PracticeKind;
  target: string;
  instruction?: string;
};
/** How the result was checked: one tap, word taps, typing or the browser. */
type CheckMode = "none" | "said" | "words" | "typed" | "browser";

function Practice({
  profile,
  plan,
  records,
}: {
  profile: RehabProfile;
  plan: RehabPlan;
  records: PracticeRecord[];
}) {
  const { settings } = useApp();
  const t = (en: string, ta: string) => copy(settings.lang, en, ta);
  const recognitionMode = useSpeechRecognitionMode();
  const navigate = useNavigate();
  const location = useLocation();
  const condition = CONDITION_PROFILES.find(
    (item) => item.id === profile.condition,
  )!;
  const targets = useMemo<PracticeItem[]>(
    () => [
      // A plan saved in one language still offers the profile language's version.
      ...[
        ...new Set(
          plan.exerciseIds.flatMap(
            (id) => exerciseInLanguage(id, profile.language) ?? [],
          ),
        ),
      ],
      ...plan.customTargets.map((target, i) => ({
        id: `custom-${i}`,
        title: copy(settings.lang, "My practice", "என் பயிற்சி"),
        kind: "sentence" as PracticeKind,
        target,
        instruction: copy(
          settings.lang,
          "Use the communication method and strategies in your agreed plan.",
          "உங்கள் திட்டத்தில் உள்ள முறையையும் உத்திகளையும் பயன்படுத்துங்கள்.",
        ),
      })),
    ],
    [plan, profile.language, settings.lang],
  );
  const [selected, setSelected] = useState(targets[0]?.id ?? "personal");
  const [custom, setCustom] = useState("");
  const [customKind, setCustomKind] = useState<PracticeKind>("sentence");
  const [writingOwn, setWritingOwn] = useState(false);
  const [snapshot, setSnapshot] = useState<Pick<
    PracticeRecord,
    "target" | "kind" | "language" | "communicationMethod" | "place"
  > | null>(null);
  const exercise = targets.find((item) => item.id === selected);
  const target = snapshot?.target ?? exercise?.target ?? custom.trim();
  const kind = snapshot?.kind ?? exercise?.kind ?? customKind;
  const usesCommunicationAid =
    kind === "aac" ||
    (snapshot?.communicationMethod ?? profile.communicationMethod) === "aac";
  const language = snapshot?.language ?? profile.language;
  const [began, setBegan] = useState<number | null>(null);
  const [response, setResponse] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [source, setSource] =
    useState<PracticeRecord["transcriptSource"]>("none");
  const [reviewed, setReviewed] = useState(false);
  const [misses, setMisses] = useState<string[]>([]);
  const [check, setCheck] = useState<CheckMode>("none");
  const [notSaid, setNotSaid] = useState<number[]>([]);
  const [before, setBefore] = useState<number | null>(null),
    [after, setAfter] = useState<number | null>(null),
    [effort, setEffort] = useState<number | null>(null);
  const [self, setSelf] = useState<Understanding>("unknown"),
    [partner, setPartner] = useState<Understanding>("unknown");
  const [aac, setAac] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [transcriptConsent, setTranscriptConsent] = useState(false);
  const [clip, setClip] = useState<MediaRecord | null>(null);
  const [captureState, setCaptureState] = useState<
    "idle" | "requesting" | "recording" | "stopping"
  >("idle");
  const [listening, setListening] = useState(false);
  const [transcriptStarting, setTranscriptStarting] = useState(false);
  const [resting, setResting] = useState(false),
    [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const capture = useRef<EvidenceCapture | null>(null),
    controller = useRef<AbortController | null>(null);
  const stopTranscript = useRef<(() => void) | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const mounted = useRef(true);
  const finishRecording = useRef<() => void>(() => undefined);
  const practiceId = useRef(crypto.randomUUID());
  const realStart = useRef(0);
  const active = captureState !== "idle" || listening || transcriptStarting;
  useEffect(() => {
    const state = location.state as { practiceTarget?: unknown } | null;
    const requested = state?.practiceTarget;
    if (!requested || typeof requested !== "object" || began !== null) return;
    const value = requested as Record<string, unknown>;
    if (
      value.language === profile.language &&
      value.method === profile.communicationMethod &&
      value.kind === "word" &&
      typeof value.target === "string" &&
      value.target.length <= 80 &&
      /^[\p{L}\p{M}\p{N}'’-]+$/u.test(value.target)
    ) {
      setSelected("personal");
      setCustom(value.target);
      setCustomKind("word");
      setWritingOwn(true);
      setStatus(
        copy(
          settings.lang,
          "A reviewed word is ready. Start when you are comfortable.",
          "சரிபார்த்த சொல் தயார். வசதியானபோது தொடங்குங்கள்.",
        ),
      );
    }
    // Do not put the word into a shareable URL or auto-start a performance.
    navigate(location.pathname, { replace: true, state: null });
  }, [
    location.state,
    location.pathname,
    navigate,
    profile.language,
    profile.communicationMethod,
    began,
    settings.lang,
  ]);
  const textScore = useMemo(
    () => scoreTranscript(target, usesCommunicationAid ? "" : transcript),
    [target, transcript, usesCommunicationAid],
  );
  const words = useMemo(() => targetWordTokens(target), [target]);
  const reviewWords = [
    ...new Set([
      ...textScore.omissions,
      ...textScore.substitutions.map((item) => item.expected),
    ]),
  ];
  const difficult = suggestPracticeTargets(
    records.filter(
      (record) =>
        record.language === profile.language &&
        record.communicationMethod === profile.communicationMethod,
    ),
    5,
  );
  const recent = useLiveQuery(
    () => db.attempts.orderBy("startedAt").reverse().limit(40).toArray(),
    [],
  );
  const recentMessages = [
    ...new Set(
      (recent ?? [])
        .filter(
          (item) =>
            item.communicationOutcome === "understood" &&
            item.outputLang === profile.language &&
            !item.demoClock &&
            !item.demoCached,
        )
        .map((item) => item.chosenText)
        .filter((text): text is string => Boolean(text)),
    ),
  ].slice(0, 4);
  function cancelInputs() {
    controller.current?.abort();
    capture.current?.cancel();
    capture.current = null;
    stopTranscript.current?.();
    stopTranscript.current = null;
    if (preview.current) preview.current.srcObject = null;
    setCaptureState("idle");
    setListening(false);
    setTranscriptStarting(false);
  }
  useEffect(() => {
    mounted.current = true;
    const stop = () => {
      cancelInputs();
      setStatus("Stopped. You can rest or continue without recording.");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("sollu:stop", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      capture.current?.cancel();
      stopTranscript.current?.();
      audio.stop();
      window.removeEventListener("sollu:stop", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  function noteResponse() {
    // A practice left open beyond the 24-hour measurement bound records a
    // missing response time rather than blocking the save.
    if (response === null && began !== null)
      setResponse(measuredSeconds(performance.now() - realStart.current));
  }
  function clearCheck() {
    setTranscript("");
    setRawTranscript("");
    setSource("none");
    setReviewed(false);
    setMisses([]);
    setCheck("none");
    setNotSaid([]);
  }
  function reset() {
    cancelInputs();
    audio.stop();
    setBegan(null);
    setSnapshot(null);
    setResponse(null);
    setClip(null);
    clearCheck();
    setAfter(null);
    setBefore(null);
    setTranscriptConsent(false);
    setEffort(null);
    setSelf("unknown");
    setPartner("unknown");
    setAac(null);
    setNotes("");
    setSaved(false);
    setResting(false);
    setStatus("");
    practiceId.current = crypto.randomUUID();
  }
  /** One tap chooses a message and starts the attempt. */
  function begin(item: { id: string; target: string; kind: PracticeKind }) {
    const text = item.target.trim();
    if (!text) return;
    const keepBefore = before;
    reset();
    setBefore(keepBefore);
    setSelected(item.id);
    if (item.id === "personal") {
      setCustom(text);
      setCustomKind(item.kind);
    }
    setBegan(Date.now());
    setSnapshot({
      target: text,
      kind: item.kind,
      language: profile.language,
      communicationMethod: profile.communicationMethod,
      place: settings.place,
    });
    realStart.current = performance.now();
    setStatus(
      t(
        "Ready. Take your time; there is no score for speed.",
        "தயார். நிதானமாகச் செய்யுங்கள்; வேகத்துக்கு மதிப்பெண் இல்லை.",
      ),
    );
  }
  /** A partner's one-tap check that every word was said as written. */
  function markSaid() {
    noteResponse();
    setTranscript(target);
    setRawTranscript("");
    setSource("manual");
    setReviewed(true);
    setMisses([]);
    setNotSaid([]);
    setCheck("said");
  }
  /** Tapping a word marks it as not said clearly; nothing needs typing. */
  function toggleWord(index: number) {
    noteResponse();
    const next = new Set(notSaid);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    const marked = markedTranscript(target, next);
    setTranscript(marked.transcript);
    setRawTranscript("");
    setSource("manual");
    // An empty result (nothing said) stays unscored, but the marks still count.
    setReviewed(Boolean(marked.transcript.trim()));
    setMisses(marked.missed);
    setNotSaid([...next].sort((a, b) => a - b));
    setCheck("words");
  }
  async function record(mediaKind: "audio" | "video") {
    // Tapping "Agree and record" is this attempt's explicit recording consent.
    if (began === null || active || resting) return;
    audio.stop();
    clearCheck();
    setCaptureState("requesting");
    setStatus("");
    const abort = new AbortController();
    controller.current = abort;
    const consentAt = Date.now();
    try {
      const recorder = await captureEvidence(mediaKind, abort.signal, () =>
        finishRecording.current(),
      );
      if (!mounted.current || abort.signal.aborted) {
        recorder.cancel();
        return;
      }
      capture.current = recorder;
      noteResponse();
      setCaptureState("recording");
      if (preview.current && mediaKind === "video")
        preview.current.srcObject = recorder.stream;
      finishRecording.current = () => {
        if (abort.signal.aborted) return;
        setCaptureState("stopping");
        void recorder
          .stop()
          .then(({ blob, durationSeconds }) => {
            if (!mounted.current || abort.signal.aborted) return;
            setClip({
              id: crypto.randomUUID(),
              patientId: LOCAL_PATIENT_ID,
              practiceId: practiceId.current,
              kind: mediaKind,
              mimeType: blob.type,
              blob,
              durationSeconds,
              createdAt: Date.now(),
              consentAt,
            });
            setStatus(
              "Recording ready. Review it, then save this attempt if you want to keep it.",
            );
          })
          .catch((error: Error) => {
            if (mounted.current && !abort.signal.aborted)
              setStatus(error.message);
          })
          .finally(() => {
            if (!mounted.current || abort.signal.aborted) return;
            capture.current = null;
            setCaptureState("idle");
            if (preview.current) preview.current.srcObject = null;
          });
      };
    } catch (error) {
      if (mounted.current && !abort.signal.aborted) {
        setStatus(
          error instanceof Error ? error.message : "Recording could not start.",
        );
        setCaptureState("idle");
      }
    }
  }
  async function save() {
    if (began === null || busy || active || saved) return;
    setBusy(true);
    try {
      const record: PracticeRecord = {
        id: practiceId.current,
        patientId: LOCAL_PATIENT_ID,
        createdAt: began,
        kind,
        language,
        communicationMethod:
          snapshot?.communicationMethod ?? profile.communicationMethod,
        target,
        transcript,
        rawTranscript: rawTranscript || undefined,
        transcriptSource: transcript.trim() ? source : "none",
        transcriptReviewed: reviewed,
        // Word taps are a person's explicit marks, even when nothing was said.
        confirmedMissedWords: reviewed || check === "words" ? misses : [],
        responseSeconds: response,
        recordingSeconds: clip?.durationSeconds ?? null,
        fatigueBefore: before,
        fatigueAfter: after,
        effort,
        selfUnderstanding: self,
        partnerUnderstanding: partner,
        aacCompleted: aac,
        mediaIds: clip ? [clip.id] : [],
        daypart: daypartAt(new Date(began)),
        place: snapshot?.place ?? settings.place,
        notes,
      };
      await savePractice(record, clip ? [clip] : []);
      setSaved(true);
      setStatus(
        t(
          "Practice saved on this device. Your therapist can review it in the dashboard.",
          "பயிற்சி இந்தச் சாதனத்தில் சேமிக்கப்பட்டது. உங்கள் சிகிச்சையாளர் பார்க்கலாம்.",
        ),
      );
    } catch (error) {
      setStatus(
        friendlyError(
          error,
          "Practice could not be saved. Your draft is still here.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const currentIndex = targets.findIndex((item) => item.id === selected);
  const nextItem =
    targets.length > 0
      ? targets[(currentIndex + 1) % targets.length]
      : undefined;
  const choices: PracticeItem[] = [
    ...targets,
    ...recentMessages
      .filter((text) => !targets.some((item) => item.target === text))
      .map((text) => ({
        id: "personal",
        title: t("A message I used", "நான் பயன்படுத்திய செய்தி"),
        kind: "sentence" as PracticeKind,
        target: text,
      })),
    ...difficult.map((item) => ({
      id: "personal",
      title: t("Practise this word again", "இந்தச் சொல்லை மீண்டும் பழகு"),
      kind: "word" as PracticeKind,
      target: item.target,
    })),
  ];
  const scoreText = usesCommunicationAid
    ? "Not scored · communication aid"
    : textScore.matchPct === null
      ? "Not scored"
      : `${Math.round(textScore.matchPct)}% text match${reviewed ? "" : " · awaiting transcript review"}`;
  return (
    <section className="rehab-page">
      <Back to="/rehabilitation" label="My rehabilitation" />
      <PageTitle
        eyebrow={t("YOUR WORDS, YOUR PACE", "உங்கள் வார்த்தைகள், உங்கள் வேகம்")}
        title={t("Communication practice", "பேச்சுப் பயிற்சி")}
        subtitle={t(
          "Tap a message to begin. Rest whenever you need.",
          "தொடங்க ஒரு செய்தியைத் தொடுங்கள். தேவைப்படும்போது ஓய்வெடுங்கள்.",
        )}
      />
      {began === null && (
        <section className="panel rehab-task">
          <h2>{t("Choose a message", "ஒரு செய்தியைத் தேர்ந்தெடுங்கள்")}</h2>
          {difficult.length > 0 && (
            <p className="muted">
              Confirmed words for more practice:{" "}
              {difficult.map((item) => item.target).join(", ")}.
            </p>
          )}
          <div className="rehab-cards">
            {choices.map((item) => (
              <TapButton
                key={`${item.id}:${item.target}`}
                className="rehab-card"
                onActivate={() => begin(item)}
              >
                <small>{item.title}</small>
                <span lang={profile.language}>{item.target}</span>
              </TapButton>
            ))}
            <TapButton
              className="rehab-card"
              aria-expanded={writingOwn}
              onActivate={() => {
                setWritingOwn(!writingOwn);
                setSelected("personal");
              }}
            >
              <small>{t("Write my own", "நானே எழுதுகிறேன்")}</small>
              <span>{t("My own message", "என் சொந்தச் செய்தி")}</span>
            </TapButton>
          </div>
          {writingOwn && (
            <>
              <label>
                {t("My practice words", "என் பயிற்சி வார்த்தைகள்")}
                <textarea
                  maxLength={300}
                  value={custom}
                  onChange={(event) => {
                    setSelected("personal");
                    setCustom(event.target.value);
                    setCustomKind(
                      /\s/u.test(event.target.value.trim())
                        ? "sentence"
                        : "word",
                    );
                  }}
                />
              </label>
              {custom.trim() && (
                <p className="rehab-target" lang={profile.language}>
                  {custom.trim()}
                </p>
              )}
              <TapButton
                className="primary"
                disabled={!custom.trim()}
                onActivate={() =>
                  begin({ id: "personal", target: custom, kind: customKind })
                }
              >
                {t("Start this practice", "பயிற்சியைத் தொடங்கு")}
              </TapButton>
            </>
          )}
          <details className="rehab-optional">
            <summary>
              {t(
                "How tired are you now? (optional)",
                "இப்போது எவ்வளவு சோர்வாக இருக்கிறீர்கள்? (விருப்பம்)",
              )}
            </summary>
            <ScaleButtons
              label={t("Tiredness before practice", "பயிற்சிக்கு முன் சோர்வு")}
              hint={t(
                "0 = not at all · 10 = the most",
                "0 = இல்லை · 10 = மிக அதிகம்",
              )}
              value={before}
              set={setBefore}
            />
          </details>
          {before !== null && before >= profile.fatigueLimit && (
            <p className="notice">
              {t(
                "You reported tiredness at your rest threshold. Consider resting or using AAC. There is no need to push through.",
                "நீங்கள் ஓய்வு எல்லையில் இருக்கிறீர்கள். ஓய்வெடுக்கலாம் அல்லது AAC பயன்படுத்தலாம். கட்டாயம் இல்லை.",
              )}
            </p>
          )}
        </section>
      )}
      {began !== null && !saved && (
        <section className="panel rehab-task">
          <p className="rehab-target" lang={language}>
            {target}
          </p>
          {exercise?.instruction && <p>{exercise.instruction}</p>}
          <div className="rehab-actions">
            <TapButton
              disabled={active || resting}
              onActivate={(event) => {
                const ticket = audio.createTap(event, target, {
                  role: "patient",
                  surface: "patient",
                });
                void audio
                  .speak({
                    text: target,
                    lang: language === "ta" ? "ta-IN" : "en-IN",
                    ticket,
                    channel: "preview",
                  })
                  .then((result) => {
                    if (result.status !== "completed")
                      setStatus(
                        "No example voice available. You can read or practise with a partner.",
                      );
                  });
              }}
            >
              <Volume2 />
              {t("Listen to example", "மாதிரியைக் கேளுங்கள்")}
            </TapButton>
            <TapButton
              onActivate={() => {
                cancelInputs();
                audio.stop();
                setResting(!resting);
                setResponse(null);
                realStart.current = performance.now();
              }}
            >
              {resting ? (
                t("Ready to continue", "தொடரத் தயார்")
              ) : (
                <>
                  <Coffee />
                  {t("Take a break", "ஓய்வு எடு")}
                </>
              )}
            </TapButton>
          </div>
          {!resting && (
            <>
              <p className="muted">
                {t(
                  "Recording is optional and stays on this device. Tapping Agree and record means you agree for this attempt; include other people only with their permission.",
                  "பதிவு விருப்பத்துக்குரியது; இந்தச் சாதனத்தில் மட்டும் இருக்கும். ‘ஒப்புக்கொண்டு பதிவு செய்’ தொட்டால் இந்த முயற்சிக்கு ஒப்புக்கொள்கிறீர்கள்; மற்றவர்களைப் பதிவு செய்ய அவர்கள் அனுமதி வேண்டும்.",
                )}
              </p>
              <video
                ref={preview}
                muted
                autoPlay
                playsInline
                className="rehab-preview"
                hidden={captureState !== "recording"}
                aria-label="Muted camera preview"
              />
              <div className="rehab-actions">
                {captureState === "idle" && !clip && (
                  <>
                    <TapButton onActivate={() => void record("audio")}>
                      <Mic />
                      {t("Agree and record audio", "ஒப்புக்கொண்டு ஒலிப்பதிவு")}
                    </TapButton>
                    <TapButton onActivate={() => void record("video")}>
                      <Video />
                      {t(
                        "Agree and record video",
                        "ஒப்புக்கொண்டு காணொளிப்பதிவு",
                      )}
                    </TapButton>
                  </>
                )}
                {captureState === "recording" && (
                  <TapButton
                    className="primary"
                    onActivate={() => finishRecording.current()}
                  >
                    {t("Finish recording", "பதிவை முடி")}
                  </TapButton>
                )}
                {captureState !== "idle" && (
                  <TapButton onActivate={cancelInputs}>
                    {t("Cancel recording", "பதிவை ரத்து செய்")}
                  </TapButton>
                )}
              </div>
              {captureState !== "idle" && (
                <p role="status">
                  {captureState === "requesting"
                    ? "Waiting for microphone/camera permission…"
                    : captureState === "stopping"
                      ? "Preparing your clip…"
                      : "Recording now. Finish or cancel at any time."}
                </p>
              )}
              {clip && (
                <>
                  <EvidencePlayer media={clip} />
                  <TapButton
                    onActivate={() => {
                      audio.stop();
                      setClip(null);
                    }}
                  >
                    {t("Discard this recording", "இந்தப் பதிவை நீக்கு")}
                  </TapButton>
                </>
              )}
            </>
          )}
          <h2>{t("How did it go?", "எப்படி இருந்தது?")}</h2>
          {usesCommunicationAid ? (
            <div className="rehab-actions">
              <TapButton
                className={aac === true ? "selected" : ""}
                aria-pressed={aac === true}
                disabled={active}
                onActivate={() => {
                  noteResponse();
                  setAac(true);
                  setStatus(
                    "Communication-aid task marked complete. Check the meaning with your partner.",
                  );
                }}
              >
                <Check />
                {t(
                  "I practised using my communication aid",
                  "என் உதவிக் கருவியுடன் பழகினேன்",
                )}
              </TapButton>
            </div>
          ) : (
            <>
              <div className="rehab-actions">
                <TapButton
                  className={check === "said" ? "selected" : ""}
                  aria-pressed={check === "said"}
                  disabled={active}
                  onActivate={markSaid}
                >
                  <Check />
                  {t("Said it", "சொன்னேன்")}
                </TapButton>
                {words.length === 1 && (
                  <TapButton
                    className={notSaid.length ? "selected" : ""}
                    aria-pressed={notSaid.length > 0}
                    disabled={active}
                    onActivate={() => toggleWord(0)}
                  >
                    {t("Not yet", "இன்னும் இல்லை")}
                  </TapButton>
                )}
                {/* Speaking, typing and AAC all count for every message. */}
                <TapButton
                  className={aac === true ? "selected" : ""}
                  aria-pressed={aac === true}
                  disabled={active}
                  onActivate={() => {
                    noteResponse();
                    setAac(true);
                    setStatus(
                      "Communication-aid task marked complete. Check the meaning with your partner.",
                    );
                  }}
                >
                  {t(
                    "I practised using my communication aid",
                    "என் உதவிக் கருவியுடன் பழகினேன்",
                  )}
                </TapButton>
              </div>
              {words.length > 1 && (
                <div
                  className="rehab-words"
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
                  {words.map((word, index) => (
                    <TapButton
                      key={`${word}-${index}`}
                      lang={language}
                      aria-pressed={notSaid.includes(index)}
                      className={
                        notSaid.includes(index)
                          ? "rehab-word missed"
                          : "rehab-word"
                      }
                      disabled={active}
                      onActivate={() => toggleWord(index)}
                    >
                      {word}
                    </TapButton>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="rehab-score">
            <strong>{scoreText}</strong>
          </div>
          <details
            className="rehab-optional"
            open={check === "typed" || check === "browser"}
          >
            <summary>
              {t("Type what was heard instead", "கேட்டதை எழுதுங்கள்")}
            </summary>
            <label>
              Words actually heard (optional)
              <textarea
                maxLength={1000}
                value={check === "said" || check === "words" ? "" : transcript}
                disabled={active}
                onChange={(event) => {
                  noteResponse();
                  setTranscript(event.target.value);
                  setRawTranscript(source === "browser" ? rawTranscript : "");
                  if (source !== "browser") setSource("manual");
                  setReviewed(false);
                  setMisses([]);
                  setNotSaid([]);
                  setCheck(source === "browser" ? "browser" : "typed");
                }}
              />
            </label>
            <p className="muted">
              Type what was heard, including differences. Do not replace it with
              the target to improve the score.
            </p>
            {(check === "typed" || check === "browser") && (
              <label className="rehab-check">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={!transcript.trim() || active}
                  onChange={(event) => {
                    setReviewed(event.target.checked);
                    if (!event.target.checked) setMisses([]);
                  }}
                />
                A person checked that this transcript reflects what was said
              </label>
            )}
            {(check === "typed" || check === "browser") &&
              reviewWords.length > 0 && (
                <fieldset>
                  <legend>Which words would you like to practise again?</legend>
                  {reviewWords.map((word) => (
                    <label className="rehab-check" key={word}>
                      <input
                        type="checkbox"
                        disabled={!reviewed}
                        checked={misses.includes(word)}
                        onChange={(event) =>
                          setMisses(
                            event.target.checked
                              ? [...misses, word]
                              : misses.filter((item) => item !== word),
                          )
                        }
                      />
                      {word}
                    </label>
                  ))}
                </fieldset>
              )}
          </details>
          <details className="rehab-optional">
            <summary>Optional browser transcript</summary>
            <p className="muted">
              {recognitionMode === "browser"
                ? "Your browser may send microphone audio to its speech-recognition service. "
                : "Only a supported on-device recognizer with an installed language pack can run; there is no online fallback. "}
              This transcribes a new live attempt, not a saved recording.
            </p>
            <label className="rehab-check">
              <input
                type="checkbox"
                checked={transcriptConsent}
                onChange={(event) => {
                  setTranscriptConsent(event.target.checked);
                  if (!event.target.checked) {
                    stopTranscript.current?.();
                    stopTranscript.current = null;
                    setListening(false);
                    setTranscriptStarting(false);
                  }
                }}
              />
              Allow browser speech recognition for this attempt
            </label>
            <TapButton
              disabled={!transcriptConsent || active || Boolean(clip)}
              onActivate={() => {
                let ended = false;
                try {
                  audio.stop();
                  stopTranscript.current?.();
                  stopTranscript.current = null;
                  noteResponse();
                  setStatus("");
                  setListening(false);
                  setTranscriptStarting(true);
                  const stop = startPracticeTranscript(
                    language,
                    (text) => {
                      setTranscript(text);
                      setRawTranscript(text);
                      setSource("browser");
                      setReviewed(false);
                      setMisses([]);
                      setNotSaid([]);
                      setCheck("browser");
                    },
                    (error) => {
                      ended = true;
                      stopTranscript.current = null;
                      setListening(false);
                      setTranscriptStarting(false);
                      if (error) setStatus(error);
                    },
                    () => {
                      setTranscriptStarting(false);
                      setListening(true);
                    },
                  );
                  // An implementation can end synchronously inside start().
                  if (!ended) stopTranscript.current = stop;
                } catch (error) {
                  setListening(false);
                  setTranscriptStarting(false);
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Transcription unavailable.",
                  );
                }
              }}
            >
              Start browser transcript
            </TapButton>
            {transcriptStarting && (
              <p role="status">
                Starting speech recognition. Waiting for the browser…
              </p>
            )}
            {listening && <p role="status">Listening for your words.</p>}
            {(listening || transcriptStarting) && (
              <TapButton
                onActivate={() => {
                  stopTranscript.current?.();
                  stopTranscript.current = null;
                  setListening(false);
                  setTranscriptStarting(false);
                }}
              >
                Stop transcript
              </TapButton>
            )}
          </details>
          <UnderstandingButtons
            label={t("Did my partner understand?", "என் துணைக்குப் புரிந்ததா?")}
            value={partner}
            set={setPartner}
            lang={settings.lang}
          />
          <details className="rehab-optional">
            <summary>
              {t("More details (optional)", "கூடுதல் விவரங்கள் (விருப்பம்)")}
            </summary>
            <UnderstandingButtons
              label={t("Did I get my meaning across?", "என் பொருள் புரிந்ததா?")}
              value={self}
              set={setSelf}
              lang={settings.lang}
            />
            <ScaleButtons
              label={t("Tiredness after practice", "பயிற்சிக்குப் பின் சோர்வு")}
              hint={t(
                "0 = not at all · 10 = the most",
                "0 = இல்லை · 10 = மிக அதிகம்",
              )}
              value={after}
              set={setAfter}
            />
            <ScaleButtons
              label={t("Effort", "முயற்சி")}
              hint={t(
                "0 = no effort · 10 = the most",
                "0 = முயற்சி இல்லை · 10 = மிக அதிகம்",
              )}
              value={effort}
              set={setEffort}
            />
            <label>
              {t("What helped? (optional)", "எது உதவியது? (விருப்பம்)")}
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </details>
          {after !== null && after >= profile.fatigueLimit && (
            <p className="notice">
              {t(
                "Time to consider a rest. You can finish here or switch to another communication method.",
                "ஓய்வெடுக்க நேரம். இங்கே முடிக்கலாம் அல்லது வேறு முறைக்கு மாறலாம்.",
              )}
            </p>
          )}
          <TapButton
            className="primary"
            disabled={active || busy}
            onActivate={() => void save()}
          >
            <Check />
            {busy
              ? t("Saving…", "சேமிக்கிறது…")
              : t("Save practice", "பயிற்சியைச் சேமி")}
          </TapButton>
        </section>
      )}
      <p className="rehab-status" role="status">
        {status}
      </p>
      {saved && (
        <div className="rehab-actions">
          {nextItem && (
            <TapButton className="primary" onActivate={() => begin(nextItem)}>
              <ArrowRight />
              {t("Next practice", "அடுத்த பயிற்சி")}:{" "}
              <span lang={profile.language}>{nextItem.target}</span>
            </TapButton>
          )}
          <TapButton
            onActivate={() => navigate("/rehabilitation?tab=progress")}
          >
            {t("See my updated progress", "என் முன்னேற்றத்தைப் பார்")}
          </TapButton>
        </div>
      )}
      {began !== null && (
        <TapButton onActivate={reset}>
          <RotateCcw />
          {saved
            ? t("Choose another practice", "வேறு பயிற்சியைத் தேர்ந்தெடு")
            : t(
                "Discard attempt and start again",
                "இதை விட்டுவிட்டு மீண்டும் தொடங்கு",
              )}
        </TapButton>
      )}
      <details className="panel rehab-optional">
        <summary>{t("About this practice", "இந்தப் பயிற்சி பற்றி")}</summary>
        <p>
          <strong>{condition.label}.</strong> {condition.focus}{" "}
          {condition.caution}
        </p>
        <p>
          Suggested practice window: {profile.practiceMinutes} minutes. This is
          a preference, not a treatment dose.{" "}
          {profile.clinicianInstructions ||
            "Ask your speech-language therapist to help choose goals and strategies."}
        </p>
        {profile.goals.length > 0 && (
          <ul>
            {profile.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        )}
        <p>
          Response time measures readiness to start, not the onset or quality of
          speech; a break resets it. Clips stop at 2 minutes or 20 MB and are
          never sent to an AI provider. Text match compares words with the
          prompt only — not pronunciation, intelligibility, diagnosis or
          recovery. Personalization uses your confirmed practice choices on this
          device and does not retrain an acoustic model. {records.length} saved
          attempts.
        </p>
        <TapButton onActivate={() => navigate("/clinician?view=rehab")}>
          Open clinician review
        </TapButton>
      </details>
    </section>
  );
}
