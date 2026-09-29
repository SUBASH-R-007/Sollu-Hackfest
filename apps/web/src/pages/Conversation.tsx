import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Candidate } from "@sollu/shared";
import { useApp } from "../state";
import { audio } from "../features/audio";
import { copy } from "../lib/copy";
import { Back, PageTitle, TapButton } from "../ui";

const phrase = (
  text: string,
  en: string,
  lang: "ta" | "en",
  intent: string,
): Candidate => ({
  text,
  gloss_en: en,
  lang,
  reading: intent,
  intent,
  keyword: intent,
  icon: "💬",
  urgency: "none",
  source: "personal",
});
function useConfirmedChoice() {
  const { settings, speak } = useApp();
  const [armed, setArmed] = useState("");
  function choose(c: Candidate, event: Event) {
    if (settings.twoStep && armed !== c.text) {
      setArmed(c.text);
      return;
    }
    setArmed("");
    speak(
      c,
      audio.createTap(event, c.text, { role: "patient", surface: "patient" }),
      false,
      c.lang ?? settings.lang,
    );
  }
  return {
    choose,
    confirmation: armed ? (
      <p role="status" className="notice">
        {copy(
          settings.lang,
          "Tap the same sentence again to speak.",
          "பேச அதே வாக்கியத்தை மீண்டும் தொடுங்கள்.",
        )}{" "}
        <strong>{armed}</strong>
      </p>
    ) : null,
  };
}
export function RepairPage() {
  const {
    settings,
    session,
    generate,
    markCommunication,
    question,
    setQuestion,
  } = useApp();
  const navigate = useNavigate();
  const { choose, confirmation } = useConfirmedChoice();
  const [value, setValue] = useState(session?.context.fragment.raw ?? "");
  const [partner, setPartner] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const l = settings.lang;
  const repairs = [
    ["Please give me time.", "எனக்குக் கொஞ்சம் நேரம் கொடுங்கள்."],
    ["That is not what I mean.", "நான் சொல்ல நினைப்பது அது இல்லை."],
    ["Please ask one question at a time.", "ஒவ்வொரு கேள்வியாகக் கேளுங்கள்."],
    ["Please write the main words.", "முக்கிய வார்த்தைகளை எழுதுங்கள்."],
  ];
  return (
    <>
      <Back />
      <PageTitle
        title={copy(
          l,
          "Let’s get the meaning right.",
          "சரியான பொருளைத் தெரிவிப்போம்.",
        )}
      />
      {session?.chosen && (
        <blockquote className="message-preview">
          {session.chosen.text}
        </blockquote>
      )}
      <div className="support-grid">
        {repairs.map(([en, ta]) => (
          <TapButton
            key={en}
            onActivate={(event) => {
              const c = phrase(copy(l, en, ta), en, l, "repair");
              choose(c, event);
            }}
          >
            {copy(l, en, ta)}
          </TapButton>
        ))}
      </div>
      {confirmation}
      <section className="support-card">
        <h2>{copy(l, "Change one part", "ஒரு பகுதியை மாற்று")}</h2>
        <label htmlFor="repair-text">
          {copy(l, "Your complete message", "உங்கள் முழுச் செய்தி")}
        </label>
        <textarea
          id="repair-text"
          className="fragment-input"
          maxLength={500}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <TapButton
          className="primary full"
          disabled={!value.trim()}
          onActivate={() => {
            markCommunication("needs_repair");
            void generate({ modality: "text", raw: value }, 1);
          }}
        >
          {copy(l, "Show new choices", "புதிய வாக்கியங்களைக் காட்டு")}
        </TapButton>
      </section>
      {session && (
        <section className="support-card">
          <h2>{copy(l, "Check together", "சேர்ந்து உறுதிசெய்")}</h2>
          <p>
            {copy(
              l,
              "Ask the other person to tell you what they understood. Then choose.",
              "அவர்கள் புரிந்துகொண்டதைச் சொல்லச் சொல்லுங்கள். பிறகு தேர்ந்தெடுங்கள்.",
            )}
          </p>
          <label htmlFor="partner-understood">
            {copy(
              l,
              "They understood… (optional)",
              "அவர்கள் புரிந்துகொண்டது… (விருப்பம்)",
            )}
          </label>
          <input
            id="partner-understood"
            maxLength={500}
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
          />
          <div className="support-grid">
            {(
              [
                [
                  "understood",
                  "Yes, they understood",
                  "ஆம், புரிந்துகொண்டார்கள்",
                ],
                ["needs_repair", "No, try again", "இல்லை, மீண்டும் முயற்சி"],
                [
                  "declined",
                  "I do not want to answer",
                  "பதில் சொல்ல விரும்பவில்லை",
                ],
              ] as const
            ).map(([outcome, en, ta]) => (
              <TapButton
                key={outcome}
                disabled={!session}
                onActivate={() => {
                  markCommunication(outcome, partner);
                  setFeedback(
                    copy(
                      l,
                      "Your choice is saved.",
                      "உங்கள் தேர்வு சேமிக்கப்பட்டது.",
                    ),
                  );
                }}
              >
                {copy(l, en, ta)}
              </TapButton>
            ))}
          </div>
          <p role="status">{feedback}</p>
        </section>
      )}
      <section className="support-card">
        <h2>{copy(l, "One question at a time", "ஒவ்வொரு கேள்வியாக")}</h2>
        {question && <blockquote>{question.text}</blockquote>}
        <label htmlFor="one-question">
          {copy(l, "Partner’s question", "மற்றவரின் கேள்வி")}
        </label>
        <input
          id="one-question"
          maxLength={500}
          value={questionDraft}
          onChange={(e) => setQuestionDraft(e.target.value)}
        />
        <TapButton
          disabled={!questionDraft.trim()}
          onActivate={() => {
            setQuestion(questionDraft);
            navigate("/");
          }}
        >
          {copy(l, "Keep this question visible", "இந்தக் கேள்வியைக் காட்டு")}
        </TapButton>
      </section>
    </>
  );
}
export function ComfortPage() {
  const { settings, pause } = useApp();
  const { choose, confirmation } = useConfirmedChoice();
  const l = settings.lang;
  const items = [
    ["I need a break.", "எனக்கு ஓய்வு வேண்டும்.", "☕"],
    ["It is too noisy.", "சத்தம் அதிகமாக இருக்கிறது.", "🔇"],
    ["Please turn the light down.", "வெளிச்சத்தைக் குறையுங்கள்.", "💡"],
    ["Please sit near me.", "என் அருகில் உட்காருங்கள்.", "🪑"],
    ["I feel worried.", "எனக்குக் கவலையாக இருக்கிறது.", "💭"],
    ["I feel happy.", "நான் மகிழ்ச்சியாக இருக்கிறேன்.", "🙂"],
    ["I want some privacy.", "எனக்குத் தனிமை வேண்டும்.", "🚪"],
    [
      "I want to change position.",
      "நான் உட்காரும் அல்லது படுக்கும் நிலையை மாற்ற வேண்டும்.",
      "↔",
    ],
  ];
  return (
    <>
      <Back to="/tools" />
      <PageTitle title={copy(l, "How do you feel?", "எப்படி உணர்கிறீர்கள்?")} />
      <div className="support-grid">
        {items.map(([en, ta, icon]) => (
          <TapButton
            className="support-tile"
            key={en}
            onActivate={(event) => {
              const c = phrase(copy(l, en, ta), en, l, "comfort");
              choose(c, event);
            }}
          >
            <span aria-hidden>{icon}</span>
            {copy(l, en, ta)}
          </TapButton>
        ))}
      </div>
      {confirmation}
      <TapButton className="full" onActivate={pause}>
        {copy(l, "Take a quiet break", "அமைதியாக ஓய்வெடு")}
      </TapButton>
    </>
  );
}
export function SentencePage() {
  const { settings } = useApp();
  const { choose, confirmation } = useConfirmedChoice();
  const l = settings.lang;
  const [object, setObject] = useState("");
  const [negative, setNegative] = useState(false);
  const [polarityChosen, setPolarityChosen] = useState(false);
  const objects = [
    ["water", "தண்ணீர்", "💧"],
    ["food", "உணவு", "🍽"],
    ["tea", "தேநீர்", "☕"],
    ["rest", "ஓய்வு", "🛏"],
    ["help", "உதவி", "✋"],
    ["company", "துணை", "👥"],
  ];
  const item = objects.find(([en]) => en === object);
  const en = item ? `I ${negative ? "do not want" : "want"} ${item[0]}.` : "";
  const text = item
    ? copy(l, en, `எனக்கு ${item[1]} ${negative ? "வேண்டாம்" : "வேண்டும்"}.`)
    : "";
  return (
    <>
      <Back to="/tools" />
      <PageTitle
        title={copy(l, "Build my sentence", "என் வாக்கியத்தை உருவாக்கு")}
      />
      <h2>{copy(l, "Choose a meaning", "பொருளைத் தேர்ந்தெடு")}</h2>
      <div className="support-grid">
        {[false, true].map((no) => (
          <TapButton
            key={String(no)}
            aria-pressed={polarityChosen && negative === no}
            onActivate={() => {
              setNegative(no);
              setPolarityChosen(true);
            }}
          >
            {copy(
              l,
              no ? "I do not want" : "I want",
              no ? "எனக்கு வேண்டாம்" : "எனக்கு வேண்டும்",
            )}
          </TapButton>
        ))}
      </div>
      <h2>{copy(l, "Choose a word", "சொல்லைத் தேர்ந்தெடு")}</h2>
      <div className="support-grid">
        {objects.map(([id, ta, icon]) => (
          <TapButton
            key={id}
            aria-pressed={object === id}
            onActivate={() => setObject(id)}
          >
            {icon} {copy(l, id, ta)}
          </TapButton>
        ))}
      </div>
      {text && polarityChosen && (
        <section className="support-card">
          <blockquote className="message-preview">{text}</blockquote>
          <TapButton
            className="primary full"
            onActivate={(event) =>
              choose(phrase(text, en, l, "sentence"), event)
            }
          >
            {text}
          </TapButton>
          {confirmation}
        </section>
      )}
    </>
  );
}
