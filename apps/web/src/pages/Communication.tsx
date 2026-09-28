import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import {
  quickPhrases,
  type Candidate,
  type WordSubstitution,
} from "@sollu/shared";
import { useApp } from "../state";
import { db, recordingId } from "../db";
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
export function CommunicationDock() {
  const { settings, speak, pause, stop, resume, paused } = useApp();
  const navigate = useNavigate();
  const c = quickPhrases[settings.lang].help;
  return (
    <nav
      className="communication-dock"
      aria-label={copy(settings.lang, "Communication support", "பேச உதவி")}
    >
      <TapButton
        className="dock-help"
        onActivate={(event) =>
          speak(
            c,
            audio.createTap(event, c.text, {
              role: "patient",
              surface: "patient",
            }),
            false,
            settings.lang,
          )
        }
      >
        ✋ {c.text}
      </TapButton>
      <TapButton
        onActivate={() => {
          stop();
          if (paused) resume();
          navigate("/repair");
        }}
      >
        ↩ {copy(settings.lang, "Fix", "திருத்து")}
      </TapButton>
      <TapButton onActivate={pause}>
        Ⅱ {copy(settings.lang, "Pause", "இடைவேளை")}
      </TapButton>
      <TapButton onActivate={stop}>
        ■ {copy(settings.lang, "Stop", "நிறுத்து")}
      </TapButton>
    </nav>
  );
}
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
export function PausePage() {
  const { settings, session, resume, abandon } = useApp();
  const navigate = useNavigate();
  return (
    <div className="pause-space">
      <span className="pause-symbol" aria-hidden>
        Ⅱ
      </span>
      <h1>{copy(settings.lang, "Take your time.", "நிதானமாக இருங்கள்.")}</h1>
      <p>
        {copy(
          settings.lang,
          "Your words are saved here. Nothing will speak until you choose.",
          "உங்கள் வார்த்தைகள் இங்கே உள்ளன. நீங்கள் தேர்ந்தெடுத்தால் மட்டுமே பேசும்.",
        )}
      </p>
      {session?.context.fragment.raw && (
        <blockquote>{session.context.fragment.raw}</blockquote>
      )}
      <TapButton className="primary full" onActivate={resume}>
        {copy(settings.lang, "Continue my message", "என் செய்தியைத் தொடரவும்")}
      </TapButton>
      <TapButton
        className="full"
        onActivate={() => {
          abandon();
          navigate("/");
        }}
      >
        {copy(settings.lang, "Start a new message", "புதிய செய்தியைத் தொடங்கு")}
      </TapButton>
      <CommunicationDock />
    </div>
  );
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
  const [slot, setSlot] = useState("");
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
        <div className="support-grid">
          {[
            ["Person", "நபர்"],
            ["Thing", "பொருள்"],
            ["Place", "இடம்"],
            ["Time", "நேரம்"],
            ["Yes / no", "ஆம் / இல்லை"],
          ].map(([en, ta]) => (
            <TapButton
              key={en}
              aria-pressed={slot === en}
              onActivate={() => setSlot(en)}
            >
              {copy(l, en, ta)}
            </TapButton>
          ))}
        </div>
        <label htmlFor="repair-text">
          {copy(
            l,
            slot
              ? `Your complete message — change ${slot.toLowerCase()}`
              : "Your complete message",
            "உங்கள் முழுச் செய்தி",
          )}
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
export function MemoryPanel() {
  const { settings, caregiverUnlocked } = useApp();
  const memories = useLiveQuery(() => db.memories.toArray(), []) ?? [];
  const substitutions =
    useLiveQuery(() => db.substitutions.toArray(), []) ?? [];
  const [heard, setHeard] = useState("");
  const [means, setMeans] = useState("");
  const [pending, setPending] = useState("");
  const [correction, setCorrection] = useState<Pick<
    WordSubstitution,
    "heard" | "means" | "lang" | "place" | "addresseeId"
  > | null>(null);
  if (!caregiverUnlocked) return null;
  return (
    <section className="support-card">
      <h2>Memory & word corrections</h2>
      <p>
        Speaking a choice only creates a suggestion. Ask the person to approve
        the exact mapping before it can influence future choices. Approval is
        specific to this language, place and listener.
      </p>
      {memories
        .slice()
        .sort((a, b) => b.lastAt - a.lastAt)
        .slice(0, 30)
        .map((m) => (
          <div className="memory-row" key={m.id}>
            <p>
              <strong>{m.fragmentRaw}</strong> → {m.sentence}
            </p>
            <small>
              {m.lang} · {m.placeLabel} ·{" "}
              {settings.contacts.find((c) => c.id === m.addresseeId)?.name ??
                "previous listener"}{" "}
              · {m.confirmed ? "Approved" : "Not approved"}
            </small>
            <div className="support-grid">
              <TapButton
                onActivate={() => {
                  if (pending !== m.id) {
                    setPending(m.id);
                    return;
                  }
                  void db.memories.update(m.id, { confirmed: !m.confirmed });
                  setPending("");
                }}
              >
                {pending === m.id
                  ? copy(
                      settings.lang,
                      "Yes, this is what I mean",
                      "ஆம், இதைத்தான் சொல்கிறேன்",
                    )
                  : m.confirmed
                    ? "Forget this mapping"
                    : "Review with the person"}
              </TapButton>
              <TapButton
                onActivate={() => {
                  void db.memories.delete(m.id);
                  void db.kv.delete(`memory-candidate:${m.id}`);
                }}
              >
                Delete
              </TapButton>
            </div>
          </div>
        ))}
      <h3>Explicit word correction</h3>
      <label htmlFor="heard-word">When I say</label>
      <input
        id="heard-word"
        maxLength={120}
        value={heard}
        onChange={(e) => setHeard(e.target.value)}
      />
      <label htmlFor="means-word">I mean</label>
      <input
        id="means-word"
        maxLength={120}
        value={means}
        onChange={(e) => setMeans(e.target.value)}
      />
      <TapButton
        disabled={
          !heard.trim() || !means.trim() || heard.trim() === means.trim()
        }
        onActivate={() => {
          setPending("correction");
          setCorrection({
            heard: heard.trim(),
            means: means.trim(),
            lang:
              settings.contacts.find((c) => c.id === settings.addressee)
                ?.lang ?? settings.lang,
            place: settings.place,
            addresseeId: settings.addressee,
          });
        }}
      >
        Review correction
      </TapButton>
      {pending === "correction" && correction && (
        <div>
          <blockquote>
            {correction.heard} → {correction.means}
          </blockquote>
          <TapButton
            onActivate={() => {
              void db.substitutions.put({
                id: crypto.randomUUID(),
                ...correction,
                count: 2,
                lastAt: Date.now(),
                confirmed: true,
              });
              setPending("");
              setHeard("");
              setMeans("");
            }}
          >
            {copy(
              settings.lang,
              "Yes, this is what I mean",
              "ஆம், இதைத்தான் சொல்கிறேன்",
            )}
          </TapButton>
        </div>
      )}
      {substitutions.map((s) => (
        <div className="memory-row" key={s.id}>
          <p>
            {s.heard} → {s.means} ·{" "}
            {s.confirmed ? "Approved" : "Inactive legacy suggestion"}
          </p>
          <TapButton
            onActivate={() => {
              void db.substitutions.delete(s.id);
            }}
          >
            Forget correction
          </TapButton>
        </div>
      ))}
    </section>
  );
}
export function OfflinePanel() {
  const { settings, online } = useApp();
  const [voices, setVoices] = useState(() => audio.getVoices(settings.lang));
  const recordings = useLiveQuery(() => db.recordings.toArray(), []) ?? [];
  const consents = useLiveQuery(() => db.consents.toArray(), []) ?? [];
  const [shellCached, setShellCached] = useState(false);
  useEffect(() => {
    void (async () => {
      if (!("caches" in window)) return;
      const names = await caches.keys();
      for (const name of names) {
        const cached = await (await caches.open(name)).match("/index.html");
        if (cached) {
          setShellCached(true);
          return;
        }
      }
    })().catch(() => {});
  }, []);
  const help = quickPhrases[settings.lang].help;
  const exact = recordings.some(
    (r) =>
      r.id === recordingId(help.text, settings.lang) &&
      consents.some((c) => c.id === r.consentId),
  );
  return (
    <section className="support-card">
      <h2>Offline readiness</h2>
      <ul>
        <li>Network: {online ? "browser reports connected" : "offline"}</li>
        <li>
          Installed app shell:{" "}
          {shellCached
            ? "cached"
            : "not verified — build and visit the production app first"}
        </li>
        <li>Bilingual phrase and word catalog: bundled with the app</li>
        <li>
          Exact Help recording: {exact ? "saved with consent" : "not saved"}
        </li>
        <li>
          Local {settings.lang === "ta" ? "Tamil" : "English"} device voice:{" "}
          {voices.some((v) => v.localService)
            ? "available"
            : "not available or not loaded"}
        </li>
        <li>
          Caregiver messages need both devices and the local relay connection.
        </li>
      </ul>
      <TapButton onActivate={() => setVoices(audio.getVoices(settings.lang))}>
        Check installed voices again
      </TapButton>
      <p>
        A voice marked online by the browser may not work offline. When speech
        is unavailable, the selected text remains visible; Help can sound an
        alert tone.
      </p>
    </section>
  );
}
