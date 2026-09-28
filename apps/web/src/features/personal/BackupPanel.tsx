import { useState } from "react";
import { useApp } from "../../state";
import { TapButton } from "../../ui";
import { audio } from "../audio";
import {
  exportEncryptedBackup,
  inspectEncryptedBackup,
  mergeEncryptedBackup,
  type BackupPreview,
} from "./backup";
import { useText } from "./components";

export function BackupPanel() {
  const { caregiverUnlocked } = useApp(),
    t = useText();
  const [passphrase, setPassphrase] = useState(""),
    [repeat, setRepeat] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<BackupPreview | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const run = async (work: () => Promise<void>) => {
    if (!caregiverUnlocked) return;
    setBusy(true);
    setStatus("");
    try {
      await work();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : t("மீண்டும் முயற்சி செய்யவும்", "Please try again"),
      );
    } finally {
      setBusy(false);
    }
  };
  if (!caregiverUnlocked)
    return (
      <p>
        {t(
          "காப்புப் பிரதிக்கு அமைப்புகளைத் திறக்கவும்.",
          "Unlock settings to use backups.",
        )}
      </p>
    );
  return (
    <section className="personal-panel personal-backup">
      <h2>{t("பூட்டிய காப்புப் பிரதி", "Encrypted local backup")}</h2>
      <p>Therapy practice and evidence use a separate store. Export those from the Therapist dashboard before clearing device data.</p>
      <p>
        {t(
          "உங்கள் அட்டைகள், படங்கள், பதிவு செய்த குரல், ஒப்புதல், சொற்றொடர்கள் மற்றும் பதிவேடு ஒரு பூட்டிய கோப்பில் சேமிக்கப்படும். இணையத்தில் அனுப்பப்படாது.",
          "Save personal cards, photos, recorded phrases, consent, saved phrases and the communication log in an encrypted file. Nothing is uploaded.",
        )}
      </p>
      <p>
        {t(
          "PIN, தொலைபேசி இணைப்பு மற்றும் அமைப்புகள் இதில் இல்லை. கடவுச் சொற்றொடரை மறந்தால் கோப்பைத் திறக்க முடியாது.",
          "PIN, phone pairing credentials and app settings are excluded. Keep your passphrase: a lost passphrase cannot be recovered.",
        )}
      </p>
      <label>
        {t(
          "கடவுச் சொற்றொடர் (குறைந்தது 12 எழுத்துகள்)",
          "Passphrase (at least 12 characters)",
        )}
        <input
          type="password"
          autoComplete="new-password"
          value={passphrase}
          minLength={12}
          maxLength={512}
          onChange={(e) => {
            setPassphrase(e.target.value);
            setPreview(null);
          }}
        />
      </label>
      <label>
        {t("ஏற்றுமதிக்கு மீண்டும் எழுது", "Repeat passphrase for export")}
        <input
          type="password"
          autoComplete="new-password"
          value={repeat}
          maxLength={512}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </label>
      <TapButton
        disabled={busy || passphrase.length < 12 || passphrase !== repeat}
        onActivate={() =>
          void run(async () => {
            const blob = await exportEncryptedBackup(passphrase);
            const url = URL.createObjectURL(blob),
              link = document.createElement("a");
            link.href = url;
            link.download = `sollu-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
            setPassphrase("");
            setRepeat("");
            setStatus(
              t(
                "பூட்டிய கோப்பு பதிவிறக்கப்பட்டது.",
                "Encrypted file downloaded.",
              ),
            );
          })
        }
      >
        {t("பூட்டிய காப்புப் பிரதியைச் சேமி", "Download encrypted backup")}
      </TapButton>
      <hr />
      <label className="personal-file">
        {t("மீட்டெடுக்கக் கோப்பைத் தேர்ந்தெடு", "Choose a backup to restore")}
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setStatus("");
          }}
        />
      </label>
      <TapButton
        disabled={busy || !file || passphrase.length < 12}
        onActivate={() =>
          void run(async () => {
            if (file)
              setPreview(await inspectEncryptedBackup(file, passphrase));
          })
        }
      >
        {t("முதலில் உள்ளடக்கத்தைப் பார்", "Preview before importing")}
      </TapButton>
      {preview && (
        <div className="personal-panel">
          <h3>{t("சேர்க்க வேண்டியவை", "Review this backup")}</h3>
          <p>{new Date(preview.createdAt).toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>{t("வகை", "Collection")}</th>
                <th>{t("எண்ணிக்கை", "Count")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(preview.counts).map(([name, count]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>
              {t(
                "அட்டைகளையும் குரல் ஒப்புதலையும் பார்",
                "Inspect cards and recording consent",
              )}
            </summary>
            {preview.payload.personal.items.map((item) => (
              <div key={item.id}>
                <h4 lang={item.lang}>{item.title}</h4>
                <ul>
                  {(item.kind === "word"
                    ? [item.text]
                    : item.kind === "scene"
                      ? item.choices.map((c) => `${c.label}: ${c.text}`)
                      : item.lines
                  ).map((line, index) => (
                    <li key={index} lang={item.lang}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {preview.payload.tables.recordings.map((entry) => {
              const consent = preview.payload.tables.consents.find(
                (v) => v.id === entry.consentId,
              );
              return (
                <p key={entry.id}>
                  {String(entry.text)} · {String(entry.lang)} ·{" "}
                  {String(consent?.name)} ({String(consent?.givenBy)})
                </p>
              );
            })}
          </details>
          <p>
            {t(
              "ஏற்கெனவே உள்ளவை மாற்றப்படாது. புதிய தனிப்பட்ட அட்டைகள் மீண்டும் உங்கள் ஒப்புதலுக்காக வைக்கப்படும்.",
              "Existing entries are kept. Personal cards, memories and word corrections need patient review on this device. Recordings require their matching consent record.",
            )}
          </p>
          <div className="personal-actions">
            <TapButton
              disabled={busy}
              onActivate={() =>
                void run(async () => {
                  audio.stop();
                  const result = await mergeEncryptedBackup(
                    preview,
                    caregiverUnlocked,
                  );
                  setPreview(null);
                  setPassphrase("");
                  setRepeat("");
                  setStatus(
                    t(
                      `${result.added} சேர்க்கப்பட்டது. ${result.skipped} ஏற்கெனவே உள்ளவை விடப்பட்டது.`,
                      `${result.added} added. ${result.skipped} existing or conflicting entries skipped.`,
                    ),
                  );
                })
              }
            >
              {t("பார்த்தேன், புதியவற்றைச் சேர்", "Reviewed — add new entries")}
            </TapButton>
            <TapButton disabled={busy} onActivate={() => setPreview(null)}>
              {t("ரத்து செய்", "Cancel")}
            </TapButton>
          </div>
        </div>
      )}
      <p role="status" aria-live="polite">
        {busy ? t("செயல்படுகிறது…", "Working…") : status}
      </p>
    </section>
  );
}
