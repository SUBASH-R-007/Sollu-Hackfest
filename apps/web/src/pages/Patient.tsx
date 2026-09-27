import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Ear,
  Grid2X2,
  HeartHandshake,
  Keyboard,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import {
  defaultPhrases,
  painParts,
  quickPhrases,
  topics,
  type Candidate,
  type Fragment,
} from "@sollu/shared";
import { useApp } from "../state";
import { db } from "../db";
import { clockNow, minuteDistance } from "../lib/context";
import { audio } from "../features/audio";
import { Back, Empty, Hint, PageTitle, TapButton, Tile } from "../ui";

const ticket = (event: Event, text: string) =>
  audio.createTap(event, text, { role: "patient", surface: "patient" });
export function Home() {
  const { settings, begin, question, online } = useApp();
  const navigate = useNavigate();
  const now = clockNow(settings);
  const due = settings.routines
    .filter((r) => Math.abs(minuteDistance(r.time, now)) <= 45)
    .sort(
      (a, b) =>
        Math.abs(minuteDistance(a.time, now)) -
        Math.abs(minuteDistance(b.time, now)),
    )[0];
  const contact = settings.contacts.find((c) => c.id === settings.addressee);
  function go(path: string, modality: Fragment["modality"]) {
    begin({ modality, raw: "" });
    navigate(path);
  }
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE SUPPORT. YOUR OWN WORDS."
        title="What would you like to say?"
        subtitle="என்ன சொல்லணும்? Take your time. We’re listening."
      />
      {!online && (
        <div className="notice amber">
          You’re offline. My phrases and saved recordings are here for you.
        </div>
      )}
      {question && (
        <div className="question-banner">
          <span className="avatar small">P</span>
          <div>
            <small>{contact?.name ?? "They"} asked</small>
            <p>{question.text}</p>
          </div>
        </div>
      )}
      <div className="context-row">
        <button
          className="context-person tap"
          data-tap
          onClick={() => navigate("/people")}
        >
          <span className="avatar">{contact?.name.charAt(0) ?? "P"}</span>
          <span>
            <small>I’m talking to</small>
            <strong>{contact?.name ?? "Someone nearby"}</strong>
          </span>
          <ChevronRight size={19} />
        </button>
        <div className="routine-chip">
          <span className="routine-icon">
            <Clock3 size={21} />
          </span>
          <span>
            <small>{settings.demo ? "Your demo routine" : "Coming up"}</small>
            <strong>{due?.label ?? "A moment for you"}</strong>
          </span>
        </div>
      </div>
      <div className="home-grid">
        <Tile
          tone="speak-tile"
          icon={<Mic size={31} />}
          title="Speak"
          tamil="பேசு"
          detail="A word is a good place to start"
          onActivate={() => go("/speak", "speech")}
        />
        <Tile
          tone="topics-tile"
          icon={<Grid2X2 size={29} />}
          title="Topics"
          tamil="வகைகள்"
          detail="Find what’s on your mind"
          onActivate={() => go("/topics", "topic")}
        />
        <Tile
          tone="camera-tile"
          icon={<Camera size={30} />}
          title="Camera"
          tamil="கேமரா"
          detail="Show us what you mean"
          onActivate={() => go("/camera", "camera")}
        />
        <Tile
          tone="type-tile"
          icon={<Keyboard size={30} />}
          title="Type"
          tamil="எழுது"
          detail="A few letters are enough"
          onActivate={() => go("/type", "text")}
        />
      </div>
      <div className="home-bottom">
        <Hint>You choose the words. Sollu only speaks when you tap.</Hint>
        <TapButton
          className="partner-button"
          onActivate={() => navigate("/question")}
        >
          <HeartHandshake size={22} />
          <span>They asked…</span>
          <ArrowRight size={19} />
        </TapButton>
      </div>
      <div className="privacy-inline">
        Browser speech may use an online service. Your saved phrases stay on
        this device.
      </div>
    </>
  );
}
export function QuickStrip() {
  const { settings, speak, begin } = useApp();
  return (
    <section
      className={`quick-strip ${settings.hand === "right" && !settings.keepLeft ? "mirrored" : ""}`}
      aria-label="Quick phrases"
    >
      <div className="quick-heading">
        <span>ALWAYS WITH YOU</span>
        <span>One tap to say it</span>
      </div>
      <div className="quick-buttons">
        {(["help", "yes", "no", "wait"] as const).map((key) => {
          const c = quickPhrases[settings.lang][key];
          return (
            <TapButton
              key={key}
              className={`quick-button quick-${key}`}
              onActivate={(event) => {
                begin({ modality: "topic", raw: key });
                speak(c, ticket(event, c.text), false, settings.lang);
              }}
            >
              <span className="quick-icon">
                {key === "help" ? (
                  <HeartHandshake />
                ) : key === "yes" ? (
                  <Check />
                ) : key === "no" ? (
                  <X />
                ) : (
                  <Clock3 />
                )}
              </span>
              <span>
                {c.text}
                <small>
                  {settings.lang === "ta"
                    ? c.gloss_en
                    : key === "help"
                      ? "Call someone close"
                      : key === "wait"
                        ? "Take your time"
                        : ""}
                </small>
              </span>
            </TapButton>
          );
        })}
      </div>
    </section>
  );
}
export function TypePage() {
  const { settings, session, begin, generate } = useApp();
  const [value, setValue] = useState(
    session?.context.fragment.modality === "text"
      ? session.context.fragment.raw
      : "",
  );
  const words = [
    ...settings.contacts.map((c) => c.name),
    ...settings.vocabulary,
  ]
    .filter((w) => !value || w.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 6);
  return (
    <>
      <Back />
      <PageTitle
        eyebrow="A FEW LETTERS ARE ENOUGH"
        title="Let’s find your words."
        subtitle="Type anything that comes to mind, in either language."
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <label className="field-label" htmlFor="fragment">
          Your words · உங்க வார்த்தைகள்
        </label>
        <textarea
          id="fragment"
          autoFocus
          rows={3}
          maxLength={500}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="tablet… night"
          className="fragment-input"
        />
        <div className="suggestion-chips">
          {words.map((w) => (
            <TapButton key={w} onActivate={() => setValue(w)}>
              {w}
            </TapButton>
          ))}
        </div>
        <TapButton
          className="primary full"
          disabled={!value.trim()}
          onActivate={() => {
            if (!session) begin({ modality: "text", raw: value });
            void generate({ modality: "text", raw: value });
          }}
        >
          <Sparkles size={23} />
          Find my words
          <ArrowRight size={23} />
        </TapButton>
      </form>
      <Hint>
        There’s no right spelling. Tamil, English, or a little of both.
      </Hint>
    </>
  );
}
export function TopicsPage() {
  const { settings, session, begin, generate } = useApp();
  const [category, setCategory] = useState(""),
    [part, setPart] = useState(""),
    [page, setPage] = useState(0);
  const now = clockNow(settings);
  const due = new Set(
    settings.routines
      .filter((r) => Math.abs(minuteDistance(r.time, now)) <= 45)
      .map((r) => r.topic),
  );
  const ordered = [...topics].sort(
    (a, b) => Number(due.has(b.id)) - Number(due.has(a.id)),
  );
  function send(path: string[], raw = path.join(" ")) {
    const fragment: Fragment = { modality: "topic", raw, topicPath: path };
    if (!session) begin(fragment);
    void generate(fragment);
  }
  const selected = topics.find((t) => t.id === category);
  const items =
    category === "pain"
      ? part
        ? []
        : painParts.map((p) => ({
            id: p.id,
            icon:
              p.id === "chest"
                ? "🫀"
                : p.id === "head"
                  ? "🙂"
                  : p.id === "shoulder"
                    ? "💪"
                    : "🧍",
            ta: p.ta,
            en: p.en,
          }))
      : category === "people"
        ? settings.contacts.map((c) => ({
            id: c.id,
            icon: "👤",
            ta: c.name,
            en: c.name,
          }))
        : category === "food"
          ? [
              { id: "idli", icon: "🍚", ta: "இட்லி", en: "Idli" },
              { id: "dosa", icon: "🥞", ta: "தோசை", en: "Dosa" },
              { id: "rasam", icon: "🍲", ta: "ரசம்", en: "Rasam" },
              { id: "rice", icon: "🍚", ta: "சாதம்", en: "Rice" },
            ]
          : category === "drink"
            ? [
                { id: "water", icon: "💧", ta: "தண்ணி", en: "Water" },
                { id: "coffee", icon: "☕", ta: "காபி", en: "Coffee" },
                { id: "tea", icon: "🍵", ta: "டீ", en: "Tea" },
                { id: "milk", icon: "🥛", ta: "பால்", en: "Milk" },
              ]
            : ordered;
  function choose(id: string) {
    if (!category) {
      if (["pain", "people", "food", "drink"].includes(id)) {
        setCategory(id);
        setPage(0);
      } else send([id]);
    } else if (category === "pain") {
      const p = painParts.find((p) => p.id === id);
      if (p?.paired) {
        setPart(id);
        setPage(0);
      } else send(["pain", id]);
    } else
      send(
        [category, id],
        category === "people"
          ? settings.contacts.find((c) => c.id === id)?.name
          : id,
      );
  }
  return (
    <>
      <Back />
      <PageTitle
        eyebrow={selected?.en ?? "FIND A TOPIC"}
        title={
          part
            ? "Which side?"
            : category === "pain"
              ? "Where does it hurt?"
              : selected
                ? `Let’s talk about ${selected.en.toLowerCase()}.`
                : "What’s on your mind?"
        }
        subtitle={
          part
            ? "Choose your own left or right."
            : "Pick a picture. We’ll help with the words."
        }
      />
      {category && (
        <TapButton
          className="back-button"
          onActivate={() => {
            if (part) setPart("");
            else setCategory("");
            setPage(0);
          }}
        >
          <ChevronLeft />
          Back to {part ? "body parts" : "topics"}
        </TapButton>
      )}
      {part ? (
        <div className="topic-grid">
          {(["left", "right"] as const).map((side) => (
            <TapButton
              className="topic-tile"
              key={side}
              onActivate={() => send(["pain", part, side])}
            >
              <span className="topic-emoji">
                {side === "left" ? "⬅️" : "➡️"}
              </span>
              <strong>{side === "left" ? "Left" : "Right"}</strong>
              <span lang="ta">{side === "left" ? "இடது" : "வலது"}</span>
            </TapButton>
          ))}
        </div>
      ) : (
        <>
          <div className="topic-grid">
            {items.slice(page * 4, page * 4 + 4).map((t) => (
              <TapButton
                className="topic-tile"
                key={t.id}
                onActivate={() => choose(t.id)}
              >
                <span className="topic-emoji">{t.icon}</span>
                <strong>{t.en}</strong>
                <span lang="ta">{t.ta}</span>
              </TapButton>
            ))}
          </div>
          {items.length > 4 && (
            <div className="pagination">
              <TapButton
                disabled={page === 0}
                onActivate={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
                Previous
              </TapButton>
              <span>
                {page + 1} of {Math.ceil(items.length / 4)}
              </span>
              <TapButton
                disabled={(page + 1) * 4 >= items.length}
                onActivate={() => setPage((p) => p + 1)}
              >
                More topics
                <ChevronRight />
              </TapButton>
            </div>
          )}
        </>
      )}
    </>
  );
}
function SentenceText({ c }: { c: Candidate }) {
  const i = c.text.indexOf(c.keyword);
  return i < 0 ? (
    <>{c.text}</>
  ) : (
    <>
      {c.text.slice(0, i)}
      <mark>{c.keyword}</mark>
      {c.text.slice(i + c.keyword.length)}
    </>
  );
}
export function ConfirmPage() {
  const { session, settings, speak, retry, generate } = useApp();
  const [selected, setSelected] = useState<Candidate | null>(null);
  const navigate = useNavigate();
  useEffect(
    () => setSelected(null),
    [session?.candidates, session?.context.outputLang],
  );
  if (!session)
    return (
      <>
        <Back />
        <Empty title="Start with a word">
          Choose Speak, Topics, Camera or Type from Home.
        </Empty>
      </>
    );
  const { candidates, loading, context } = session;
  return (
    <>
      <Back />
      <div className="heard-row">
        <span>
          {context.fragment.modality === "camera"
            ? "📷 I see"
            : context.fragment.modality === "speech"
              ? "🎤 I heard"
              : "💬 Your words"}
          : <strong>{context.fragment.raw}</strong>
        </span>
        <span className="mode-badge">{session.model || "Finding words"}</span>
      </div>
      <PageTitle
        title="Is this what you mean?"
        subtitle="Tap your sentence to say it. Listen lets you hear a preview."
      />
      <div className="confirm-context">
        <TapButton onActivate={() => navigate("/people")}>
          To: {context.addressee?.name ?? "Someone nearby"}
          <ChevronRight size={18} />
        </TapButton>
        <TapButton
          onActivate={() =>
            void generate(
              undefined,
              1,
              context.outputLang === "ta" ? "en" : "ta",
            )
          }
        >
          {context.outputLang === "ta" ? "தமிழ் → English" : "English → தமிழ்"}
        </TapButton>
        {context.fragment.modality === "speech" && (
          <TapButton onActivate={() => navigate("/speak")}>
            <RotateCcw size={20} />
            Try speaking again
          </TapButton>
        )}
      </div>
      <div className="candidate-list" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="loading-cards">
            {[1, 2, 3].map((x) => (
              <div className="loading-card" key={x}>
                <span />
                <div>
                  <i />
                  <i />
                </div>
              </div>
            ))}
            <p>Finding a few ways to say it…</p>
          </div>
        ) : (
          candidates.map((c, i) => (
            <div
              className={`candidate-row urgency-${c.urgency}`}
              key={`${c.text}-${i}`}
            >
              <TapButton
                className={`candidate-card ${selected?.text === c.text ? "selected" : ""}`}
                onActivate={(event) => {
                  if (settings.twoStep) setSelected(c);
                  else speak(c, ticket(event, c.text));
                }}
              >
                <span className="candidate-icon">{c.icon}</span>
                <span className="candidate-copy">
                  {session.usual === c.text && (
                    <span className="usual-label">★ Your usual</span>
                  )}
                  <span
                    className="candidate-sentence"
                    lang={context.outputLang}
                  >
                    <SentenceText c={c} />
                  </span>
                  {settings.showGloss && context.outputLang === "ta" && (
                    <span className="candidate-gloss">{c.gloss_en}</span>
                  )}
                </span>
                <ArrowRight className="candidate-arrow" size={23} />
              </TapButton>
              <TapButton
                className="listen-button"
                aria-label={`Listen: ${c.text}`}
                onActivate={(event) => speak(c, ticket(event, c.text), true)}
              >
                <Ear size={25} />
                <span>Listen</span>
              </TapButton>
            </div>
          ))
        )}
      </div>
      {session.error && (
        <div role="status" className="notice amber">
          {session.error}
          <TapButton onActivate={() => navigate("/phrases")}>
            Open My phrases
            <ArrowRight />
          </TapButton>
        </div>
      )}
      {settings.twoStep && selected && !loading && (
        <TapButton
          className="primary full"
          onActivate={(event) => speak(selected, ticket(event, selected.text))}
        >
          <Volume2 />
          Say: {selected.text}
        </TapButton>
      )}
      {!loading && (
        <TapButton
          className="none-button"
          onActivate={() => {
            setSelected(null);
            retry();
          }}
        >
          <RotateCcw size={22} />
          <span>
            None of these <small lang="ta">இதுல எதுவும் இல்ல</small>
          </span>
          <ArrowRight size={22} />
        </TapButton>
      )}
      <div className="round-label">
        Choice round {context.round} of 3 · You can always start over
      </div>
    </>
  );
}
export function SpeakingPage({ help = false }: { help?: boolean }) {
  const { session, speak, stop, settings, helpAck, cancelHelp, abandon } =
    useApp();
  const navigate = useNavigate();
  const c = session?.chosen;
  if (!c)
    return (
      <>
        <Back />
        <Empty title="Your voice is ready when you are">
          Choose an exact sentence first.
        </Empty>
      </>
    );
  const sms =
    settings.contacts.find((p) => p.isCaregiver && p.phone)?.phone ?? "";
  return (
    <>
      <Back />
      <PageTitle
        eyebrow={help ? "REACH SOMEONE CLOSE" : "YOUR WORDS"}
        title={help ? "Let’s get you some help." : "Your chosen words."}
      />
      <div className={`speaking-card ${help ? "help-active" : ""}`}>
        <span className="spoken-icon">{c.icon}</span>
        <TapButton
          className="spoken-sentence"
          onActivate={(event) =>
            speak(c, ticket(event, c.text), false, session.context.outputLang)
          }
        >
          {c.text}
        </TapButton>
        {session.context.outputLang === "ta" && <p>{c.gloss_en}</p>}
        <div className="voice-bars" aria-hidden="true">
          {Array.from({ length: 17 }, (_, i) => (
            <i
              style={{ height: `${12 + Math.sin(i * 2) * 8 + (i % 3) * 8}px` }}
              key={i}
            />
          ))}
        </div>
        <span className="source-label">
          {session.source || "Waiting for playback"}
        </span>
      </div>
      <p className="audio-status" role="status">
        {session.audioStatus}
      </p>
      <div className="speaking-actions">
        <TapButton className="stop-button" onActivate={stop}>
          <Square fill="currentColor" size={19} />
          Stop
        </TapButton>
        <TapButton
          className="secondary"
          onActivate={(event) =>
            speak(c, ticket(event, c.text), false, session.context.outputLang)
          }
        >
          <RotateCcw />
          Say again
        </TapButton>
      </div>
      {session.delivery && (
        <div className="delivery-status">{session.delivery}</div>
      )}
      {help ? (
        <>
          <div className="help-ack" role="status">
            {helpAck || "Waiting for someone to reply…"}
          </div>
          <a
            className="tap primary full"
            data-tap
            href={`sms:${sms}?body=${encodeURIComponent("I need help. Please come to me.")}`}
          >
            <Send />
            Send SMS
          </a>
          <TapButton
            className="secondary full"
            onActivate={() => {
              cancelHelp();
              abandon();
              navigate("/");
            }}
          >
            <X />
            It was a mistake
          </TapButton>
          <p className="help-disclaimer">
            Sollu is not an emergency service. In an emergency call 112.
          </p>
        </>
      ) : (
        <TapButton
          className="primary full"
          onActivate={() => {
            abandon();
            navigate("/");
          }}
        >
          <Check />
          Done
        </TapButton>
      )}
    </>
  );
}
export function PhrasesPage() {
  const { settings, begin, speak } = useApp();
  const phrases =
    useLiveQuery(
      () => db.phrases.where("lang").equals(settings.lang).toArray(),
      [settings.lang],
    ) ?? [];
  const memories =
    useLiveQuery(
      () =>
        db.kv
          .filter((row) =>
            row.key.startsWith(`memory-candidate:${settings.lang}:`),
          )
          .limit(8)
          .toArray(),
      [settings.lang],
    ) ?? [];
  const all = [
    ...defaultPhrases[settings.lang],
    ...phrases.map((p) => p.candidate),
    ...memories.map((m) => m.value as Candidate),
  ].filter((c, i, a) => a.findIndex((x) => x.text === c.text) === i);
  return (
    <>
      <Back />
      <PageTitle
        eyebrow="WORDS YOU CAN KEEP CLOSE"
        title="My phrases"
        subtitle="Familiar words, ready whenever you need them."
      />
      <div className="phrase-list">
        {all.map((c) => (
          <TapButton
            className="phrase-card"
            key={c.text}
            onActivate={(event) => {
              begin({ modality: "topic", raw: c.reading });
              speak(c, ticket(event, c.text), false, settings.lang);
            }}
          >
            <span className="phrase-icon">{c.icon}</span>
            <span>
              <strong>{c.text}</strong>
              {settings.lang === "ta" && <small>{c.gloss_en}</small>}
            </span>
            <Volume2 />
          </TapButton>
        ))}
      </div>
      <Hint>
        A family member can record these exact phrases in Voice Studio.
      </Hint>
    </>
  );
}
export function PeoplePage() {
  const { settings, updateSettings, session, generate } = useApp();
  const navigate = useNavigate();
  return (
    <>
      <Back />
      <PageTitle
        title="Who are you talking to?"
        subtitle="Their language and the way you speak to them come along."
      />
      <div className="topic-grid">
        {settings.contacts.map((c, i) => (
          <TapButton
            className="person-tile"
            key={c.id}
            onActivate={() => {
              void updateSettings({ addressee: c.id }).then(() => {
                if (session?.candidates.length) void generate();
                else navigate("/");
              });
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
      {session?.candidates.length ? (
        <TapButton className="primary full" onActivate={() => void generate()}>
          Update these sentences
          <ArrowRight />
        </TapButton>
      ) : null}
    </>
  );
}
export function RecentPage() {
  const attempts =
    useLiveQuery(() =>
      db.attempts.orderBy("startedAt").reverse().limit(20).toArray(),
    ) ?? [];
  return (
    <>
      <Back />
      <PageTitle
        title="Recent words"
        subtitle="The things you chose to say, kept on this device."
      />
      {attempts.filter((a) => a.chosenText).length ? (
        <div className="recent-list">
          {attempts
            .filter((a) => a.chosenText)
            .map((a) => (
              <article key={a.id}>
                <span className="recent-time">
                  {new Date(a.startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <p>{a.chosenText}</p>
                <small>
                  {a.taps} taps{" "}
                  {a.timeToSpeechMs
                    ? `· ${(a.timeToSpeechMs / 1000).toFixed(1)}s`
                    : ""}{" "}
                  {a.demoClock ? "· Demo" : ""}
                </small>
              </article>
            ))}
        </div>
      ) : (
        <Empty title="Your words will appear here">
          After you choose and speak a sentence, you can find it here.
        </Empty>
      )}
    </>
  );
}

interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResultLike };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function SpeakPage({ partner = false }: { partner?: boolean }) {
  const { settings, session, begin, generate, setQuestion, online } = useApp();
  const navigate = useNavigate();
  const recognition = useRef<Recognition | null>(null),
    transcript = useRef(""),
    submitted = useRef(false);
  const [listening, setListening] = useState(false),
    [heard, setHeard] = useState(""),
    [error, setError] = useState("");
  const submitRef = useRef((_text: string) => {});
  submitRef.current = (text: string) => {
    if (submitted.current || !text.trim()) return;
    submitted.current = true;
    if (partner) {
      setQuestion(text);
      navigate("/");
    } else {
      void generate({ modality: "speech", raw: text });
    }
  };
  useEffect(() => {
    if (!partner && !session) begin({ modality: "speech", raw: "" });
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!online) {
      setError("You’re offline. Use Topics or My phrases.");
      return;
    }
    if (!Constructor) {
      setError(
        "Speech recognition isn’t available in this browser. You can type, use Topics, or try the labelled demo below.",
      );
      return;
    }
    const rec = new Constructor();
    recognition.current = rec;
    rec.lang = settings.lang === "ta" ? "ta-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    let silence: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      rec.stop();
      setListening(false);
      if (transcript.current) submitRef.current(transcript.current);
    };
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++)
        text += e.results[i][0].transcript + " ";
      transcript.current = text.trim();
      setHeard(transcript.current);
      clearTimeout(silence);
      if (text.trim()) silence = setTimeout(finish, 3000);
    };
    rec.onerror = (e) => {
      setListening(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone access wasn’t allowed. Type or choose a topic instead."
          : "We couldn’t hear that. You can try again, type, or choose a topic.",
      );
    };
    rec.onend = () => {
      setListening(false);
      if (transcript.current) submitRef.current(transcript.current);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("The microphone could not start. Try another input.");
    }
    const cap = setTimeout(finish, 15000);
    return () => {
      clearTimeout(cap);
      clearTimeout(silence);
      rec.onend = null;
      rec.onresult = null;
      rec.abort();
    };
    // The recorder starts once on entering this screen, never on transcript updates.
  }, []);
  return (
    <>
      <Back />
      <PageTitle
        eyebrow={partner ? "A LITTLE CONTEXT HELPS" : "ONE WORD IS ENOUGH"}
        title={
          partner
            ? "What did they ask?"
            : listening
              ? "I’m listening."
              : "Let’s hear your words."
        }
        subtitle={
          partner
            ? "Speak their question. It stays in context for five minutes."
            : "Take your time. A word, a pause, a little of both."
        }
      />
      <div className={`listening-panel ${listening ? "is-listening" : ""}`}>
        <div className="mic-orb">
          <Mic size={46} />
        </div>
        <div className="listening-dots">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <i key={i} style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p>{heard || "உங்க குரல் · Your voice"}</p>
        <small>
          {listening
            ? "Listening through your browser"
            : "Microphone is not recording"}
        </small>
      </div>
      {error && (
        <div className="notice amber" role="status">
          {error}
        </div>
      )}
      <div className="speaking-actions">
        <TapButton
          className="primary"
          disabled={!heard}
          onActivate={() => {
            recognition.current?.stop();
            submitRef.current(heard);
          }}
        >
          <Check />
          Done
        </TapButton>
        <TapButton
          className="secondary"
          onActivate={() => {
            recognition.current?.abort();
            navigate("/type");
          }}
        >
          <Keyboard />
          Type instead
        </TapButton>
      </div>
      {settings.demo && (
        <div className="demo-fragments">
          <span className="eyebrow">DEMO INPUT · NO TRANSCRIPTION</span>
          <p>Explore the flow with a sample fragment.</p>
          {(partner
            ? ["மதியம் என்ன சாப்பிடணும்?"]
            : ["tablet… raathiri", "தண்ணி", "table"]
          ).map((text) => (
            <TapButton
              key={text}
              className="demo-fragment"
              onActivate={() => {
                recognition.current?.abort();
                submitRef.current(text);
              }}
            >
              {text}
              <ArrowRight size={18} />
            </TapButton>
          ))}
        </div>
      )}
      <p className="privacy-inline">
        Speech may be processed by your browser’s online service. Tamil support
        depends on your browser.
      </p>
    </>
  );
}
export function BaselinePage() {
  const { begin, finishBaseline, settings } = useApp();
  const [words, setWords] = useState<string[]>([]),
    [result, setResult] = useState("");
  const text = words.join(" ");
  const keys = [
    ["I", "🙋"],
    ["want", "🤲"],
    ["need", "🙏"],
    ["go", "🚶"],
    ["eat", "🍽️"],
    ["drink", "🥤"],
    ["water", "💧"],
    ["tablet", "💊"],
    ["toilet", "🚻"],
    ["pain", "🤕"],
    ["help", "🆘"],
    ["yes", "👍"],
    ["no", "✋"],
    ["more", "➕"],
    ["please", "🤝"],
    ["night", "🌙"],
  ];
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
              lang: "en",
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
                setResult("An English device voice is not installed.");
            });
        }}
      >
        <Volume2 />
        {text || "Build a sentence first"}
      </TapButton>
      {result && <div className="notice">{result} · Device voice</div>}
      <p className="privacy-inline">
        An English core-word board for a live comparison.{" "}
        {settings.demo ? "Demo clock is on." : ""}
      </p>
    </>
  );
}
