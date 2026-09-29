import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  searchVocabulary,
  vocabularyCatalog,
  type VocabularyCategory,
} from "@sollu/shared";
import { useApp } from "../state";
import { TapButton, PageTitle } from "../ui";
import { usePersonal } from "../features/personal/store";
import type {
  PersonalItem,
  PersonalScene,
  PersonalStory,
  PersonalWord,
} from "../features/personal/model";
import {
  EditAccess,
  ItemActions,
  LocalPhoto,
  PendingCards,
  PersonalEditor,
  ReviewCard,
  SpeakLine,
  ToolShell,
  useText,
} from "../features/personal/components";
export { BackupPanel } from "../features/personal/BackupPanel";

function useToolQuery() {
  const [params, setParams] = useSearchParams();
  return [
    params,
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setParams(next, { replace: true });
    },
  ] as const;
}
const categoryNames: Record<VocabularyCategory, [string, string]> = {
  core: ["அடிப்படைச் சொற்கள்", "Core words"],
  actions: ["செயல்கள்", "Actions"],
  questions: ["கேள்விகள்", "Questions"],
  negation: ["மறுப்பு", "No and not"],
  social: ["உரையாடல்", "Conversation"],
  feelings: ["உணர்வுகள்", "Feelings"],
  daily: ["தினசரி தேவைகள்", "Daily needs"],
  health: ["உடல்நலம்", "Health"],
  identity: ["என்னைப் பற்றி", "About me"],
  repair: ["புரிய வைக்க", "Help me explain"],
};

export function ToolsPage() {
  const navigate = useNavigate(),
    t = useText();
  const links = [
    [
      "/practice",
      "🌱",
      "தொடர்பு பயிற்சி",
      "Communication practice",
      "உங்கள் வேகத்தில் பயிற்சி செய்யுங்கள்",
      "Practise messages, record and review together",
    ],
    [
      "/repair",
      "↩️",
      "நான் சொன்னது வேறு",
      "Help me explain",
      "சரியான அர்த்தத்தை மீண்டும் தேர்ந்தெடு",
      "Correct a word or clarify your meaning",
    ],
    [
      "/comfort",
      "🤲",
      "உடல் மற்றும் ஓய்வு",
      "Body and comfort",
      "உங்களுக்கு என்ன வேண்டும்?",
      "Say how you feel and what you need",
    ],
    [
      "/sentence",
      "🧩",
      "வரியை அமை",
      "Build a message",
      "உங்கள் கருத்தை படிப்படியாகத் தேர்ந்தெடு",
      "Choose what you want to say, step by step",
    ],
    [
      "/words",
      "🔎",
      "சொற்கள்",
      "Find a word",
      "சொல்ல விரும்புவதைத் தேர்ந்தெடு",
      "Choose words you want to say",
    ],
    [
      "/scenes",
      "🖼️",
      "என் படங்கள்",
      "My photos",
      "உங்கள் இடங்கள், உங்கள் சொற்கள்",
      "Your places, your words",
    ],
    [
      "/stories",
      "📖",
      "என் உரையாடல்கள்",
      "My conversations",
      "முன்பே தயார் செய்த வரிகள்",
      "Messages prepared with you",
    ],
    [
      "/passport",
      "👋",
      "என்னைப் பற்றி",
      "About my communication",
      "எப்படி உதவலாம் என்று காட்டுங்கள்",
      "Show how you like to communicate",
    ],
    [
      "/draw",
      "✍️",
      "வரைந்து காட்டு",
      "Draw or write",
      "பேச வேறு ஒரு வழி",
      "Another way to get your message across",
    ],
  ];
  return (
    <section className="personal-tools">
      <TapButton className="back-button" onActivate={() => navigate("/")}>
        ← {t("முகப்பு", "Home")}
      </TapButton>
      <PageTitle
        title={t("உங்களுக்கு உதவும் கருவிகள்", "Your communication tools")}
        subtitle={t(
          "உங்களுக்குப் பொருத்தமான வழியைத் தேர்ந்தெடுங்கள்.",
          "Choose the way that works for you.",
        )}
      />
      <div className="personal-grid">
        {links.map(([path, icon, ta, en, detailTa, detailEn]) => (
          <TapButton key={path} onActivate={() => navigate(path)}>
            <span className="tool-icon" aria-hidden="true">
              {icon}
            </span>
            <strong>{t(ta, en)}</strong>
            <small>{t(detailTa, detailEn)}</small>
          </TapButton>
        ))}
      </div>
      <p>
        {t(
          "படங்களும் தனிப்பட்ட அட்டைகளும் இந்தச் சாதனத்தில் மட்டும் இருக்கும். எந்த வரியும் தானாகப் பேசாது.",
          "Photos and personal cards stay on this device. No message speaks automatically.",
        )}
      </p>
    </section>
  );
}

