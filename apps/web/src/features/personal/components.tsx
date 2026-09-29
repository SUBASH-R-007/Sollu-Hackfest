import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { candidate, type Lang } from "@sollu/shared";
import { useApp } from "../../state";
import { TapButton, PageTitle } from "../../ui";
import { audio } from "../audio";
import {
  approvePersonal,
  deletePersonal,
  pinPersonal,
  preparePhoto,
  savePersonal,
  setPersonalHidden,
} from "./store";
import type { PersonalItem, PersonalKind, SceneChoice } from "./model";
import "./personal.css";

export function useText() {
  const { settings } = useApp();
  return (ta: string, en: string) => (settings.lang === "ta" ? ta : en);
}
export function LocalPhoto({
  blob,
  alt,
  className,
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url ? (
    <img className={className ?? "personal-photo"} src={url} alt={alt} />
  ) : null;
}
export function ToolShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = useText(),
    navigate = useNavigate();
  return (
    <section className="personal-tools">
      <TapButton className="back-button" onActivate={() => navigate("/tools")}>
        ← {t("கருவிகள்", "Tools")}
      </TapButton>
      <PageTitle title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}
export function SpeakLine({
  text,
  lang,
  label,
}: {
  text: string;
  lang: Lang;
  label?: string;
}) {
  const { begin, speak, settings } = useApp();
  const [armed, setArmed] = useState(false),
    t = useText();
  return (
    <TapButton
      className={`personal-sentence ${armed ? "selected" : ""}`}
      aria-label={`${label ?? t("சொல்லு", "Say")}: ${text}`}
      onActivate={(event) => {
        if (settings.twoStep && !armed) {
          setArmed(true);
          return;
        }
        // Each spoken line needs its own two-step confirmation.
        setArmed(false);
        begin({ modality: "text", raw: text });
        const ticket = audio.createTap(event, text, {
          role: "patient",
          surface: "patient",
        });
        speak(
          candidate(text, text, "personal phrase", "💬"),
          ticket,
          false,
          lang,
        );
      }}
    >
      <span aria-hidden="true">💬</span>
      <span lang={lang}>{text}</span>
      <small>
        {armed
          ? t("மீண்டும் தொட்டால் சொல்லும்", "Tap again to say")
          : (label ?? t("தொட்டால் சொல்லும்", "Tap to say"))}
      </small>
    </TapButton>
  );
}
export function PreviewLine({ text, lang }: { text: string; lang: Lang }) {
  const t = useText();
  const [status, setStatus] = useState("");
  return (
    <div className="personal-preview-line">
      <TapButton
        onActivate={(event) => {
          const ticket = audio.createTap(event, text, {
            role: "patient",
            surface: "patient",
          });
          void audio
            .speak({ text, lang, ticket, channel: "preview" })
            .then((result) => {
              setStatus(
                result.status === "completed"
                  ? t("சாதனக் குரலில் கேட்டது", "Device voice preview finished")
                  : t(
                      "குரல் கிடைக்கவில்லை. இந்த வரியைப் படியுங்கள்.",
                      "Voice unavailable. Read this line.",
                    ),
              );
            });
        }}
      >
        <span lang={lang}>{text}</span>
        <small>▷ {t("கேள் · சாதனக் குரல்", "Listen · device voice")}</small>
      </TapButton>
      <span role="status">{status}</span>
    </div>
  );
}
export function EditAccess({
  onCreate,
  label,
}: {
  onCreate: () => void;
  label: string;
}) {
  const { caregiverUnlocked } = useApp(),
    navigate = useNavigate(),
    t = useText();
  return (
    <div className="personal-edit-access">
      {caregiverUnlocked ? (
        <TapButton className="secondary-button" onActivate={onCreate}>
          ＋ {label}
        </TapButton>
      ) : (
        <TapButton onActivate={() => navigate("/settings")}>
          🔒{" "}
          {t(
            "சேர்க்க அமைப்புகளைத் திறக்கவும்",
            "Unlock settings to add or edit",
          )}
        </TapButton>
      )}
      <p>
        {t(
          "சேர்த்த பிறகு, பேசுபவர் பார்த்து ஒப்புக்கொள்ள வேண்டும்.",
          "After editing, the person who uses Sollu reviews and approves the card.",
        )}
      </p>
    </div>
  );
}
export function ItemActions({
  item,
  onEdit,
}: {
  item: PersonalItem;
  onEdit: () => void;
}) {
  const { caregiverUnlocked } = useApp(),
    t = useText();
  const [deleting, setDeleting] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="personal-actions">
      <TapButton
        aria-pressed={item.pinned}
        onActivate={() =>
          void pinPersonal(item.id).catch(() =>
            setError(t("சேமிக்க முடியவில்லை", "Could not save")),
          )
        }
      >
        {item.pinned ? "★" : "☆"} {t("முதலில் வை", "Pin first")}
      </TapButton>
      {caregiverUnlocked && (
        <>
          {item.kind === "word" && (
            <TapButton
              onActivate={() =>
                void setPersonalHidden(
                  item.id,
                  !item.hidden,
                  caregiverUnlocked,
                ).catch(() =>
                  setError(t("சேமிக்க முடியவில்லை", "Could not save")),
                )
              }
            >
              {item.hidden
                ? t("சொற்களில் காட்டு", "Show in My words")
                : t("சொற்களில் மறை", "Hide from My words")}
            </TapButton>
          )}
          <TapButton onActivate={onEdit}>{t("திருத்து", "Edit")}</TapButton>
          <TapButton onActivate={() => setDeleting(!deleting)}>
            {t("நீக்கு", "Delete")}
          </TapButton>
        </>
      )}
      {deleting && (
        <div className="personal-delete">
          <p>
            {t("இந்த அட்டையை நீக்கவா?", "Delete this card from this device?")}
          </p>
          <TapButton
            onActivate={() =>
              void deletePersonal(item.id, caregiverUnlocked).catch(() =>
                setError(t("நீக்க முடியவில்லை", "Could not delete")),
              )
            }
          >
            {t("ஆம், நீக்கு", "Yes, delete")}
          </TapButton>
          <TapButton onActivate={() => setDeleting(false)}>
            {t("வேண்டாம்", "Keep it")}
          </TapButton>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function ReviewCard({
  item,
  onClose,
}: {
  item: PersonalItem;
  onClose: () => void;
}) {
  const t = useText(),
    [status, setStatus] = useState("");
  const lines =
    item.kind === "word"
      ? [item.text]
      : item.kind === "scene"
        ? item.choices.map((v) => `${v.label}: ${v.text}`)
        : item.lines;
  return (
    <section
      className="personal-panel personal-review"
      aria-label={t("உங்கள் ஒப்புதல்", "Your approval")}
    >
      <h2>
        {t("இது நீங்கள் சொல்ல விரும்புவதா?", "Is this what you want to say?")}
      </h2>
      <h3 lang={item.lang}>{item.title}</h3>
      {item.kind === "word" && (
        <>
          {item.description && <p>{item.description}</p>}
          {!!item.aliases?.length && (
            <p>
              {t("தேட உதவும் பெயர்கள்", "Names that help you find this word")}:{" "}
              {item.aliases.join(", ")}
            </p>
          )}
        </>
      )}
      {item.kind === "scene" && (
        <LocalPhoto blob={item.image} alt={item.title} />
      )}
      <p>
        {t(
          "ஒவ்வொரு வரியையும் பாருங்கள். சரி என்றால் மட்டும் சேர்க்கவும்.",
          "Review every line. Add this card only if the words are right for you.",
        )}
      </p>
      {lines.map((line, i) => (
        <PreviewLine
          key={`${item.id}-${item.revision}-${i}`}
          text={line}
          lang={item.lang}
        />
      ))}
      <div className="personal-actions">
        <TapButton
          className="primary-button"
          onActivate={() => {
            void approvePersonal(item.id, item.revision)
              .then(onClose)
              .catch((error: unknown) =>
                setStatus(
                  error instanceof Error
                    ? error.message
                    : t("மீண்டும் முயற்சி செய்யவும்", "Please try again"),
                ),
              );
          }}
        >
          ✓ {t("சரி, என் அட்டைகளில் சேர்", "Yes, add to my cards")}
        </TapButton>
        <TapButton onActivate={onClose}>
          {t("இப்போது வேண்டாம்", "Not now")}
        </TapButton>
        <TapButton onActivate={() => audio.stop()}>
          ■ {t("நிறுத்து", "Stop")}
        </TapButton>
      </div>
      <p role="alert">{status}</p>
    </section>
  );
}

export function PersonalEditor({
  kind,
  initial,
  onClose,
}: {
  kind: PersonalKind;
  initial?: PersonalItem;
  onClose: () => void;
}) {
  const { settings, caregiverUnlocked } = useApp(),
    t = useText();
  const [title, setTitle] = useState(initial?.title ?? ""),
    [lang, setLang] = useState<Lang>(initial?.lang ?? settings.lang);
  const [text, setText] = useState(
    initial?.kind === "word" ? initial.text : "",
  );
  const [category, setCategory] = useState(
    initial?.kind === "word" ? initial.category : "My words",
  );
  const [aliases, setAliases] = useState(
    initial?.kind === "word" ? (initial.aliases ?? []).join(", ") : "",
  );
  const [description, setDescription] = useState(
    initial?.kind === "word" ? (initial.description ?? "") : "",
  );
  const [lines, setLines] = useState(
    initial && (initial.kind === "story" || initial.kind === "passport")
      ? initial.lines.join("\n")
      : "",
  );
  const [photo, setPhoto] = useState<Blob | undefined>(
    initial?.kind === "scene" ? initial.image : undefined,
  );
  const [choices, setChoices] = useState<SceneChoice[]>(
    initial?.kind === "scene"
      ? initial.choices
      : [{ id: crypto.randomUUID(), label: "", text: "", x: 50, y: 50 }],
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!caregiverUnlocked)
    return (
      <div className="personal-panel">
        <p>{t("திருத்த அமைப்புகளைத் திறக்கவும்", "Unlock settings to edit")}</p>
        <TapButton onActivate={onClose}>{t("திரும்பு", "Back")}</TapButton>
      </div>
    );
  const updateChoice = (id: string, patch: Partial<SceneChoice>) =>
    setChoices((all) => all.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  return (
    <section className="personal-panel personal-editor">
      <h2>{t("அட்டையைத் தயார் செய்", "Prepare a card")}</h2>
      <p>
        {t(
          "இது இன்னும் பேசுபவரால் ஒப்புக்கொள்ளப்படவில்லை. படங்களும் சொற்களும் இந்தச் சாதனத்தில் மட்டும் இருக்கும்.",
          "This will be a draft for patient approval. Photos and words stay on this device.",
        )}
      </p>
      <label>
        {t("தலைப்பு", "Title")}
        <input
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label>
        {t("இந்த அட்டையின் மொழி", "Language of this card")}
        <select
          value={lang}
          onChange={(event) => setLang(event.target.value as Lang)}
        >
          <option value="ta">தமிழ்</option>
          <option value="en">English</option>
        </select>
      </label>
      {kind === "word" && (
        <>
          <label>
            {t("பேச வேண்டிய முழு வரி", "Exact words to say")}
            <textarea
              lang={lang}
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <label>
            {t("வகை", "Category")}
            <input
              value={category}
              maxLength={60}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label>
            {t("வேறு பெயர்கள் (விருப்பம்)", "Alternative names (optional)")}
            <input
              value={aliases}
              maxLength={1000}
              onChange={(event) => setAliases(event.target.value)}
            />
            <small>
              {t(
                "காற்புள்ளியால் பிரிக்கவும். தேட உதவும்; பேசும் வரி மாறாது.",
                "Separate with commas. These help you find the word; they do not change its spoken sentence.",
              )}
            </small>
          </label>
          <label>
            {t("நினைவுக் குறிப்பு (விருப்பம்)", "Description hint (optional)")}
            <textarea
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </>
      )}
      {(kind === "story" || kind === "passport") && (
        <label>
          {t("ஒவ்வொரு வரியிலும் ஒரு கருத்து", "One short message per line")}
          <textarea
            rows={7}
            lang={lang}
            value={lines}
            maxLength={6000}
            onChange={(event) => setLines(event.target.value)}
          />
          <small>
            {t(
              "அதிகபட்சம் 12 வரிகள். மருந்து அல்லது நோய் பற்றிய தகவலை ஊகிக்க வேண்டாம்.",
              "Up to 12 lines. Use only facts the person has approved; do not infer diagnoses or medication details.",
            )}
          </small>
        </label>
      )}
      {kind === "scene" && (
        <>
          <label className="personal-file">
            📷 {t("படத்தைத் தேர்ந்தெடு", "Choose a photo")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setBusy(true);
                  void preparePhoto(file)
                    .then(setPhoto)
                    .catch((e: unknown) =>
                      setError(
                        e instanceof Error ? e.message : "Photo unavailable",
                      ),
                    )
                    .finally(() => setBusy(false));
                }
                event.target.value = "";
              }}
            />
          </label>
          {photo && (
            <LocalPhoto
              blob={photo}
              alt={title || t("தேர்ந்தெடுத்த படம்", "Selected photo")}
            />
          )}
          <p>
            {t(
              "படத்தில் உள்ளவற்றை நீங்களே பெயரிடுங்கள். தானாக அடையாளம் காணாது.",
              "Label the photo yourself. There is no automatic recognition.",
            )}
          </p>
          {choices.map((choice, i) => (
            <fieldset key={choice.id}>
              <legend>
                {t("தேர்வு", "Choice")} {i + 1}
              </legend>
              <label>
                {t("குறுகிய பெயர்", "Short label")}
                <input
                  value={choice.label}
                  maxLength={80}
                  onChange={(e) =>
                    updateChoice(choice.id, { label: e.target.value })
                  }
                />
              </label>
              <label>
                {t("பேச வேண்டிய முழு வரி", "Exact words to say")}
                <textarea
                  value={choice.text}
                  maxLength={500}
                  onChange={(e) =>
                    updateChoice(choice.id, { text: e.target.value })
                  }
                />
              </label>
              <div className="personal-grid">
                <label>
                  {t("இடம்: இடது → வலது", "Position: left → right")}
                  <input
                    type="range"
                    min="15"
                    max="85"
                    value={choice.x}
                    onChange={(e) =>
                      updateChoice(choice.id, { x: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  {t("இடம்: மேல் → கீழ்", "Position: top → bottom")}
                  <input
                    type="range"
                    min="15"
                    max="85"
                    value={choice.y}
                    onChange={(e) =>
                      updateChoice(choice.id, { y: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              {choices.length > 1 && (
                <TapButton
                  onActivate={() =>
                    setChoices((v) => v.filter((c) => c.id !== choice.id))
                  }
                >
                  {t("இந்தத் தேர்வை நீக்கு", "Remove choice")}
                </TapButton>
              )}
            </fieldset>
          ))}
          {choices.length < 8 && (
            <TapButton
              onActivate={() =>
                setChoices((v) => [
                  ...v,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    text: "",
                    x: 50,
                    y: 50,
                  },
                ])
              }
            >
              ＋ {t("தேர்வு சேர்", "Add a choice")}
            </TapButton>
          )}
        </>
      )}
      <p role="alert">{error}</p>
      <div className="personal-actions">
        <TapButton
          className="primary-button"
          disabled={busy}
          onActivate={() => {
            setBusy(true);
            setError("");
            const base = {
              id: initial?.id ?? crypto.randomUUID(),
              kind,
              title: title.trim(),
              lang,
              pinned: initial?.pinned ?? false,
              revision: initial?.revision ?? 1,
              updatedAt: Date.now(),
            };
            const item =
              kind === "word"
                ? {
                    ...base,
                    kind,
                    text: text.trim(),
                    category: category.trim(),
                    aliases: [
                      ...new Set(
                        aliases
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      ),
                    ],
                    description: description.trim(),
                    hidden:
                      initial?.kind === "word"
                        ? (initial.hidden ?? false)
                        : false,
                  }
                : kind === "scene"
                  ? {
                      ...base,
                      kind,
                      image: photo,
                      choices: choices.map((v) => ({
                        ...v,
                        label: v.label.trim(),
                        text: v.text.trim(),
                      })),
                    }
                  : {
                      ...base,
                      kind,
                      lines: lines
                        .split("\n")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    };
            void savePersonal(item as PersonalItem, caregiverUnlocked)
              .then(onClose)
              .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Could not save"),
              )
              .finally(() => setBusy(false));
          }}
        >
          {busy
            ? t("சேமிக்கிறது…", "Saving…")
            : t("பார்த்து ஒப்புக்கொள்ள சேமி", "Save for patient review")}
        </TapButton>
        <TapButton disabled={busy} onActivate={onClose}>
          {t("ரத்து செய்", "Cancel")}
        </TapButton>
      </div>
    </section>
  );
}

export function PendingCards({
  items,
  onReview,
}: {
  items: PersonalItem[];
  onReview: (item: PersonalItem) => void;
}) {
  const t = useText(),
    pending = items.filter((item) => !item.approvedAt);
  return pending.length ? (
    <section className="personal-panel">
      <h2>{t("நீங்கள் பார்த்து ஒப்புக்கொள்ள", "Ready for your review")}</h2>
      <div className="personal-grid">
        {pending.map((item) => (
          <TapButton key={item.id} onActivate={() => onReview(item)}>
            {item.title}
            <small>
              {t("பார் · இன்னும் சேர்க்கப்படவில்லை", "Review · not added yet")}
            </small>
          </TapButton>
        ))}
      </div>
    </section>
  ) : null;
}
