// Less frequently used patient pages, loaded on first use to keep the
// first screen fast. They share the exact-sentence tap rules of Patient.tsx.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Check, ChevronLeft, Volume2 } from "lucide-react";
import { candidate } from "@sollu/shared";
import { useApp } from "../state";
import { db } from "../db";
import { audio } from "../features/audio";
import { Back, Empty, PageTitle, TapButton } from "../ui";
import { copy } from "../lib/copy";

const ticket = (event: Event, text: string) =>
  audio.createTap(event, text, { role: "patient", surface: "patient" });
export function PeoplePage() {
  const { settings, updateSettings, session, generate } = useApp();
  const navigate = useNavigate();
  const [problem, setProblem] = useState("");
  // Coming from a message: going back must keep it, not start over.
  const hasMessage = Boolean(
    session && !session.attempt.endedAt && session.context.fragment.raw.trim(),
  );
  return (
    <>
      {hasMessage ? (
        <TapButton
          className="back-button"
          onActivate={() => navigate("/confirm")}
        >
          <ChevronLeft />
          {copy(
            settings.lang,
            "Back to my choices",
            "என் தேர்வுகளுக்குத் திரும்பு",
          )}
        </TapButton>
      ) : (
        <Back />
      )}
      <PageTitle
        title={copy(
          settings.lang,
          "Who are you talking to?",
          "யாரிடம் பேசுகிறீர்கள்?",
        )}
        subtitle={copy(
          settings.lang,
          "Sentences use the way you speak to them.",
          "அவர்களிடம் நீங்கள் பேசும் விதத்தில் வாக்கியங்கள் வரும்.",
        )}
      />
      {problem && (
        <p className="notice amber" role="status">
          {problem}
        </p>
      )}
      <div className="topic-grid">
        {settings.contacts.map((c, i) => (
          <TapButton
            className="person-tile"
            key={c.id}
            onActivate={() => {
              setProblem("");
              void updateSettings({ addressee: c.id })
                .then(() => {
                  if (hasMessage) {
                    void generate();
                    navigate("/confirm");
                  } else navigate("/");
                })
                .catch(() =>
                  setProblem(
                    copy(
                      settings.lang,
                      "That choice could not be saved. Please try again.",
                      "தேர்வைச் சேமிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.",
                    ),
                  ),
                );
            }}
          >
            <span className={`avatar person-${i}`}>{c.name[0]}</span>
            <strong>{c.name}</strong>
            <small>
              {c.relation} · {c.lang === "en" ? "English" : "தமிழ்"}
            </small>
            {settings.addressee === c.id && <Check size={20} />}
          </TapButton>
        ))}
      </div>
      {hasMessage ? (
        <TapButton
          className="primary full"
          onActivate={() => {
            void generate();
            navigate("/confirm");
          }}
        >
          {copy(
            settings.lang,
            "Update these sentences",
            "வாக்கியங்களைப் புதுப்பி",
          )}
          <ArrowRight />
        </TapButton>
      ) : null}
    </>
  );
}
export function RecentPage() {
  const { settings, begin, speak } = useApp();
  const attempts =
    useLiveQuery(() =>
      db.attempts.orderBy("startedAt").reverse().limit(40).toArray(),
    ) ?? [];
  // Each sentence once, newest first; tapping says that exact sentence again.
  const recent = attempts
    .filter((a) => a.chosenText)
    .filter(
      (a, i, all) =>
        all.findIndex(
          (b) => b.chosenText === a.chosenText && b.outputLang === a.outputLang,
        ) === i,
    )
    .slice(0, 20);
  return (
    <>
      <Back />
      <PageTitle
        title={copy(settings.lang, "Recent words", "சமீபத்திய வார்த்தைகள்")}
        subtitle={copy(
          settings.lang,
          "Tap a sentence to say it again.",
          "மீண்டும் சொல்ல ஒரு வாக்கியத்தைத் தொடுங்கள்.",
        )}
      />
      {recent.length ? (
        <div className="phrase-list">
          {recent.map((a) => {
            const text = a.chosenText!;
            const c = candidate(
              text,
              a.chosenGloss ?? text,
              a.chosenIntent ?? "recent",
              "🕘",
              a.chosenReading ?? text,
            );
            return (
              <TapButton
                className="phrase-card"
                key={a.id}
                onActivate={(event) => {
                  begin({ modality: "topic", raw: c.reading });
                  speak(c, ticket(event, text), false, a.outputLang);
                }}
              >
                <span className="phrase-icon">{c.icon}</span>
                <span>
                  <strong lang={a.outputLang}>{text}</strong>
                  <small>
                    {new Date(a.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.demoClock ? " · Demo" : ""}
                  </small>
                </span>
                <Volume2 />
              </TapButton>
            );
          })}
        </div>
      ) : (
        <Empty
          title={copy(
            settings.lang,
            "Your words will appear here",
            "உங்கள் வார்த்தைகள் இங்கே வரும்",
          )}
        >
          {copy(
            settings.lang,
            "After you choose and speak a sentence, you can find it here.",
            "நீங்கள் சொன்ன வாக்கியங்கள் இங்கே இருக்கும்.",
          )}
        </Empty>
      )}
    </>
  );
}

export function BaselinePage() {
  const { begin, finishBaseline, settings } = useApp();
  const [words, setWords] = useState<string[]>([]),
    [result, setResult] = useState("");
  const text = words.join(" ");
  const keys = [
    ["I", "🙋", "எனக்கு"],
    ["want", "🤲", "வேண்டும்"],
    ["need", "🙏", "தேவை"],
    ["go", "🚶", "போக"],
    ["eat", "🍽️", "சாப்பிட"],
    ["drink", "🥤", "குடிக்க"],
    ["water", "💧", "தண்ணீர்"],
    ["tablet", "💊", "மாத்திரை"],
    ["toilet", "🚻", "கழிப்பறை"],
    ["pain", "🤕", "வலி"],
    ["help", "🆘", "உதவி"],
    ["yes", "👍", "ஆம்"],
    ["no", "✋", "இல்லை"],
    ["more", "➕", "இன்னும்"],
    ["please", "🤝", "தயவுசெய்து"],
    ["night", "🌙", "இரவு"],
  ].map(([en, icon, ta]) => [copy(settings.lang, en, ta), icon]);
  return (
    <>
      <Back />
      <PageTitle
        eyebrow="THE SAME TASK. THE SAME COUNTER."
        title="Picture board"
        subtitle="Build a sentence, one word at a time. Then tap that sentence to speak."
      />
      <div className="baseline-strip">
        <p>{text || "Your sentence appears here"}</p>
        <TapButton
          disabled={!words.length}
          onActivate={() => setWords((w) => w.slice(0, -1))}
        >
          <ChevronLeft />
          Undo
        </TapButton>
      </div>
      <div className="baseline-grid">
        {keys.map(([word, icon]) => (
          <TapButton
            key={word}
            onActivate={() => {
              if (!words.length) begin({ modality: "topic", raw: "baseline" });
              setWords((w) => [...w, word]);
            }}
          >
            <span>{icon}</span>
            {word}
          </TapButton>
        ))}
      </div>
      <TapButton
        className="primary full"
        disabled={!text}
        onActivate={(event) => {
          const t = audio.createTap(event, text, {
            role: "patient",
            surface: "baseline",
          });
          void audio
            .speak({
              text,
              lang: settings.lang,
              ticket: t,
              channel: "baseline",
              onStart: () => {
                const a = finishBaseline(text);
                if (a)
                  setResult(
                    `${a.taps} taps · ${((a.timeToSpeechMs ?? 0) / 1000).toFixed(1)} seconds`,
                  );
              },
            })
            .then((r) => {
              if (r.status === "unavailable")
                setResult(
                  copy(
                    settings.lang,
                    "A voice for this language is not installed.",
                    "இந்த மொழிக்கான குரல் நிறுவப்படவில்லை.",
                  ),
                );
            });
        }}
      >
        <Volume2 />
        {text || "Build a sentence first"}
      </TapButton>
      {result && <div className="notice">{result} · Device voice</div>}
      <p className="privacy-inline">
        {copy(
          settings.lang,
          "A word board in your selected language. Compare the same intended messages and access settings.",
          "தேர்ந்தெடுத்த மொழியில் சொற்கள். ஒரே செய்திகளை ஒப்பிடுங்கள்.",
        )}{" "}
        {settings.demo ? "Demo clock is on." : ""}
      </p>
    </>
  );
}