export function WordsPage() {
  const t = useText(),
    { settings, caregiverUnlocked } = useApp(),
    store = usePersonal();
  const [params, setParams] = useToolQuery();
  const [query, setQuery] = useState("");
  const category = params.get("category") ?? "",
    tab = params.get("tab") === "mine" ? "mine" : "common";
  const [editing, setEditing] = useState<PersonalWord | "new" | null>(null),
    [review, setReview] = useState<PersonalItem | null>(null);
  const entry = vocabularyCatalog.find((v) => v.id === params.get("word"));
  const selected = entry
    ? {
        text: settings.lang === "ta" ? entry.taSentence : entry.enSentence,
        label: settings.lang === "ta" ? entry.ta : entry.en,
      }
    : null;
  const all = store.items.filter(
    (item): item is PersonalWord =>
      item.kind === "word" && item.lang === settings.lang,
  );
  const mine = all
    .filter(
      (item) =>
        item.approvedAt &&
        !item.hidden &&
        `${item.title} ${item.text} ${item.category} ${(item.aliases ?? []).join(" ")} ${item.description ?? ""}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const common = searchVocabulary(query, {
    lang: settings.lang,
    ...(category ? { category: category as VocabularyCategory } : {}),
    limit: vocabularyCatalog.length,
  });
  const pageSize = settings.quietMode ? 4 : 8;
  const wordPage = Math.floor(
    Math.max(
      0,
      Math.min(
        Math.ceil(common.length / pageSize) - 1,
        Number(params.get("page")) || 0,
      ),
    ),
  );
  const shownWords = common.slice(
    wordPage * pageSize,
    (wordPage + 1) * pageSize,
  );
  const categories = [
    ...new Set(vocabularyCatalog.map((entry) => entry.category)),
  ];
  // The chosen word's message sits above the word grid; on a phone that is
  // off-screen, so bring it into view after each new choice.
  const selectedPanel = useRef<HTMLElement>(null);
  const selectedId = entry?.id ?? "";
  useEffect(() => {
    if (!selectedId) return;
    const still =
      settings.reducedMotion ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    selectedPanel.current?.scrollIntoView({
      block: "start",
      behavior: still ? "auto" : "smooth",
    });
    // Only a new choice scrolls; changing motion settings must not jump.
  }, [selectedId]);
  return (
    <ToolShell
      title={t("சொல்ல ஒரு சொல்", "Find a word")}
      subtitle={t(
        "தேர்ந்தெடுத்து முழு வரியைப் பாருங்கள்.",
        "Choose a word, then check the full message.",
      )}
    >
      {editing ? (
        <PersonalEditor
          key={editing === "new" ? "new" : editing.id}
          kind="word"
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : review ? (
        <ReviewCard item={review} onClose={() => setReview(null)} />
      ) : (
        <>
          <div className="personal-actions">
            <TapButton
              aria-pressed={tab === "common"}
              onActivate={() => {
                setParams({ tab: "common", word: "" });
              }}
            >
              {t("பொதுச் சொற்கள்", "Everyday words")}
            </TapButton>
            <TapButton
              aria-pressed={tab === "mine"}
              onActivate={() => {
                setParams({ tab: "mine", word: "" });
              }}
            >
              {t("என் சொற்கள்", "My words")}
            </TapButton>
          </div>
          <label>
            {t("தேடு", "Search")}
            <input
              className="personal-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setParams({ word: "", page: "" });
              }}
              placeholder={t(
                "சொல் அல்லது முதல் எழுத்து",
                "A word or its first letters",
              )}
              maxLength={120}
            />
          </label>
          {tab === "common" && (
            <div
              className="personal-actions personal-categories"
              role="group"
              aria-label={t("வகை", "Category")}
            >
              {["", ...categories].map((c) => (
                <TapButton
                  key={c || "all"}
                  aria-pressed={category === c}
                  onActivate={() => {
                    setParams({ category: c, word: "", page: "" });
                  }}
                >
                  {c
                    ? t(...categoryNames[c as VocabularyCategory])
                    : t("அனைத்தும்", "All")}
                </TapButton>
              ))}
            </div>
          )}
          {selected && (
            <section
              ref={selectedPanel}
              className="personal-panel personal-selected-word"
              aria-live="polite"
            >
              <h2>{selected.label}</h2>
              <SpeakLine
                key={selected.text}
                text={selected.text}
                lang={settings.lang}
              />
              <TapButton onActivate={() => setParams({ word: "" })}>
                {t("வேறு சொல்", "Another word")}
              </TapButton>
            </section>
          )}
          {tab === "common" ? (
            <>
              <div className="personal-grid">
                {shownWords.map((entry) => (
                  <TapButton
                    key={entry.id}
                    onActivate={() => setParams({ word: entry.id })}
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    <strong>
                      {settings.lang === "ta" ? entry.ta : entry.en}
                    </strong>
                    {settings.showGloss && settings.lang === "ta" && (
                      <small>{entry.en}</small>
                    )}
                  </TapButton>
                ))}
              </div>
              {common.length > pageSize && (
                <div className="personal-actions">
                  <TapButton
                    disabled={wordPage === 0}
                    onActivate={() =>
                      setParams({ page: String(wordPage - 1), word: "" })
                    }
                  >
                    ← {t("முந்தைய சொற்கள்", "Previous words")}
                  </TapButton>
                  <span className="personal-badge">
                    {wordPage * pageSize + 1}–
                    {Math.min((wordPage + 1) * pageSize, common.length)} /{" "}
                    {common.length}
                  </span>
                  <TapButton
                    disabled={(wordPage + 1) * pageSize >= common.length}
                    onActivate={() =>
                      setParams({ page: String(wordPage + 1), word: "" })
                    }
                  >
                    {t("மேலும் சொற்கள்", "More words")} →
                  </TapButton>
                </div>
              )}
              {!common.length && (
                <p role="status">
                  {t(
                    "இந்தச் சொல் இல்லை. உங்கள் சொற்களில் சேர்க்கலாம்.",
                    "No matching word. You can add it to My words.",
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              {mine.map((item) => (
                <section className="personal-panel" key={item.id}>
                  <h2>
                    {item.pinned && "★ "}
                    {item.title}
                  </h2>
                  {item.description && <p>{item.description}</p>}
                  <SpeakLine text={item.text} lang={item.lang} />
                  <ItemActions item={item} onEdit={() => setEditing(item)} />
                </section>
              ))}
              {!mine.length && (
                <p>
                  {t(
                    "இன்னும் சொற்கள் இல்லை. சேர்த்த பின் நீங்கள் ஒப்புக்கொள்ளலாம்.",
                    "No personal words yet. New words appear after you approve them.",
                  )}
                </p>
              )}
              <PendingCards items={all} onReview={setReview} />
              {caregiverUnlocked && all.some((item) => item.hidden) && (
                <section className="personal-panel">
                  <h2>{t("மறைத்த சொற்கள்", "Hidden words")}</h2>
                  <p>
                    {t(
                      "இந்தச் சாதனத்தில் உள்ளன; பேசத் தேர்ந்தெடுக்கும் பட்டியலில் இல்லை.",
                      "Kept on this device, but hidden from the patient word picker.",
                    )}
                  </p>
                  {all
                    .filter((item) => item.hidden)
                    .map((item) => (
                      <div key={item.id}>
                        <h3>{item.title}</h3>
                        <ItemActions
                          item={item}
                          onEdit={() => setEditing(item)}
                        />
                      </div>
                    ))}
                </section>
              )}
              <EditAccess
                label={t("என் சொல் சேர்", "Add my word")}
                onCreate={() => setEditing("new")}
              />
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}

export function ScenesPage() {
  const t = useText(),
    { settings } = useApp(),
    store = usePersonal();
  const [editing, setEditing] = useState<PersonalScene | "new" | null>(null),
    [review, setReview] = useState<PersonalItem | null>(null);
  const [params, setParams] = useToolQuery();
  const chosenId = params.get("card") ?? "",
    choiceId = params.get("choice") ?? "";
  const all = store.items.filter(
    (item): item is PersonalScene =>
      item.kind === "scene" && item.lang === settings.lang,
  );
  const chosen = all.find((item) => item.id === chosenId && item.approvedAt),
    choice = chosen?.choices.find((item) => item.id === choiceId);
  return (
    <ToolShell
      title={t("என் படங்கள்", "My photos")}
      subtitle={t(
        "ஒரு படத்திலிருந்து உங்கள் சொற்களைத் தேர்ந்தெடுங்கள்.",
        "Choose your words from a familiar photo.",
      )}
    >
      {editing ? (
        <PersonalEditor
          key={editing === "new" ? "new" : editing.id}
          kind="scene"
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : review ? (
        <ReviewCard item={review} onClose={() => setReview(null)} />
      ) : chosen ? (
        <>
          <TapButton
            onActivate={() => {
              setParams({ card: "", choice: "" });
            }}
          >
            {t("எல்லாப் படங்களும்", "All photos")}
          </TapButton>
          <h2>{chosen.title}</h2>
          <div className="personal-scene">
            <LocalPhoto blob={chosen.image} alt={chosen.title} />
            {chosen.choices.map((c, i) => (
              <TapButton
                key={c.id}
                className="personal-hotspot"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                aria-label={`${i + 1}. ${c.label}`}
                onActivate={() => setParams({ choice: c.id })}
              >
                {i + 1}
              </TapButton>
            ))}
          </div>
          <p>
            {t(
              "படத்தில் உள்ள எண்ணை அல்லது கீழே உள்ள சொல்லைத் தொடுங்கள்.",
              "Choose a number on the photo or a word below.",
            )}
          </p>
          <div className="personal-grid">
            {chosen.choices.map((c, i) => (
              <TapButton
                key={c.id}
                aria-pressed={choiceId === c.id}
                onActivate={() => setParams({ choice: c.id })}
              >
                {i + 1}. {c.label}
              </TapButton>
            ))}
          </div>
          {choice && (
            <SpeakLine key={choice.id} text={choice.text} lang={chosen.lang} />
          )}
          <ItemActions item={chosen} onEdit={() => setEditing(chosen)} />
        </>
      ) : (
        <>
          <div className="personal-grid">
            {all
              .filter((v) => v.approvedAt)
              .sort((a, b) => Number(b.pinned) - Number(a.pinned))
              .map((item) => (
                <TapButton
                  key={item.id}
                  onActivate={() => {
                    setParams({ card: item.id, choice: "" });
                  }}
                >
                  <LocalPhoto blob={item.image} alt="" />
                  <strong>
                    {item.pinned && "★ "}
                    {item.title}
                  </strong>
                </TapButton>
              ))}
          </div>
          {!all.some((v) => v.approvedAt) && (
            <p>
              {t(
                "உங்களுக்கு நன்கு தெரிந்த இடம் அல்லது பொருளின் படத்தைச் சேர்க்கலாம்.",
                "Add a familiar place or object with words you choose.",
              )}
            </p>
          )}
          <PendingCards items={all} onReview={setReview} />
          <EditAccess
            label={t("படம் சேர்", "Add a photo")}
            onCreate={() => setEditing("new")}
          />
        </>
      )}
    </ToolShell>
  );
}

function TextCardsPage({ kind }: { kind: "story" | "passport" }) {
  const t = useText(),
    { settings } = useApp(),
    store = usePersonal();
  const [editing, setEditing] = useState<PersonalStory | "new" | null>(null),
    [review, setReview] = useState<PersonalItem | null>(null);
  const [params, setParams] = useToolQuery();
  const chosenId = params.get("card") ?? "",
    line = Math.floor(
      Math.max(0, Math.min(11, Number(params.get("line")) || 0)),
    );
  const showAll =
    params.get("view") === "all" ||
    (!params.has("view") && kind === "passport");
  const all = store.items.filter(
    (item): item is PersonalStory =>
      item.kind === kind && item.lang === settings.lang,
  );
  const chosen = all.find((item) => item.id === chosenId && item.approvedAt);
  const isPassport = kind === "passport";
  return (
    <ToolShell
      title={
        isPassport
          ? t("என் தொடர்பு அட்டை", "My communication card")
          : t("என் உரையாடல்கள்", "My conversations")
      }
      subtitle={
        isPassport
          ? t(
              "எப்படி உதவலாம் என்று மற்றவர்களுக்குக் காட்டுங்கள்.",
              "Show others how you like to communicate.",
            )
          : t(
              "உங்கள் சொற்கள். ஒவ்வொரு வரியாக, உங்கள் நேரத்தில்.",
              "Your words, one message at a time.",
            )
      }
    >
      {editing ? (
        <PersonalEditor
          key={editing === "new" ? "new" : editing.id}
          kind={kind}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : review ? (
        <ReviewCard item={review} onClose={() => setReview(null)} />
      ) : chosen ? (
        <>
          <TapButton
            onActivate={() => setParams({ card: "", line: "", view: "" })}
          >
            {t("எல்லா அட்டைகளும்", "All cards")}
          </TapButton>
          <article
            className={`personal-panel personal-print ${isPassport ? "personal-passport" : "personal-story"}`}
          >
            <h2 lang={chosen.lang}>{chosen.title}</h2>
            {showAll ? (
              <ol>
                {chosen.lines.map((text, i) => (
                  <li key={i} lang={chosen.lang}>
                    {text}
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <span className="personal-badge">
                  {Math.min(line + 1, chosen.lines.length)} /{" "}
                  {chosen.lines.length}
                </span>
                <SpeakLine
                  key={`${chosen.id}-${line}`}
                  text={chosen.lines[Math.min(line, chosen.lines.length - 1)]}
                  lang={chosen.lang}
                />
                <div className="personal-actions">
                  <TapButton
                    disabled={line === 0}
                    onActivate={() =>
                      setParams({ line: String(Math.max(0, line - 1)) })
                    }
                  >
                    ← {t("முந்தைய வரி", "Previous")}
                  </TapButton>
                  <TapButton
                    disabled={line >= chosen.lines.length - 1}
                    onActivate={() =>
                      setParams({
                        line: String(
                          Math.min(chosen.lines.length - 1, line + 1),
                        ),
                      })
                    }
                  >
                    {t("அடுத்த வரி", "Next")} →
                  </TapButton>
                </div>
              </>
            )}
          </article>
          <div className="personal-actions">
            <TapButton
              onActivate={() => setParams({ view: showAll ? "one" : "all" })}
            >
              {showAll
                ? t("ஒரு வரியாகப் பேசு", "One message at a time")
                : t("எல்லா வரிகளையும் காட்டு", "Show every line")}
            </TapButton>
            <TapButton
              onActivate={() => {
                setParams({ view: "all" });
                requestAnimationFrame(() => window.print());
              }}
            >
              {t("அச்சிடு / PDF", "Print / save PDF")}
            </TapButton>
          </div>
          <ItemActions item={chosen} onEdit={() => setEditing(chosen)} />
        </>
      ) : (
        <>
          <div className="personal-grid">
            {all
              .filter((v) => v.approvedAt)
              .sort((a, b) => Number(b.pinned) - Number(a.pinned))
              .map((item) => (
                <TapButton
                  key={item.id}
                  onActivate={() => {
                    setParams({
                      card: item.id,
                      line: "0",
                      view: isPassport ? "all" : "one",
                    });
                  }}
                >
                  <span className="tool-icon" aria-hidden="true">
                    {isPassport ? "👋" : "📖"}
                  </span>
                  <strong>
                    {item.pinned && "★ "}
                    {item.title}
                  </strong>
                </TapButton>
              ))}
          </div>
          {!all.some((v) => v.approvedAt) && (
            <div className="personal-panel">
              <h2>
                {t(
                  "உங்களுடன் சேர்ந்து தயார் செய்யலாம்",
                  "Prepare this together",
                )}
              </h2>
              <p>
                {isPassport
                  ? t(
                      "நீங்கள் விரும்பும் மொழி, பதில் சொல்ல வேண்டிய நேரம், உதவியாக இருக்கும் முறைகள் ஆகியவற்றை உங்கள் ஒப்புதலுடன் சேர்க்கலாம்.",
                      "Add your preferred language, time to respond, and ways people can help—with your approval.",
                    )
                  : t(
                      "கடை, குடும்பச் சந்திப்பு, அல்லது ஒரு நினைவு பற்றி நீங்கள் சொல்ல விரும்பும் வரிகளைச் சேர்க்கலாம்.",
                      "Prepare messages for a shop, a family visit, or a story you want to share.",
                    )}
              </p>
            </div>
          )}
          <PendingCards items={all} onReview={setReview} />
          <EditAccess
            label={t("அட்டை சேர்", "Add a card")}
            onCreate={() => setEditing("new")}
          />
        </>
      )}
    </ToolShell>
  );
}
export function StoriesPage() {
  return <TextCardsPage kind="story" />;
}
export function PassportPage() {
  return <TextCardsPage kind="passport" />;
}

let drawingDraft: { image: ImageData; label: string } | undefined;
export function DrawPage() {
  const t = useText(),
    { settings } = useApp(),
    navigate = useNavigate();
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    previous = useRef<{ x: number; y: number } | null>(null),
    history = useRef<ImageData[]>([]);
  const [ink, setInk] = useState("#25202d"),
    [large, setLarge] = useState(false),
    [show, setShow] = useState(false),
    [clear, setClear] = useState(false),
    [label, setLabel] = useState(drawingDraft?.label ?? "");
  const labelRef = useRef(label);
  labelRef.current = label;
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (drawingDraft) context?.putImageData(drawingDraft.image, 0, 0);
    return () => {
      drawing.current = false;
      if (context)
        drawingDraft = {
          image: context.getImageData(0, 0, 900, 420),
          label: labelRef.current,
        };
    };
  }, []);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) * 900) / box.width,
      y: ((event.clientY - box.top) * 420) / box.height,
    };
  };
  return (
    <ToolShell
      title={t("வரைந்து அல்லது எழுதிக் காட்டு", "Draw or write")}
      subtitle={t(
        "இது நீங்கள் காட்டுவதற்கான இடம். படம் படிக்கப்படாது, அனுப்பப்படாது.",
        "Show your meaning. The drawing is not interpreted or uploaded.",
      )}
    >
      {!show && (
        <div className="personal-actions">
          <TapButton aria-pressed={!large} onActivate={() => setLarge(false)}>
            {t("மெல்லிய கோடு", "Thin line")}
          </TapButton>
          <TapButton aria-pressed={large} onActivate={() => setLarge(true)}>
            {t("தடிமனான கோடு", "Thick line")}
          </TapButton>
          <TapButton
            aria-pressed={ink === "#25202d"}
            onActivate={() => setInk("#25202d")}
          >
            {t("கருப்பு", "Black")}
          </TapButton>
          <TapButton
            aria-pressed={ink === "#a72d20"}
            onActivate={() => setInk("#a72d20")}
          >
            {t("சிவப்பு", "Red")}
          </TapButton>
        </div>
      )}
      <canvas
        ref={canvas}
        width={900}
        height={420}
        className="personal-draw"
        aria-label={t(
          "வரைவதற்கான இடம். கீழே எழுதியும் காட்டலாம்.",
          "Drawing area. A typing alternative is below.",
        )}
        onPointerDown={(event) => {
          if (show || !event.isPrimary || event.button !== 0) return;
          const ctx = canvas.current?.getContext("2d");
          if (!ctx) return;
          history.current = [
            ...history.current.slice(-9),
            ctx.getImageData(0, 0, 900, 420),
          ];
          drawing.current = true;
          previous.current = point(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(
            previous.current.x,
            previous.current.y,
            large ? 8 : 3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }}
        onPointerMove={(event) => {
          if (!drawing.current || !previous.current || show) return;
          const ctx = canvas.current?.getContext("2d"),
            next = point(event);
          if (!ctx) return;
          ctx.strokeStyle = ink;
          ctx.lineWidth = large ? 16 : 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(previous.current.x, previous.current.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          previous.current = next;
        }}
        onPointerUp={() => {
          drawing.current = false;
          previous.current = null;
        }}
        onPointerCancel={() => {
          drawing.current = false;
          previous.current = null;
        }}
      />
      <div className="personal-actions">
        <TapButton
          onActivate={() => {
            drawing.current = false;
            setShow(!show);
          }}
        >
          {show
            ? t("தொடர்ந்து வரை", "Keep drawing")
            : t("இதை மற்றவருக்குக் காட்டு", "Show this to someone")}
        </TapButton>
        {!show && (
          <>
            <TapButton
              onActivate={() => {
                const old = history.current.pop();
                if (old)
                  canvas.current?.getContext("2d")?.putImageData(old, 0, 0);
              }}
            >
              {t("கடைசிக் கோட்டை நீக்கு", "Undo last stroke")}
            </TapButton>
            <TapButton onActivate={() => setClear(true)}>
              {t("அழி", "Clear")}
            </TapButton>
          </>
        )}
      </div>
      {clear && (
        <div className="personal-panel">
          <p>{t("இந்தப் படத்தை அழிக்கவா?", "Clear this drawing?")}</p>
          <div className="personal-actions">
            <TapButton
              onActivate={() => {
                canvas.current?.getContext("2d")?.clearRect(0, 0, 900, 420);
                history.current = [];
                setClear(false);
              }}
            >
              {t("ஆம், அழி", "Yes, clear")}
            </TapButton>
            <TapButton onActivate={() => setClear(false)}>
              {t("வேண்டாம்", "Keep it")}
            </TapButton>
          </div>
        </div>
      )}
      <label>
        {t("அல்லது ஒரு சொல்லை எழுது", "Or type a word")}
        <textarea
          value={label}
          maxLength={500}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      {label.trim() && (
        <SpeakLine
          key={label.trim()}
          text={label.trim()}
          lang={settings.lang}
        />
      )}
      <TapButton onActivate={() => navigate("/words")}>
        {t("சொற்களில் தேர்ந்தெடு", "Choose from words")}
      </TapButton>
      <p>
        {t(
          "இடைவேளைக்குப் பிறகும் வரைந்தது இருக்கும். பக்கத்தை மீண்டும் ஏற்றினால் அழியும்; சாதனத்தில் கோப்பாகச் சேமிக்கப்படாது.",
          "Your drawing stays during this visit, including a pause. Reloading clears it; it is not saved as a file.",
        )}
      </p>
    </ToolShell>
  );
}
