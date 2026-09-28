import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, Video, BookOpen, Coffee, Check, Volume2 } from "lucide-react";
import { db } from "../../db";
import { useApp } from "../../state";
import { Back, PageTitle, TapButton } from "../../ui";
import { audio } from "../audio";
import {
  CONDITION_PROFILES,
  EXERCISES,
  LOCAL_PATIENT_ID,
  daypartAt,
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
import { scoreTranscript, suggestPracticeTargets } from "./analysis";
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

function Rating({
  label,
  value,
  set,
}: {
  label: string;
  value: number | null;
  set: (value: number | null) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value ?? ""}
        onChange={(event) =>
          set(event.target.value === "" ? null : Number(event.target.value))
        }
      >
        <option value="">Not recorded</option>
        {Array.from({ length: 11 }, (_, i) => (
          <option key={i} value={i}>
            {i}
            {i === 0 ? " · none" : i === 10 ? " · most" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
function UnderstandingInput({
  label,
  value,
  set,
}: {
  label: string;
  value: Understanding;
  set: (value: Understanding) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => set(event.target.value as Understanding)}
      >
        <option value="unknown">Not checked</option>
        <option value="yes">Yes</option>
        <option value="partly">Partly</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

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
  const recognitionMode = useSpeechRecognitionMode();
  const navigate = useNavigate();
  const location = useLocation();
  const condition = CONDITION_PROFILES.find(
    (item) => item.id === profile.condition,
  )!;
  const targets = useMemo(
    () => [
      ...EXERCISES.filter(
        (item) =>
          plan.exerciseIds.includes(item.id) &&
          item.language === profile.language,
      ),
      ...plan.customTargets.map((target, i) => ({
        id: `custom-${i}`,
        title: "My practice",
        kind: "sentence" as PracticeKind,
        target,
        language: profile.language,
        instruction:
          "Use the communication method and strategies in your agreed plan.",
      })),
    ],
    [plan, profile.language],
  );
  const [selected, setSelected] = useState(targets[0]?.id ?? "personal");
  const [custom, setCustom] = useState("");
  const [customKind, setCustomKind] = useState<PracticeKind>("sentence");
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
  const [before, setBefore] = useState<number | null>(null),
    [after, setAfter] = useState<number | null>(null),
    [effort, setEffort] = useState<number | null>(null);
  const [self, setSelf] = useState<Understanding>("unknown"),
    [partner, setPartner] = useState<Understanding>("unknown");
  const [aac, setAac] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false),
    [transcriptConsent, setTranscriptConsent] = useState(false);
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
      setStatus("A reviewed word is ready. Start when you are comfortable.");
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
  ]);
  const textScore = useMemo(
    () => scoreTranscript(target, usesCommunicationAid ? "" : transcript),
    [target, transcript, usesCommunicationAid],
  );
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
    if (response === null && began !== null)
      setResponse(Math.max(0, (performance.now() - realStart.current) / 1000));
  }
  function reset() {
    cancelInputs();
    audio.stop();
    setBegan(null);
    setSnapshot(null);
    setResponse(null);
    setClip(null);
    setTranscript("");
    setRawTranscript("");
    setSource("none");
    setReviewed(false);
    setMisses([]);
    setAfter(null);
    setBefore(null);
    setConsent(false);
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
  async function record(mediaKind: "audio" | "video") {
    if (!consent || began === null || active || resting) return;
    audio.stop();
    setTranscript("");
    setRawTranscript("");
    setSource("none");
    setReviewed(false);
    setMisses([]);
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
        confirmedMissedWords: reviewed ? misses : [],
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
        "Practice saved on this device. Your therapist can review it in the dashboard.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Practice could not be saved. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rehab-page">
      <Back to="/rehabilitation" label="My rehabilitation" />
      <PageTitle
        eyebrow="YOUR WORDS, YOUR PACE"
        title="Communication practice"
        subtitle="Small, useful messages. Rest whenever you need. Speaking, typing and AAC all count."
      />
      <div className="rehab-banner">
        <BookOpen aria-hidden="true" />
        <div>
          <strong>{condition.label}</strong>
          <p>{condition.focus}</p>
          <p>{condition.caution}</p>
        </div>
      </div>
      <details className="panel">
        <summary>My plan and progress</summary>
        <p>
          Suggested practice window: {profile.practiceMinutes} minutes. This is
          a preference, not a treatment dose.
        </p>
        <p>
          {profile.clinicianInstructions ||
            "Ask your speech-language therapist to help choose goals and strategies."}
        </p>
        <ul>
          {profile.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
        <p>
          {records.length} saved attempts. Follow your weekly activity in My
          rehabilitation, or review the plan and evidence with your clinician.
        </p>
        <TapButton onActivate={() => navigate("/rehabilitation?tab=progress")}>
          View my progress
        </TapButton>
        <TapButton onActivate={() => navigate("/clinician?view=rehab")}>
          Open clinician review
        </TapButton>
      </details>
      <section className="panel rehab-task">
        <h2>1. Choose a message</h2>
        <label>
          Practice message
          <select
            value={selected}
            disabled={began !== null}
            onChange={(event) => setSelected(event.target.value)}
          >
            {targets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}: {item.target}
              </option>
            ))}
            <option value="personal">My own message</option>
          </select>
        </label>
        {selected === "personal" && (
          <label>
            My practice words
            <textarea
              maxLength={300}
              value={custom}
              disabled={began !== null}
              onChange={(event) => {
                setCustom(event.target.value);
                if (/\s/u.test(event.target.value.trim()))
                  setCustomKind("sentence");
              }}
            />
          </label>
        )}
        {!began && recentMessages.length > 0 && (
          <details>
            <summary>Practise a message I used</summary>
            {recentMessages.map((text) => (
              <TapButton
                key={text}
                onActivate={() => {
                  setSelected("personal");
                  setCustom(text);
                  setCustomKind("sentence");
                }}
              >
                {text}
              </TapButton>
            ))}
          </details>
        )}
        {difficult.length > 0 && (
          <p className="muted">
            Confirmed words for more practice:{" "}
            {difficult.map((item) => item.target).join(", ")}. Your therapist
            can add these to your plan.
          </p>
        )}
        {began === null &&
          difficult.map((item) => (
            <TapButton
              key={item.target}
              onActivate={() => {
                setSelected("personal");
                setCustom(item.target);
                setCustomKind("word");
              }}
            >
              Practise this word: {item.target}
            </TapButton>
          ))}
        <p className="rehab-target" lang={language}>
          {target || "Choose words that matter to you."}
        </p>
        <p>{exercise?.instruction}</p>
        <Rating
          label="Tiredness before practice · 0 to 10"
          value={before}
          set={setBefore}
        />
        {before !== null && before >= profile.fatigueLimit && (
          <p className="notice">
            You reported tiredness at your rest threshold. Consider resting or
            using AAC. There is no need to push through.
          </p>
        )}
        {began === null && (
          <TapButton
            className="primary"
            disabled={!target}
            onActivate={() => {
              setBegan(Date.now());
              setSnapshot({
                target,
                kind,
                language: profile.language,
                communicationMethod: profile.communicationMethod,
                place: settings.place,
              });
              realStart.current = performance.now();
              setStatus("Ready. Take your time; there is no score for speed.");
            }}
          >
            Start this practice
          </TapButton>
        )}
      </section>
      {began !== null && !saved && (
        <>
          <section className="panel rehab-task">
            <h2>2. Practise in your own way</h2>
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
                Listen to example: {target}
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
                  "Ready to continue"
                ) : (
                  <>
                    <Coffee />
                    Take a break
                  </>
                )}
              </TapButton>
            </div>
            <p>
              Response time measures readiness to start, not the onset or
              quality of speech. Taking a break resets this measure.
            </p>
            {!resting && (
              <>
                <label className="rehab-check">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={active}
                    onChange={(event) => {
                      setConsent(event.target.checked);
                      if (!event.target.checked) setClip(null);
                    }}
                  />
                  I agree to record this practice and keep it on this device.
                  Include another person only with their permission.
                </label>
                <p>
                  Recording is optional. Microphone/camera are used only after
                  your tap. Clips stop at 2 minutes or 20 MB. Recordings are not
                  sent to an AI provider. Starting a recording clears an earlier
                  transcript. Review the clip and type what was actually heard
                  to compare it with the prompt.
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
                  <TapButton
                    disabled={!consent || active || Boolean(clip)}
                    onActivate={() => void record("audio")}
                  >
                    <Mic />
                    Record audio
                  </TapButton>
                  <TapButton
                    disabled={!consent || active || Boolean(clip)}
                    onActivate={() => void record("video")}
                  >
                    <Video />
                    Record video
                  </TapButton>
                  {captureState === "recording" && (
                    <TapButton
                      className="primary"
                      onActivate={() => finishRecording.current()}
                    >
                      Finish recording
                    </TapButton>
                  )}
                  {captureState !== "idle" && (
                    <TapButton onActivate={cancelInputs}>
                      Cancel recording
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
                      Discard this recording
                    </TapButton>
                  </>
                )}
                <details>
                  <summary>Optional browser transcript</summary>
                  {recognitionMode === "local" && (
                    <p className="notice">
                      Local speech recognition is selected. This requires a
                      browser with supported on-device recognition and an
                      installed language pack. Otherwise, enter the words while
                      reviewing your recording. No online fallback or automatic
                      language-pack download is used.
                    </p>
                  )}
                  <p>
                    {recognitionMode === "browser"
                      ? "Your browser may send microphone audio to its speech-recognition service. "
                      : "Only a supported on-device recognizer can run. "}
                    Availability and accuracy vary. Use a partner-entered
                    transcript to keep this step local. This transcribes a new
                    live attempt, not a saved recording. With a saved clip, use
                    a transcript entered while reviewing it.
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
                <TapButton
                  disabled={active}
                  onActivate={() => {
                    noteResponse();
                    setAac(true);
                    setStatus(
                      "Communication-aid task marked complete. Check the meaning with your partner.",
                    );
                  }}
                >
                  I practised using my communication aid
                </TapButton>
              </>
            )}
          </section>
          <section className="panel rehab-task">
            <h2>3. Check together</h2>
            <label>
              Words actually heard (optional)
              <textarea
                maxLength={1000}
                value={transcript}
                disabled={active}
                onChange={(event) => {
                  noteResponse();
                  setTranscript(event.target.value);
                  if (source !== "browser") setSource("manual");
                  setReviewed(false);
                  setMisses([]);
                }}
              />
            </label>
            <p>
              Type what was heard, including differences. Do not replace it with
              the target to improve the score.
            </p>
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
            <div className="rehab-score">
              <strong>
                {usesCommunicationAid
                  ? "Not scored · communication aid"
                  : textScore.matchPct === null
                    ? "Not scored"
                    : `${Math.round(textScore.matchPct)}% text match${reviewed ? "" : " · awaiting transcript review"}`}
              </strong>
              <p>
                {usesCommunicationAid
                  ? "Communication-aid practice is tracked through participation and reported understanding, without transcript scoring."
                  : "Compares words in the transcript with the prompt. This is not pronunciation, intelligibility, diagnosis or a recovery score. Recognition can make mistakes."}
              </p>
            </div>
            {reviewWords.length > 0 && (
              <fieldset>
                <legend>Which words would you like to practise again?</legend>
                <p>
                  Only check a word after reviewing it together. These choices
                  personalize practice.
                </p>
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
            <div className="rehab-form-grid">
              <UnderstandingInput
                label="Did I get my meaning across?"
                value={self}
                set={setSelf}
              />
              <UnderstandingInput
                label="Did my partner understand?"
                value={partner}
                set={setPartner}
              />
              <Rating
                label="Tiredness after practice · 0 to 10"
                value={after}
                set={setAfter}
              />
              <Rating label="Effort · 0 to 10" value={effort} set={setEffort} />
            </div>
            {after !== null && after >= profile.fatigueLimit && (
              <p className="notice">
                Time to consider a rest. You can finish here or switch to
                another communication method.
              </p>
            )}
            <label>
              What helped? (optional)
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <TapButton
              className="primary"
              disabled={active || busy}
              onActivate={() => void save()}
            >
              <Check />
              {busy ? "Saving…" : "Save practice"}
            </TapButton>
          </section>
        </>
      )}
      <p className="rehab-status" role="status">
        {status}
      </p>
      {saved && (
        <TapButton onActivate={() => navigate("/rehabilitation?tab=progress")}>
          See my updated progress
        </TapButton>
      )}
      {began !== null && (
        <TapButton onActivate={reset}>
          {saved
            ? "Choose another practice"
            : "Discard attempt and start again"}
        </TapButton>
      )}
      <p className="muted">
        Personalization uses your confirmed practice choices on this device. It
        does not retrain an acoustic model. Use the clinician dashboard to
        review the plan, recordings and reports.
      </p>
    </section>
  );
}
