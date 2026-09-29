import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Coffee,
  Moon,
  Play,
  RotateCcw,
  Square,
  Check,
} from "lucide-react";
import type { Lang } from "@sollu/shared";
import { useApp } from "../../state";
import { PageTitle, TapButton } from "../../ui";
import { copy } from "../../lib/copy";
import { audio } from "../audio";
import { getRehabProfile, savePractice } from "../rehab/store";
import { targetWordTokens } from "../rehab/analysis";
import type { RehabProfile } from "../rehab/model";
import { useProgressClock } from "../rehab/useProgressClock";
import { useSpeechRecognitionMode } from "../privacy/useSpeechRecognitionMode";
import {
  buildReviewLesson,
  buildUnitLesson,
  reviewKeysFor,
  suggestedUnit,
  unitOfPhrase,
  unitsFor,
  type CompanionLang,
  type CompanionUnit,
  type Lesson,
} from "./content";
import {
  DAILY_GOALS,
  completeLesson,
  currentStreak,
  defaultProgress,
  recordStep,
  stepsToday,
  toggleRest,
  todayKey,
  weekDots,
  type CompanionProgress,
  type DotState,
} from "./progress";
import { parseDay } from "./scheduler";
import { loadProgress, updateProgress } from "./store";
import { spokenAttemptRecord } from "./practiceRecord";
import {
  BuildStep,
  ChooseStep,
  ListenStep,
  YourWayStep,
  type StepResult,
} from "./LessonSteps";
import "./companion.css";

export default function CompanionPage() {
  const profile = useLiveQuery(() => getRehabProfile(), []);
  const [progress, setProgress] = useState<CompanionProgress | null>(null);
  useEffect(() => {
    let live = true;
    void loadProgress()
      .catch(() => defaultProgress())
      .then((value) => {
        if (live) setProgress(value);
      });
    return () => {
      live = false;
    };
  }, []);
  if (!profile || !progress)
    return (
      <p role="status" className="companion-loading">
        Opening your companion…
      </p>
    );
  return (
    <Companion
      profile={profile}
      progress={progress}
      setProgress={setProgress}
    />
  );
}

interface LessonRun {
  lesson: Lesson;
  title: { en: string; ta: string };
  index: number;
  resting: boolean;
  /** Phrase keys with at least one finished step. */
  practised: string[];
  /** Phrases (and marked words) that came back as "not yet". */
  toReview: {
    key: string;
    text: string;
    lang: CompanionLang;
    words: string[];
  }[];
  saved: number;
  ended: "finished" | "stopped" | null;
}

