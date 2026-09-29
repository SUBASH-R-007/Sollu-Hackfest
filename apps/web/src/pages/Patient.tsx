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
  requiresPredefinedCommunication,
  topics,
  type Candidate,
  type Fragment,
  type Lang,
} from "@sollu/shared";
import { useApp } from "../state";
import { db } from "../db";
import { clockNow, getNearbyRoutines, inferenceContext } from "../lib/context";
import { ContextSummary } from "../features/context/ContextSummary";
import { audio } from "../features/audio";
import { Back, Empty, Hint, PageTitle, TapButton, Tile } from "../ui";
import { copy, uiText } from "../lib/copy";
import { extractTranscript } from "../lib/transcript";
import { prepareBrowserRecognition } from "../features/privacy/browserPolicy";
import { useSpeechRecognitionMode } from "../features/privacy/useSpeechRecognitionMode";
import { recognitionErrorMessage } from "../features/privacy/recognitionDiagnostics";

const ticket = (event: Event, text: string) =>
  audio.createTap(event, text, { role: "patient", surface: "patient" });
export function Home() {
  const { settings, begin, question, online } = useApp();
  const recognitionMode = useSpeechRecognitionMode();
  const navigate = useNavigate();
  const now = clockNow(settings);
  const due = getNearbyRoutines(settings, now)[0]?.routine;
  const contact = settings.contacts.find((c) => c.id === settings.addressee);
  const inputs = [
    {
      id: "speech",
      path: "/speak",
      modality: "speech",
      tone: "speak-tile",
      icon: <Mic size={31} />,
      title: "Speak",
      tamil: "பேசு",
      detail: "A word is a good place to start",
    },
    {
      id: "topics",
      path: "/topics",
      modality: "topic",
      tone: "topics-tile",
      icon: <Grid2X2 size={29} />,
      title: "Topics",
      tamil: "தலைப்புகள்",
      detail: "Find what’s on your mind",
    },
    {
      id: "camera",
      path: "/camera",
      modality: "camera",
      tone: "camera-tile",
      icon: <Camera size={30} />,
      title: "Camera",
      tamil: "கேமரா",
      detail: "Show us what you mean",
    },
    {
      id: "type",
      path: "/type",
      modality: "text",
      tone: "type-tile",
      icon: <Keyboard size={30} />,
      title: "Type",
      tamil: "எழுது",
      detail: "A few letters are enough",
    },
  ] as const;
  const orderedInputs = [...inputs].sort(
    (a, b) =>
      Number(b.id === settings.preferredInput) -
      Number(a.id === settings.preferredInput),
  );
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
            <small>
              {copy(settings.lang, "I’m talking to", "நான் பேசுவது")}
            </small>
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
        {orderedInputs.map((input) => (
          <Tile
            key={input.id}
            tone={input.tone}
            icon={input.icon}
            title={input.title}
            tamil={input.tamil}
            detail={input.detail}
            onActivate={() => go(input.path, input.modality)}
          />
        ))}
      </div>
      <div className="home-bottom">
        <Hint>
          {copy(
            settings.lang,
            "You choose the words. Sollu only speaks when you tap.",
            "நீங்கள் தேர்ந்தெடுத்து தொட்டால் மட்டுமே பேசும்.",
          )}
        </Hint>
        <TapButton
          className="partner-button"
          onActivate={() => navigate("/question")}
        >
          <HeartHandshake size={22} />
          <span>{uiText(settings.lang, "They asked…")}</span>
          <ArrowRight size={19} />
        </TapButton>
      </div>
      <div className="privacy-inline">
        {settings.localProcessingOnly !== false
          ? "Local-only speech protection is on."
          : recognitionMode === "browser"
            ? "Online speech recognition is selected. Speech may reach the browser vendor."
            : "Speech recognition is local. Some speaking voices may use an online service."}{" "}
        Your saved phrases stay on this device.
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
        <span>
          {copy(settings.lang, "ALWAYS WITH YOU", "எப்போதும் உங்களுடன்")}
        </span>
        <span>
          {copy(settings.lang, "One tap to say it", "தொட்டால் பேசும்")}
        </span>
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
  const { settings, session, begin, generate, updateDraft } = useApp();
  const [value, setValue] = useState(session?.context.fragment.raw ?? "");
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
          onChange={(e) => {
            setValue(e.target.value);
            updateDraft({ modality: "text", raw: e.target.value });
          }}
          placeholder="tablet… night"
          className="fragment-input"
        />
        <div className="suggestion-chips">
          {words.map((w) => (
            <TapButton
              key={w}
              onActivate={() => {
                setValue(w);
                updateDraft({ modality: "text", raw: w });
              }}
            >
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
          {uiText(settings.lang, "Find my words")}
          <ArrowRight size={23} />
        </TapButton>
      </form>
      <Hint>
        There’s no right spelling. Tamil, English, or a little of both.
      </Hint>
    </>
  );
}
type TopicLeaf = { id: string; icon: string; ta: string; en: string };
/** Second-level choices; each leaf is sent as the person's words. */
const subtopics: Record<string, TopicLeaf[]> = {
  food: [
    { id: "idli", icon: "🍚", ta: "இட்லி", en: "Idli" },
    { id: "dosa", icon: "🥞", ta: "தோசை", en: "Dosa" },
    { id: "rasam", icon: "🍲", ta: "ரசம்", en: "Rasam" },
    { id: "rice", icon: "🍛", ta: "சாதம்", en: "Rice" },
  ],
  drink: [
    { id: "water", icon: "💧", ta: "தண்ணி", en: "Water" },
    { id: "coffee", icon: "☕", ta: "காபி", en: "Coffee" },
    { id: "tea", icon: "🍵", ta: "டீ", en: "Tea" },
    { id: "milk", icon: "🥛", ta: "பால்", en: "Milk" },
  ],
  feelings: [
    { id: "happy", icon: "😊", ta: "சந்தோஷம்", en: "Happy" },
    { id: "sad", icon: "😢", ta: "சோகம்", en: "Sad" },
    { id: "worried", icon: "😟", ta: "கவலை", en: "Worried" },
    { id: "scared", icon: "😨", ta: "பயம்", en: "Scared" },
    { id: "angry", icon: "😠", ta: "கோபம்", en: "Angry" },
    { id: "lonely", icon: "🥺", ta: "தனிமை", en: "Lonely" },
    { id: "tired", icon: "🥱", ta: "களைப்பு", en: "Tired" },
    { id: "bored", icon: "😐", ta: "போரடிக்குது", en: "Bored" },
    { id: "confused", icon: "😕", ta: "குழப்பம்", en: "Confused" },
    { id: "calm", icon: "😌", ta: "நிம்மதி", en: "Calm" },
  ],
  tv_phone: [
    { id: "tv", icon: "📺", ta: "டிவி", en: "TV" },
    { id: "phone", icon: "📱", ta: "ஃபோன்", en: "Phone" },
    { id: "music", icon: "🎵", ta: "பாட்டு", en: "Music" },
  ],
  go_out: [
    { id: "outside", icon: "🌳", ta: "வெளியே", en: "Outside" },
    { id: "home", icon: "🏠", ta: "வீட்டுக்கு", en: "Home" },
  ],
};
const painIcons: Record<string, string> = {
  head: "🤕",
  mouth: "👄",
  tooth: "🦷",
  throat: "🗣️",
  chest: "🫀",
  stomach: "🫃",
  back: "🧍",
  neck: "🧣",
  eye: "👁️",
  ear: "👂",
  shoulder: "🤷",
  arm: "💪",
  hand: "✋",
  wrist: "⌚",
  hip: "🩳",
  knee: "🦵",
  leg: "🦿",
  foot: "🦶",
  ankle: "👟",
};
const perPage = 6;
/** What the person tapped, in their language (never an internal topic id). */
export function topicLabel(
  fragment: Fragment,
  lang: "ta" | "en",
  contacts: { id: string; name: string; aliases: string[] }[],
): string {
  const path = fragment.topicPath ?? [];
  const pick = (item?: { ta: string; en: string }) =>
    item ? (lang === "ta" ? item.ta : item.en) : undefined;
  if (path[0] === "pain") {
    const part = painParts.find((p) => p.id === path[1]);
    const side =
      path[2] === "left"
        ? copy(lang, "left", "இடது")
        : path[2] === "right"
          ? copy(lang, "right", "வலது")
          : "";
    const topic = topics.find((t) => t.id === "pain");
    return [pick(topic), side, pick(part)].filter(Boolean).join(" · ");
  }
  if (path[0] === "people") {
    const contact = contacts.find((c) => c.id === path[1]);
    return (
      (lang === "ta"
        ? contact?.aliases.find((a) => /\p{Script=Tamil}/u.test(a))
        : undefined) ??
      contact?.name ??
      fragment.raw
    );
  }
  const leaf = subtopics[path[0]]?.find((item) => item.id === path[1]);
  return (
    pick(leaf) ?? pick(topics.find((t) => t.id === path[0])) ?? fragment.raw
  );
}
export function TopicsPage() {
  const { settings, session, begin, generate } = useApp();
  const [category, setCategory] = useState(""),
    [part, setPart] = useState(""),
    [page, setPage] = useState(0);
  const now = clockNow(settings);
  const due = new Set(
    getNearbyRoutines(settings, now).map(({ routine }) => routine.topic),
  );
  const ordered = [...topics].sort(
    (a, b) => Number(due.has(b.id)) - Number(due.has(a.id)),
  );
  // Send only the tapped item as the person's words; the path keeps context.
  function send(path: string[], raw: string) {
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
            icon: painIcons[p.id] ?? "🧍",
            ta: p.ta,
            en: p.en,
          }))
      : category === "people"
        ? settings.contacts.map((c) => ({
            id: c.id,
            icon: "👤",
            ta:
              c.aliases.find((alias) => /\p{Script=Tamil}/u.test(alias)) ??
              c.name,
            en: c.name,
          }))
        : (subtopics[category] ?? ordered);
  function choose(id: string) {
    if (!category) {
      if (id === "pain" || id === "people" || subtopics[id]) {
        setCategory(id);
        setPage(0);
      } else if (id === "prayer") send(["prayer", "pray"], "pray");
      else send([id], id);
    } else if (category === "pain") {
      const p = painParts.find((p) => p.id === id);
      if (p?.paired) {
        setPart(id);
        setPage(0);
      } else send(["pain", id], `pain ${id}`);
    } else
      send(
        [category, id],
        category === "people"
          ? (settings.contacts.find((c) => c.id === id)?.name ?? id)
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
                ? copy(
                    settings.lang,
                    `Let’s talk about ${selected.en.toLowerCase()}.`,
                    `${selected.ta} பற்றிப் பேசுவோம்`,
                  )
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
          {copy(
            settings.lang,
            `Back to ${part ? "body parts" : "topics"}`,
            part ? "உடல் பகுதிகளுக்குத் திரும்பு" : "தலைப்புகளுக்குத் திரும்பு",
          )}
        </TapButton>
      )}
      {part ? (
        <div className="topic-grid">
          {(["left", "right"] as const).map((side) => (
            <TapButton
              className="topic-tile"
              key={side}
              onActivate={() =>
                send(["pain", part, side], `pain ${part} ${side}`)
              }
            >
              <span className="topic-emoji">
                {side === "left" ? "⬅️" : "➡️"}
              </span>
              <strong>
                {copy(
                  settings.lang,
                  side === "left" ? "Left" : "Right",
                  side === "left" ? "இடது" : "வலது",
                )}
              </strong>
              {settings.lang === "en" && (
                <span lang="ta">{side === "left" ? "இடது" : "வலது"}</span>
              )}
            </TapButton>
          ))}
        </div>
      ) : (
        <>
          <div className="topic-grid">
            {items.slice(page * perPage, page * perPage + perPage).map((t) => (
              <TapButton
                className="topic-tile"
                key={t.id}
                onActivate={() => choose(t.id)}
              >
                <span className="topic-emoji">{t.icon}</span>
                <strong>{copy(settings.lang, t.en, t.ta)}</strong>
                {settings.lang === "en" && <span lang="ta">{t.ta}</span>}
              </TapButton>
            ))}
          </div>
          {items.length > perPage && (
            <div className="pagination">
              <TapButton
                disabled={page === 0}
                onActivate={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
                {uiText(settings.lang, "Previous")}
              </TapButton>
              <span>
                {page + 1} / {Math.ceil(items.length / perPage)}
              </span>
              <TapButton
                disabled={(page + 1) * perPage >= items.length}
                onActivate={() => setPage((p) => p + 1)}
              >
                {copy(settings.lang, "More topics", "மேலும் தலைப்புகள்")}
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
  const {
    session,
    settings,
    speak,
    retry,
    generate,
    showMoreChoices,
    showPreparedChoices,
  } = useApp();
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
  const hasModelChoices = [
    ...candidates,
    ...(session.moreCandidates ?? []),
  ].some((candidate) => candidate.source === "model");
  // Other hearings the recognizer offered for this speech attempt.
  const heardKey = (text: string) =>
    text.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const heardAlternatives =
    context.fragment.modality === "speech"
      ? [...new Set(context.fragment.sttAlternatives ?? [])]
          .filter(
            (alternative) =>
              heardKey(alternative) &&
              heardKey(alternative) !== heardKey(context.fragment.raw),
          )
          .slice(0, 2)
      : [];
  return (
    <>
      <Back />
      <div className="heard-row">
        <span>
          {context.fragment.modality === "camera"
            ? copy(settings.lang, "📷 I see", "📷 நான் பார்ப்பது")
            : context.fragment.modality === "speech"
              ? copy(settings.lang, "🎤 I heard", "🎤 நான் கேட்டது")
              : context.fragment.modality === "topic"
                ? copy(settings.lang, "🗂️ You chose", "🗂️ நீங்கள் தேர்ந்தது")
                : copy(settings.lang, "💬 Your words", "💬 உங்கள் வார்த்தைகள்")}
          :{" "}
          <strong>
            {context.fragment.modality === "topic"
              ? topicLabel(context.fragment, settings.lang, settings.contacts)
              : context.fragment.raw}
          </strong>
        </span>
        <span className="mode-badge">{session.model || "Finding words"}</span>
      </div>
      <PageTitle
        title={copy(
          settings.lang,
          "Is this what you mean?",
          "நீங்கள் சொல்ல வந்தது இதுவா?",
        )}
        subtitle={
          settings.twoStep
            ? copy(
                settings.lang,
                "Choose a sentence, then tap Say to speak.",
                "ஒரு வாக்கியத்தைத் தேர்ந்தெடுத்து, ‘சொல்’ தொடுங்கள்.",
              )
            : copy(
                settings.lang,
                "Tap your sentence to say it.",
                "சொல்ல உங்கள் வாக்கியத்தைத் தொடுங்கள்.",
              )
        }
      />
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
            <p>
              {copy(
                settings.lang,
                "Finding a few ways to say it…",
                "வாக்கியங்களைத் தேடுகிறோம்…",
              )}
            </p>
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
                  else
                    speak(c, ticket(event, c.text), false, context.outputLang);
                }}
              >
                <span className="candidate-icon">{c.icon}</span>
                <span className="candidate-copy">
                  {c.reading.includes("→") && (
                    <span className="candidate-reading candidate-gloss">
                      {c.reading}
                    </span>
                  )}
                  {c.source === "model" && (
                    <span className="usual-label">
                      {copy(
                        settings.lang,
                        "AI draft · Check the meaning",
                        "AI வரைவு · பொருளைச் சரிபாருங்கள்",
                      )}
                    </span>
                  )}
                  {hasModelChoices && c.source === "catalog" && (
                    <span className="usual-label">
                      {copy(
                        settings.lang,
                        "Prepared option · Check the meaning",
                        "தயாரான விருப்பம் · பொருளைச் சரிபாருங்கள்",
                      )}
                    </span>
                  )}
                  {session.usual === c.text && (
                    <span className="usual-label">
                      ★{" "}
                      {copy(
                        settings.lang,
                        "Your approved phrase",
                        "நீங்கள் ஒப்புக்கொண்ட வாக்கியம்",
                      )}
                    </span>
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
                onActivate={(event) =>
                  speak(c, ticket(event, c.text), true, context.outputLang)
                }
              >
                <Ear size={25} />
                <span>{uiText(settings.lang, "Listen")}</span>
              </TapButton>
            </div>
          ))
        )}
      </div>
      {!loading && heardAlternatives.length > 0 && (
        <div
          className="confirm-context"
          role="group"
          aria-label={copy(
            settings.lang,
            "Did you say…?",
            "நீங்கள் சொன்னது இதுவா?",
          )}
        >
          <span className="field-label">
            {copy(settings.lang, "Did you say…?", "நீங்கள் சொன்னது இதுவா?")}
          </span>
          {heardAlternatives.map((alternative) => (
            <TapButton
              key={alternative}
              onActivate={() =>
                // Re-run with the person's chosen hearing; nothing is spoken.
                void generate(
                  {
                    ...context.fragment,
                    raw: alternative,
                  },
                  1,
                )
              }
            >
              <span lang={/\p{Script=Tamil}/u.test(alternative) ? "ta" : "en"}>
                {alternative}
              </span>
            </TapButton>
          ))}
        </div>
      )}
      {!loading && Boolean(session.moreCandidates?.length) && (
        <TapButton
          className="secondary-button full"
          onActivate={showMoreChoices}
        >
          <Grid2X2 size={22} />
          {copy(
            settings.lang,
            "Show more options",
            "மேலும் விருப்பங்களைக் காட்டு",
          )}
        </TapButton>
      )}
      {!loading && session.engineNotice && (
        <div role="status" className="notice amber">
          {session.engineNotice}
          {Boolean(session.preparedCandidates?.length) && (
            <TapButton onActivate={showPreparedChoices}>
              {copy(
                settings.lang,
                "Show prepared phrases instead",
                "தயாரான வாக்கியங்களைக் காட்டு",
              )}
              <ArrowRight />
            </TapButton>
          )}
          <TapButton onActivate={() => navigate("/settings?tab=llm")}>
            {copy(
              settings.lang,
              "Sentence engine settings",
              "வாக்கிய இயந்திர அமைப்புகள்",
            )}
            <ArrowRight />
          </TapButton>
        </div>
      )}
      {session.error && (
        <div role="status" className="notice amber">
          {session.error}
          {!loading && context.fragment.raw.trim() && (
            <TapButton onActivate={() => void generate(undefined, 1)}>
              <RotateCcw size={20} />
              {copy(settings.lang, "Find new choices", "புதிய தேர்வுகள்")}
            </TapButton>
          )}
          <TapButton onActivate={() => navigate("/phrases")}>
            {copy(settings.lang, "Open My phrases", "என் வாக்கியங்களைத் திற")}
            <ArrowRight />
          </TapButton>
        </div>
      )}
      {settings.twoStep && selected && !loading && (
        <TapButton
          className="primary full"
          onActivate={(event) =>
            speak(
              selected,
              ticket(event, selected.text),
              false,
              context.outputLang,
            )
          }
        >
          <Volume2 />
          {copy(settings.lang, "Say", "சொல்")}: {selected.text}
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
            {copy(settings.lang, "None of these", "இவற்றில் எதுவும் இல்லை")}
          </span>
          <ArrowRight size={22} />
        </TapButton>
      )}
      <div className="round-label">
        {copy(
          settings.lang,
          `Choice round ${context.round} of 3 · You can always start over`,
          `${context.round} / 3 · மீண்டும் தொடங்கலாம்`,
        )}
      </div>
      {requiresPredefinedCommunication(context) && (
        <p className="notice">
          {copy(
            settings.lang,
            "Health and help messages use prepared wording. Choose only what you mean.",
            "உடல்நலம், உதவி செய்திகளுக்குத் தயாரான வாக்கியங்கள். நீங்கள் சொல்ல வந்ததை மட்டும் தேர்ந்தெடுங்கள்.",
          )}
        </p>
      )}
      <div className="confirm-context">
        <TapButton onActivate={() => navigate("/people")}>
          {copy(settings.lang, "To", "யாரிடம்")}:{" "}
          {context.addressee?.name ??
            copy(settings.lang, "Someone nearby", "அருகில் உள்ளவர்")}
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
            {copy(settings.lang, "Try speaking again", "மீண்டும் பேசு")}
          </TapButton>
        )}
        {context.fragment.modality === "speech" && (
          <TapButton onActivate={() => navigate("/type")}>
            <Keyboard size={20} />
            {copy(settings.lang, "Edit the words", "வார்த்தைகளைத் திருத்து")}
          </TapButton>
        )}
      </div>
      <ContextSummary
        context={
          hasModelChoices ? inferenceContext(context, settings) : context
        }
        lang={settings.lang}
      />
    </>
  );
}
export function SpeakingPage({ help = false }: { help?: boolean }) {
  const {
    session,
    speak,
    stop,
    settings,
    helpAck,
    cancelHelp,
    abandon,
    markCommunication,
  } = useApp();
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
  const smsContact = settings.contacts.find((p) => p.isCaregiver && p.phone);
  const sms = smsContact?.phone ?? "";
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
          {uiText(settings.lang, session.source || "Waiting for playback")}
        </span>
      </div>
      <p className="audio-status" role="status">
        {uiText(settings.lang, session.audioStatus)}
      </p>
      {session.returnTo && (
        <TapButton
          className="full"
          onActivate={() => navigate(session.returnTo!)}
        >
          {copy(
            settings.lang,
            "Back to my message",
            "என் செய்திக்குத் திரும்பு",
          )}
        </TapButton>
      )}
      <div className="speaking-actions">
        <TapButton className="stop-button" onActivate={stop}>
          <Square fill="currentColor" size={19} />
          {uiText(settings.lang, "Stop")}
        </TapButton>
      </div>
      {session.delivery && (
        <div className="delivery-status">{session.delivery}</div>
      )}
      {help ? (
        <>
          <div className="help-ack" role="status">
            {helpAck ||
              copy(
                settings.lang,
                "Waiting for someone to reply…",
                "பதிலுக்குக் காத்திருக்கிறது…",
              )}
          </div>
          <a
            className="tap primary full"
            data-tap
            href={`sms:${sms}?body=${encodeURIComponent(
              copy(
                settings.lang,
                "I need help. Please come to me.",
                "எனக்கு உதவி வேணும். தயவுசெய்து என்னிடம் வாருங்கள்.",
              ),
            )}`}
          >
            <Send />
            {copy(settings.lang, "Send SMS", "குறுஞ்செய்தி அனுப்பு")}
            {smsContact ? ` · ${smsContact.name}` : ""}
          </a>
          {!smsContact && (
            <p className="help-disclaimer">
              {copy(
                settings.lang,
                "No SMS number is saved, so your phone will ask who to text.",
                "குறுஞ்செய்தி எண் சேமிக்கப்படவில்லை; யாருக்கு அனுப்புவது என்று ஃபோன் கேட்கும்.",
              )}
            </p>
          )}
          <TapButton
            className="secondary full"
            onActivate={() => {
              cancelHelp();
              abandon();
              navigate("/");
            }}
          >
            <X />
            {copy(settings.lang, "It was a mistake", "தவறுதலாகத் தொட்டேன்")}
          </TapButton>
          <p className="help-disclaimer">
            {copy(
              settings.lang,
              "Sollu is not an emergency service. In an emergency call 112.",
              "சொல்லு அவசர சேவை அல்ல. அவசர உதவிக்கு 112 அழைக்கவும்.",
            )}
          </p>
        </>
      ) : (
        <>
          <div className="support-grid">
            <TapButton
              onActivate={() => {
                markCommunication("intended");
                navigate("/repair");
              }}
            >
              {copy(
                settings.lang,
                "Check they understood",
                "புரிந்ததா என்று உறுதிசெய்",
              )}
            </TapButton>
            <TapButton
              onActivate={() => {
                markCommunication("needs_repair");
                navigate("/repair");
              }}
            >
              {copy(settings.lang, "Change my message", "என் செய்தியை மாற்று")}
            </TapButton>
          </div>
          <TapButton
            className="primary full"
            onActivate={() => {
              abandon();
              navigate("/");
            }}
          >
            <Check />
            {uiText(settings.lang, "Done")}
          </TapButton>
        </>
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
        db.memories
          .filter((row) => row.lang === settings.lang && row.confirmed === true)
          .limit(8)
          .toArray(),
      [settings.lang],
    ) ?? [];
  const all = [
    ...defaultPhrases[settings.lang],
    ...phrases.map((p) => p.candidate),
    ...memories.flatMap((m) => (m.candidate ? [m.candidate] : [])),
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
  onstart: (() => void) | null;
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
  const recognitionMode = useSpeechRecognitionMode();
  const {
    settings,
    session,
    begin,
    generate,
    setQuestion,
    online,
    updateDraft,
    updateSettings,
  } = useApp();
  const [recordingRun, setRecordingRun] = useState(0);
  // Recognition must listen for the language actually spoken, which can differ
  // from the interface language. The recorder reads the ref when it starts.
  const [speechLang, setSpeechLang] = useState<Lang>(
    settings.speechLang ?? settings.lang,
  );
  const speechLangRef = useRef(speechLang);
  const chooseSpeechLang = (next: Lang) => {
    if (next === speechLangRef.current) return;
    speechLangRef.current = next;
    setSpeechLang(next);
    void updateSettings({ speechLang: next }).catch(() => {
      /* This attempt still uses the choice; only remembering it failed. */
    });
    setRecordingRun((v) => v + 1);
  };
  const navigate = useNavigate();
  const stopRecognition = useRef(() => {});
  const transcript = useRef(""),
    alternatives = useRef<string[]>([]),
    submitted = useRef(false);
  const [listening, setListening] = useState(false),
    [starting, setStarting] = useState(false),
    [heard, setHeard] = useState(""),
    [error, setError] = useState("");
  const heardRef = useRef("");
  heardRef.current = heard;
  // Recognition cannot run here (no API, no local language pack, blocked).
  const [unsupported, setUnsupported] = useState(false),
    [noRecognizer, setNoRecognizer] = useState(false);
  const [typingQuestion, setTypingQuestion] = useState(false),
    [typedQuestion, setTypedQuestion] = useState("");
  const finishNow = useRef(() => {});
  const submitRef = useRef((_text: string) => {});
  submitRef.current = (text: string) => {
    if (submitted.current || !text.trim()) return;
    submitted.current = true;
    if (partner) {
      setQuestion(text);
      navigate("/");
    } else {
      void generate({
        modality: "speech",
        raw: text,
        sttAlternatives:
          text === transcript.current ? alternatives.current : [],
      });
    }
  };
  useEffect(() => {
    setError("");
    setUnsupported(false);
    setNoRecognizer(false);
    setListening(false);
    setStarting(false);
    submitted.current = false;
    if (!partner && !session) begin({ modality: "speech", raw: "" });
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!online && recognitionMode === "browser") {
      setUnsupported(true);
      setError("You’re offline. Use Topics or My phrases.");
      return;
    }
    if (!Constructor) {
      setUnsupported(true);
      setNoRecognizer(true);
      setError(
        recognitionErrorMessage(
          "recognition-unavailable",
          recognitionMode,
          speechLangRef.current,
        ),
      );
      return;
    }
    let rec: Recognition;
    try {
      rec = prepareBrowserRecognition(Constructor);
    } catch (failure) {
      setUnsupported(true);
      setNoRecognizer(true);
      setError(
        failure instanceof Error
          ? failure.message
          : "Local speech recognition is unavailable. Use typing or Topics.",
      );
      return;
    }
    const prefix = transcript.current;
    rec.lang = speechLangRef.current === "ta" ? "ta-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    let active = true;
    let started = false;
    let receivedSpeech = false;
    let silence: ReturnType<typeof setTimeout> | undefined;
    let cap: ReturnType<typeof setTimeout> | undefined;
    let stopDeadline: ReturnType<typeof setTimeout> | undefined;
    // Done asks the recognizer to finalize instead of discarding its last
    // (possibly provisional) hearing and alternatives.
    let doneRequested = false;
    const dispose = () => {
      if (!active) return;
      active = false;
      clearTimeout(cap);
      clearTimeout(silence);
      clearTimeout(startup);
      clearTimeout(stopDeadline);
      rec.onstart = rec.onend = rec.onresult = rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* The browser may already have ended. */
      }
      setListening(false);
      setStarting(false);
    };
    stopRecognition.current = dispose;
    const fail = (code: string) => {
      if (!active) return;
      dispose();
      // Retrying cannot help these; lead with Topics and Type instead.
      if (
        [
          "language-not-supported",
          "service-not-allowed",
          "not-allowed",
          "NotAllowedError",
          "SecurityError",
          "recognition-unavailable",
        ].includes(code)
      )
        setUnsupported(true);
      setError(recognitionErrorMessage(code, recognitionMode, rec.lang));
    };
    const finish = () => {
      if (!active) return;
      dispose();
      if ((receivedSpeech || doneRequested) && transcript.current.trim())
        submitRef.current(transcript.current);
      else
        setError(
          recognitionErrorMessage("no-speech", recognitionMode, rec.lang),
        );
    };
    // No time limit on the person (I-10): after 15 s the microphone closes,
    // but nothing is submitted until they tap Done or keep listening.
    const closeMicrophone = () => {
      if (!active) return;
      dispose();
      setError(
        transcript.current.trim()
          ? copy(
              settings.lang,
              "The microphone has stopped. Tap Done to use these words, or Keep listening.",
              "மைக் நின்றது. இந்த வார்த்தைகளுக்கு ‘முடிந்தது’ தொடுங்கள், அல்லது தொடர்ந்து கேளுங்கள்.",
            )
          : recognitionErrorMessage("no-speech", recognitionMode, rec.lang),
      );
    };
    finishNow.current = () => {
      if (!active) {
        submitRef.current(transcript.current || heardRef.current);
        return;
      }
      doneRequested = true;
      clearTimeout(silence);
      clearTimeout(cap);
      try {
        rec.stop();
      } catch {
        finish();
        return;
      }
      // Some engines never fire onend after stop(); do not leave Done hanging.
      stopDeadline = setTimeout(finish, 1500);
    };
    rec.onstart = () => {
      if (!active || started) return;
      started = true;
      clearTimeout(startup);
      setStarting(false);
      setListening(true);
      cap = setTimeout(closeMicrophone, 15000);
    };
    rec.onresult = (e) => {
      if (!active) return;
      const result = extractTranscript(e.results, prefix);
      receivedSpeech = result.text.trim() !== prefix.trim();
      transcript.current = result.text;
      alternatives.current = result.alternatives;
      setHeard(transcript.current);
      if (!partner)
        updateDraft({
          modality: "speech",
          raw: transcript.current,
          sttAlternatives: alternatives.current,
        });
      clearTimeout(silence);
      if (transcript.current.trim())
        silence = setTimeout(finish, settings.pauseSeconds * 1000);
    };
    rec.onerror = (e) => fail(e.error);
    rec.onend = finish;
    setStarting(true);
    const startup = setTimeout(() => fail("start-timeout"), 10000);
    try {
      rec.start();
    } catch (failure) {
      fail(failure instanceof Error ? failure.name : "unknown");
    }
    // Stop/Pause closes the microphone; the heard words stay available for Done.
    const stopRecording = () => dispose();
    window.addEventListener("sollu:stop", stopRecording);
    return () => {
      window.removeEventListener("sollu:stop", stopRecording);
      dispose();
      if (stopRecognition.current === dispose)
        stopRecognition.current = () => {};
      finishNow.current = () => submitRef.current(heardRef.current);
    };
    // The recorder starts once on entering this screen, never on transcript updates.
  }, [recordingRun]);
  return (
    <>
      <Back />
      <PageTitle
        eyebrow={
          partner
            ? copy(
                settings.lang,
                "A LITTLE CONTEXT HELPS",
                "கொஞ்சம் சூழல் உதவும்",
              )
            : copy(settings.lang, "ONE WORD IS ENOUGH", "ஒரு வார்த்தை போதும்")
        }
        title={
          partner
            ? copy(
                settings.lang,
                "What did they ask?",
                "அவர்கள் என்ன கேட்டார்கள்?",
              )
            : listening
              ? copy(settings.lang, "I’m listening.", "கேட்கிறேன்.")
              : copy(
                  settings.lang,
                  "Let’s hear your words.",
                  "உங்கள் வார்த்தைகளைச் சொல்லுங்கள்.",
                )
        }
        subtitle={
          partner
            ? copy(
                settings.lang,
                "Speak their question. It stays in context for five minutes.",
                "அவர்கள் கேள்வியைச் சொல்லுங்கள். ஐந்து நிமிடம் நினைவில் இருக்கும்.",
              )
            : copy(
                settings.lang,
                "Take your time. A word, a pause, a little of both.",
                "நிதானமாக. ஒரு வார்த்தை போதும்.",
              )
        }
      />
      <div
        className="confirm-context"
        role="group"
        aria-label={copy(settings.lang, "I will speak in", "நான் பேசும் மொழி")}
      >
        <TapButton
          aria-pressed={speechLang === "ta"}
          className={speechLang === "ta" ? "selected" : ""}
          onActivate={() => chooseSpeechLang("ta")}
        >
          🎤 தமிழ்
        </TapButton>
        <TapButton
          aria-pressed={speechLang === "en"}
          className={speechLang === "en" ? "selected" : ""}
          onActivate={() => chooseSpeechLang("en")}
        >
          🎤 English
        </TapButton>
      </div>
      <div className={`listening-panel ${listening ? "is-listening" : ""}`}>
        <p className="notice">
          {recognitionMode === "local"
            ? copy(
                settings.lang,
                "Local recognition only. If unavailable, type or choose a topic.",
                "சாதனத்தில் மட்டும் கேட்கும். முடியாவிட்டால் எழுதுங்கள் அல்லது தலைப்பைத் தேர்ந்தெடுங்கள்.",
              )
            : copy(
                settings.lang,
                "Browser recognition may send audio to its vendor.",
                "உலாவி உங்கள் குரலை அதன் சேவைக்கு அனுப்பலாம்.",
              )}
        </p>
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
            ? copy(
                settings.lang,
                "Listening through your browser",
                "கேட்டுக்கொண்டிருக்கிறது",
              )
            : starting
              ? copy(
                  settings.lang,
                  "Waiting for the browser to start the microphone…",
                  "மைக் தொடங்கக் காத்திருக்கிறது…",
                )
              : copy(
                  settings.lang,
                  "Microphone is not recording",
                  "மைக் பதிவு செய்யவில்லை",
                )}
        </small>
      </div>
      {error && (
        <div className="notice amber" role="status">
          {error}
        </div>
      )}
      {/* When listening is not possible, offer the other ways first. */}
      {unsupported && !partner && (
        <div className="speaking-actions">
          <TapButton className="primary" onActivate={() => navigate("/topics")}>
            <Grid2X2 />
            {uiText(settings.lang, "Topics")}
          </TapButton>
          <TapButton className="primary" onActivate={() => navigate("/type")}>
            <Keyboard />
            {copy(settings.lang, "Type", "எழுது")}
          </TapButton>
        </div>
      )}
      {partner && typingQuestion && (
        <form onSubmit={(event) => event.preventDefault()}>
          <label className="field-label" htmlFor="partner-question">
            {copy(
              settings.lang,
              "Type their question",
              "அவர்கள் கேட்டதை எழுதுங்கள்",
            )}
          </label>
          <textarea
            id="partner-question"
            className="fragment-input"
            rows={2}
            maxLength={300}
            autoFocus
            value={typedQuestion}
            onChange={(event) => setTypedQuestion(event.target.value)}
          />
          <TapButton
            className="primary full"
            disabled={!typedQuestion.trim()}
            onActivate={() => {
              stopRecognition.current();
              setQuestion(typedQuestion.trim());
              navigate("/");
            }}
          >
            <Check />
            {copy(settings.lang, "Keep this question", "இந்தக் கேள்வியை வை")}
          </TapButton>
        </form>
      )}
      <div className="speaking-actions">
        {!noRecognizer && (
          <TapButton onActivate={() => setRecordingRun((v) => v + 1)}>
            {copy(settings.lang, "Keep listening", "தொடர்ந்து கேள்")}
          </TapButton>
        )}
        <TapButton
          className="primary"
          disabled={!heard}
          onActivate={() => {
            finishNow.current();
          }}
        >
          <Check />
          {uiText(settings.lang, "Done")}
        </TapButton>
        <TapButton
          className="secondary"
          onActivate={() => {
            // A partner's question is typed here, never as the person's message.
            if (partner) {
              setTypingQuestion(true);
              return;
            }
            stopRecognition.current();
            navigate("/type");
          }}
        >
          <Keyboard />
          {copy(settings.lang, "Type instead", "எழுதுகிறேன்")}
        </TapButton>
      </div>
      <TapButton
        className="secondary"
        onActivate={() => {
          stopRecognition.current();
          navigate("/settings?tab=privacy");
        }}
      >
        {copy(
          settings.lang,
          "Speech recognition settings",
          "பேச்சு அறிதல் அமைப்புகள்",
        )}
      </TapButton>
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
                stopRecognition.current();
                submitRef.current(text);
              }}
            >
              {text}
              <ArrowRight size={18} />
            </TapButton>
          ))}
        </div>
      )}
    </>
  );
}
