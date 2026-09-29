import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { quickPhrases, type WordSubstitution } from "@sollu/shared";
import { useApp } from "../state";
import { db, recordingId } from "../db";
import { audio } from "../features/audio";
import { copy } from "../lib/copy";
import { sentenceLanguage } from "../lib/context";
import { TapButton } from "../ui";

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
            lang: sentenceLanguage(settings),
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