function Companion({
  profile,
  progress,
  setProgress,
}: {
  profile: RehabProfile;
  progress: CompanionProgress;
  setProgress: (progress: CompanionProgress) => void;
}) {
  const { settings } = useApp();
  const ui = settings.lang;
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const recognitionMode = useSpeechRecognitionMode();
  const now = useProgressClock();
  const today = todayKey(now);
  const lang: CompanionLang = progress.contentLang ?? profile.language;
  const units = useMemo(() => unitsFor(lang), [lang]);
  const due = reviewKeysFor(progress.items, today, lang);
  const suggested = suggestedUnit(units, progress.lessons, lang);
  const [run, setRun] = useState<LessonRun | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [readyStep, setReadyStep] = useState<string | null>(null);
  const stepStartedAt = useRef(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const step =
    run && !run.ended && !run.resting ? run.lesson.steps[run.index] : undefined;
  const stepId = step?.id ?? null;
  const guardMs = Math.max(250, Math.min(1000, settings.tapFilterMs));

  // A new screen accepts taps after the person's tap filter, so a double tap
  // on the previous screen cannot answer it. There is no time limit.
  useEffect(() => {
    if (!stepId) return;
    stepStartedAt.current = Date.now();
    const timer = window.setTimeout(() => setReadyStep(stepId), guardMs);
    return () => window.clearTimeout(timer);
  }, [stepId, guardMs]);
  const screenKey = run
    ? `${run.index}:${run.resting}:${run.ended ?? ""}`
    : "home";
  useEffect(() => {
    if (screenKey !== "home") heading.current?.focus();
  }, [screenKey]);
  useEffect(() => () => audio.stop(), []);

  const saveProblem = () =>
    t(
      "Could not save on this device. You can keep going.",
      "இந்தச் சாதனத்தில் சேமிக்க முடியவில்லை. தொடரலாம்.",
    );
  async function save(
    change: (value: CompanionProgress) => CompanionProgress,
  ): Promise<boolean> {
    try {
      setProgress(await updateProgress(change));
      return true;
    } catch {
      setStatus(saveProblem());
      return false;
    }
  }

  function start(lesson: Lesson, title: { en: string; ta: string }) {
    if (!lesson.steps.length) return;
    audio.stop();
    setStatus("");
    setReadyStep(null);
    setRun({
      lesson,
      title,
      index: 0,
      resting: false,
      practised: [],
      toReview: [],
      saved: 0,
      ended: null,
    });
  }
  function startUnit(unit: CompanionUnit) {
    start(
      buildUnitLesson(unit, progress.lessons[`${unit.id}:${lang}`] ?? 0, lang),
      unit.title,
    );
  }
  function startReview() {
    start(buildReviewLesson(due, lang, today), {
      en: "Review",
      ta: "மீண்டும் பழகு",
    });
  }
  function continueNext() {
    if (due.length) startReview();
    else if (suggested) startUnit(suggested);
  }

  async function stepDone(result: StepResult) {
    if (!run || !step || busy || readyStep !== step.id) return;
    // An example still playing never carries over to the next screen.
    audio.stop();
    setBusy(true);
    const phrase = step.phrase;
    const unitTitle = unitOfPhrase(phrase.key)?.title.en ?? run.title.en;
    let outcome: "correct" | "missed" | undefined;
    let words: string[] = [];
    let saved = 0;
    let saveFailed = false;
    let message = "";
    if (result.kind === "spoken") {
      const attempt = spokenAttemptRecord({
        id: crypto.randomUUID(),
        createdAt: stepStartedAt.current,
        phrase,
        unitTitle,
        communicationMethod: profile.communicationMethod,
        place: settings.place,
        result: result.result,
      });
      outcome = attempt.outcome;
      words = attempt.words;
      try {
        await savePractice(attempt.record);
        saved = 1;
      } catch {
        saveFailed = true;
        message = t(
          "Could not save this attempt on the device. You can keep going.",
          "இந்த முயற்சியைச் சேமிக்க முடியவில்லை. தொடரலாம்.",
        );
      }
    } else if (result.kind === "exercise") outcome = result.outcome;
    if (
      result.kind !== "skipped" &&
      !(await save((value) =>
        recordStep(
          value,
          todayKey(),
          outcome ? { key: phrase.key, outcome, words } : undefined,
        ),
      )) &&
      !saveFailed
    ) {
      saveFailed = true;
      message = saveProblem();
    }
    if (!message && outcome === "correct") message = t("Well done.", "நல்லது!");
    if (!message && outcome === "missed")
      message = t(
        "That's fine. It will come back for review.",
        "பரவாயில்லை. மீண்டும் பழக வரும்.",
      );
    const finished = run.index + 1 >= run.lesson.steps.length;
    const toReview =
      outcome === "missed"
        ? [
            ...run.toReview.filter((item) => item.key !== phrase.key),
            {
              key: phrase.key,
              text: phrase.text,
              lang: phrase.lang,
              words: [
                ...new Set([
                  ...(run.toReview.find((item) => item.key === phrase.key)
                    ?.words ?? []),
                  ...words,
                ]),
              ],
            },
          ]
        : run.toReview;
    if (finished && run.lesson.kind === "unit" && run.lesson.unitId) {
      const unitId = run.lesson.unitId;
      await save((value) => completeLesson(value, unitId, run.lesson.lang));
    }
    // Merge onto the latest run: Stop or Rest may have been tapped while saving.
    setRun((current) =>
      current && current.lesson === run.lesson
        ? {
            ...current,
            index:
              finished || current.ended ? current.index : current.index + 1,
            practised:
              result.kind === "skipped" ||
              current.practised.includes(phrase.key)
                ? current.practised
                : [...current.practised, phrase.key],
            toReview,
            saved: current.saved + saved,
            ended: finished ? "finished" : current.ended,
          }
        : current,
    );
    setStatus(finished && !saveFailed ? "" : message);
    setBusy(false);
  }

  function stop() {
    audio.stop();
    setStatus("");
    if (!run) return;
    if (!run.practised.length) setRun(null);
    else setRun({ ...run, ended: "stopped", resting: false });
  }

  const voiceUnavailable = () =>
    setStatus(
      t(
        "No example voice available. You can read it or practise with a partner.",
        "மாதிரிக் குரல் இல்லை. படிக்கலாம் அல்லது துணையுடன் பழகலாம்.",
      ),
    );

  if (run?.ended)
    return (
      <section className="companion-page">
        <Summary
          run={run}
          ui={ui}
          headingRef={heading}
          onDone={() => {
            setRun(null);
            setStatus("");
          }}
        />
        <p className="companion-status" role="status">
          {status}
        </p>
      </section>
    );

  if (run) {
    const total = run.lesson.steps.length;
    return (
      <section className="companion-page companion-lesson">
        <div className="companion-lesson-bar">
          <div className="companion-lesson-title">
            <span>{copy(ui, run.title.en, run.title.ta)}</span>
            <small>
              {t(
                `Step ${run.index + 1} of ${total}`,
                `படி ${run.index + 1} / ${total}`,
              )}
            </small>
          </div>
          <div
            className="companion-steps-bar"
            role="progressbar"
            aria-label={t("Lesson progress", "பாட முன்னேற்றம்")}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={run.index}
          >
            {run.lesson.steps.map((item, index) => (
              <span
                key={item.id}
                className={
                  index < run.index
                    ? "done"
                    : index === run.index
                      ? "current"
                      : ""
                }
              />
            ))}
          </div>
          <div className="companion-lesson-actions">
            <TapButton
              className="secondary"
              aria-pressed={run.resting}
              onActivate={() => {
                audio.stop();
                setStatus("");
                setReadyStep(null);
                setRun({ ...run, resting: !run.resting });
              }}
            >
              <Coffee aria-hidden="true" />
              <span>{t("Rest", "ஓய்வு எடு")}</span>
            </TapButton>
            <TapButton className="secondary" onActivate={stop}>
              <Square aria-hidden="true" />
              <span>{t("Stop", "நிறுத்து")}</span>
            </TapButton>
          </div>
        </div>
        {run.resting ? (
          <div className="companion-card companion-rest-panel">
            <h2 ref={heading} tabIndex={-1}>
              {t("Resting", "ஓய்வு")}
            </h2>
            <p>
              {t(
                "Resting is part of practice. Continue whenever you like.",
                "ஓய்வும் பயிற்சியின் பகுதி. விரும்பும்போது தொடருங்கள்.",
              )}
            </p>
            <TapButton
              className="companion-next primary"
              onActivate={() => setRun({ ...run, resting: false })}
            >
              <Play aria-hidden="true" />
              <span>{t("Continue", "தொடரலாம்")}</span>
            </TapButton>
          </div>
        ) : (
          step && (
            <div className="companion-card companion-step" key={step.id}>
              <h2 ref={heading} tabIndex={-1}>
                {stepHeading(step.type, ui)}
              </h2>
              {step.type === "listen" && (
                <ListenStep
                  step={step}
                  ui={ui}
                  ready={readyStep === step.id && !busy}
                  onDone={(result) => void stepDone(result)}
                  onVoiceUnavailable={voiceUnavailable}
                  recognitionMode={recognitionMode}
                  usesAid={profile.communicationMethod === "aac"}
                />
              )}
              {step.type === "choose" && (
                <ChooseStep
                  step={step}
                  ui={ui}
                  ready={readyStep === step.id && !busy}
                  onDone={(result) => void stepDone(result)}
                  onVoiceUnavailable={voiceUnavailable}
                />
              )}
              {step.type === "build" && (
                <BuildStep
                  step={step}
                  ui={ui}
                  ready={readyStep === step.id && !busy}
                  onDone={(result) => void stepDone(result)}
                  onVoiceUnavailable={voiceUnavailable}
                />
              )}
              {step.type === "yourWay" && (
                <YourWayStep
                  step={step}
                  ui={ui}
                  ready={readyStep === step.id && !busy}
                  onDone={(result) => void stepDone(result)}
                  onVoiceUnavailable={voiceUnavailable}
                />
              )}
            </div>
          )
        )}
        <p className="companion-status" role="status" aria-live="polite">
          {status}
        </p>
      </section>
    );
  }

  return (
    <section className="companion-page">
      <PageTitle
        title={t("Speech companion", "பேச்சுத் துணை")}
        subtitle={t(
          "A little practice, at your pace.",
          "உங்கள் வேகத்தில், கொஞ்சம் பயிற்சி.",
        )}
      />
      <Home
        ui={ui}
        lang={lang}
        name={profile.displayName}
        progress={progress}
        today={today}
        units={units}
        suggested={suggested}
        dueCount={due.length}
        onContinue={continueNext}
        onReview={startReview}
        onUnit={startUnit}
        onGoal={(goal) => void save((value) => ({ ...value, dailyGoal: goal }))}
        onRest={() => void save((value) => toggleRest(value, today))}
        onLang={(next) =>
          void save((value) => ({ ...value, contentLang: next }))
        }
      />
      <p className="companion-status" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}

function stepHeading(type: Lesson["steps"][number]["type"], ui: Lang) {
  switch (type) {
    case "listen":
      return copy(ui, "Listen and repeat", "கேட்டு, திரும்பச் சொல்லுங்கள்");
    case "choose":
      return copy(
        ui,
        "Choose the phrase",
        "சரியான வாக்கியத்தைத் தேர்ந்தெடுங்கள்",
      );
    case "build":
      return copy(ui, "Build the sentence", "வாக்கியத்தை அமையுங்கள்");
    case "yourWay":
      return copy(ui, "Say it your way", "உங்கள் வழியில் சொல்லுங்கள்");
  }
}

function GoalRing({ done, goal }: { done: number; goal: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const share = Math.min(1, goal ? done / goal : 0);
  return (
    <svg
      className="companion-ring"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="companion-ring-track" cx="50" cy="50" r={radius} />
      <circle
        className="companion-ring-fill"
        cx="50"
        cy="50"
        r={radius}
        strokeDasharray={`${circumference * share} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central">
        {Math.min(done, 999)}/{goal}
      </text>
    </svg>
  );
}

const dotLabel = (state: DotState, ui: Lang) =>
  state === "practised"
    ? copy(ui, "practised", "பயிற்சி செய்தீர்கள்")
    : state === "rest"
      ? copy(ui, "rest day", "ஓய்வு நாள்")
      : state === "future"
        ? copy(ui, "still to come", "இன்னும் வரவில்லை")
        : copy(ui, "no practice", "பயிற்சி இல்லை");

function Home({
  ui,
  lang,
  name,
  progress,
  today,
  units,
  suggested,
  dueCount,
  onContinue,
  onReview,
  onUnit,
  onGoal,
  onRest,
  onLang,
}: {
  ui: Lang;
  lang: CompanionLang;
  name: string;
  progress: CompanionProgress;
  today: string;
  units: CompanionUnit[];
  suggested?: CompanionUnit;
  dueCount: number;
  onContinue: () => void;
  onReview: () => void;
  onUnit: (unit: CompanionUnit) => void;
  onGoal: (goal: (typeof DAILY_GOALS)[number]) => void;
  onRest: () => void;
  onLang: (lang: CompanionLang) => void;
}) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  const done = stepsToday(progress.days, today);
  const goal = progress.dailyGoal;
  const dots = weekDots(progress.days, today);
  const streak = currentStreak(progress.days, today);
  const restToday = Boolean(progress.days[today]?.rest);
  const locale = ui === "ta" ? "ta-IN" : "en-IN";
  const weekday = (day: string, style: "short" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style }).format(parseDay(day));
  const continueLabel = dueCount
    ? t(
        `Review ${dueCount} ${dueCount === 1 ? "phrase" : "phrases"}`,
        `${dueCount} வாக்கியங்களை மீண்டும் பழகுங்கள்`,
      )
    : suggested
      ? copy(ui, suggested.title.en, suggested.title.ta)
      : "";
  return (
    <>
      <p className="companion-greeting">
        {t("Hello", "வணக்கம்")}
        {name.trim() ? `, ${name.trim()}` : ""}
      </p>
      <div className="companion-top">
        <section
          className="companion-card companion-goal"
          aria-labelledby="companion-goal-heading"
        >
          <h2 id="companion-goal-heading">
            {t("Daily goal", "தினசரி இலக்கு")}
          </h2>
          <div className="companion-goal-body">
            <GoalRing done={done} goal={goal} />
            <p aria-live="polite">
              {done >= goal
                ? t("Goal reached. Well done.", "இலக்கு முடிந்தது. நல்லது!")
                : t(`${done} of ${goal} today`, `இன்று ${done} / ${goal}`)}
            </p>
          </div>
          <div
            className="companion-goal-buttons"
            role="group"
            aria-label={t("Daily goal", "தினசரி இலக்கு")}
          >
            {DAILY_GOALS.map((value) => (
              <TapButton
                key={value}
                className={goal === value ? "selected" : ""}
                aria-pressed={goal === value}
                aria-label={t(
                  `Set daily goal: ${value}`,
                  `தினசரி இலக்கு: ${value}`,
                )}
                onActivate={() => onGoal(value)}
              >
                {value}
              </TapButton>
            ))}
          </div>
        </section>
        <section
          className="companion-card companion-week"
          aria-labelledby="companion-week-heading"
        >
          <h2 id="companion-week-heading">{t("This week", "இந்த வாரம்")}</h2>
          <ol className="companion-dots">
            {dots.map((dot) => (
              <li
                key={dot.day}
                className={`companion-dot ${dot.state}${dot.today ? " today" : ""}`}
                aria-label={`${weekday(dot.day, "long")}: ${dotLabel(dot.state, ui)}`}
              >
                <span className="companion-dot-mark" aria-hidden="true">
                  {dot.state === "practised" ? (
                    <Check size={18} />
                  ) : dot.state === "rest" ? (
                    <Moon size={16} />
                  ) : null}
                </span>
                <span className="companion-dot-day" aria-hidden="true">
                  {weekday(dot.day, "short")}
                </span>
              </li>
            ))}
          </ol>
          <p className="companion-streak">
            {streak > 0
              ? t(
                  `${streak} ${streak === 1 ? "day" : "days"} in a row — rest days are fine`,
                  `தொடர்ந்து ${streak} நாள் — ஓய்வு நாளும் சரி`,
                )
              : t(
                  "Start any day — rest days are fine",
                  "எந்த நாளும் தொடங்கலாம் — ஓய்வு நாளும் சரி",
                )}
          </p>
        </section>
      </div>
      <div className="companion-main-actions">
        <TapButton
          className="companion-continue primary"
          onActivate={onContinue}
        >
          <ArrowRight aria-hidden="true" />
          <span className="companion-continue-text">
            <strong>{t("Continue", "தொடரலாம்")}</strong>
            <small>{continueLabel}</small>
          </span>
        </TapButton>
        <TapButton
          className="companion-review"
          disabled={!dueCount}
          onActivate={onReview}
        >
          <RotateCcw aria-hidden="true" />
          <span className="companion-continue-text">
            <strong>{t("Review", "மீண்டும் பழகு")}</strong>
            <small>
              {dueCount
                ? t(`${dueCount} ready today`, `இன்று ${dueCount} தயார்`)
                : t("Nothing due today", "இன்று எதுவும் இல்லை")}
            </small>
          </span>
        </TapButton>
      </div>
      <div
        className="companion-lang"
        role="group"
        aria-label={t("Practice language", "பயிற்சி மொழி")}
      >
        {(["ta", "en"] as const).map((option) => (
          <TapButton
            key={option}
            lang={option}
            className={lang === option ? "selected" : ""}
            aria-pressed={lang === option}
            onActivate={() => onLang(option)}
          >
            {option === "ta" ? "தமிழ்" : "English"}
          </TapButton>
        ))}
      </div>
      <h2 className="companion-section-heading">{t("Lessons", "பாடங்கள்")}</h2>
      <div className="companion-units">
        {units.map((unit) => {
          const count = progress.lessons[`${unit.id}:${lang}`] ?? 0;
          return (
            <TapButton
              key={unit.id}
              className={`companion-unit${suggested?.id === unit.id ? " suggested" : ""}`}
              onActivate={() => onUnit(unit)}
            >
              <span className="companion-unit-icon" aria-hidden="true">
                {unit.icon}
              </span>
              <span className="companion-unit-text">
                <strong>{copy(ui, unit.title.en, unit.title.ta)}</strong>
                <small>
                  {t(
                    `${unit.phrases.length} phrases`,
                    `${unit.phrases.length} வாக்கியங்கள்`,
                  )}
                  {count > 0 &&
                    ` · ${t(`${count} ${count === 1 ? "lesson" : "lessons"} done`, `${count} பாடங்கள் முடிந்தன`)}`}
                </small>
                {suggested?.id === unit.id && (
                  <span className="companion-badge">
                    {t("Suggested next", "அடுத்து இது")}
                  </span>
                )}
              </span>
            </TapButton>
          );
        })}
      </div>
      <TapButton
        className={`companion-rest${restToday ? " selected" : ""}`}
        aria-pressed={restToday}
        onActivate={onRest}
      >
        <Moon aria-hidden="true" />
        <span>{t("Rest today", "இன்று ஓய்வு")}</span>
      </TapButton>
      {restToday && (
        <p className="companion-note" role="status">
          {t(
            "Rest day saved. Resting helps too.",
            "ஓய்வு நாள் சேமிக்கப்பட்டது. ஓய்வும் உதவும்.",
          )}
        </p>
      )}
      <p className="companion-privacy">
        {t(
          "Progress stays on this device. This is practice, not a speech test.",
          "முன்னேற்றம் இந்தச் சாதனத்தில் மட்டும் இருக்கும். இது பயிற்சி, பேச்சுத் தேர்வு அல்ல.",
        )}
      </p>
    </>
  );
}

function Summary({
  run,
  ui,
  headingRef,
  onDone,
}: {
  run: LessonRun;
  ui: Lang;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onDone: () => void;
}) {
  const t = (en: string, ta: string) => copy(ui, en, ta);
  return (
    <div className="companion-card companion-summary">
      <h2 ref={headingRef} tabIndex={-1}>
        {run.ended === "finished"
          ? t("Lesson finished", "பாடம் முடிந்தது")
          : t(
              "You stopped here. That's fine.",
              "இங்கே நிறுத்தினீர்கள். பரவாயில்லை.",
            )}
      </h2>
      <p className="companion-summary-count">
        {t(
          `Phrases practised: ${run.practised.length}`,
          `பழகிய வாக்கியங்கள்: ${run.practised.length}`,
        )}
      </p>
      {run.toReview.length > 0 && (
        <>
          <h3>{t("To review again", "மீண்டும் பழக")}</h3>
          <ul className="companion-review-list">
            {run.toReview.map((item) => (
              <li key={item.key}>
                <span lang={item.lang}>{item.text}</span>
                {item.words.length > 0 &&
                  targetWordTokens(item.text).length > 1 && (
                    <small lang={item.lang}>{item.words.join(", ")}</small>
                  )}
              </li>
            ))}
          </ul>
        </>
      )}
      {run.saved > 0 && (
        <p className="companion-note">
          {t(
            "Saved to your practice progress on this device.",
            "உங்கள் பயிற்சி முன்னேற்றத்தில் இந்தச் சாதனத்தில் சேமிக்கப்பட்டது.",
          )}
        </p>
      )}
      <TapButton className="companion-next primary" onActivate={onDone}>
        <ArrowRight aria-hidden="true" />
        <span>{t("Back to companion", "துணைக்குத் திரும்பு")}</span>
      </TapButton>
    </div>
  );
}
