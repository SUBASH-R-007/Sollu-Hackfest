import { useEffect, useRef, useState } from "react";
import { db } from "../../db";
import { useApp } from "../../state";
import { TapButton } from "../../ui";
import { correctionPrefill, preparePracticeCorrection } from "./correction";
import { friendlyError, type PracticeRecord } from "./model";

export default function PracticeCorrection({
  record,
}: {
  record: PracticeRecord;
}) {
  const { settings, caregiverUnlocked } = useApp();
  const [heard, setHeard] = useState(() =>
    correctionPrefill(record.rawTranscript || record.transcript),
  );
  const [means, setMeans] = useState(() => correctionPrefill(record.target));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const allowed = useRef(caregiverUnlocked);
  allowed.current = caregiverUnlocked;
  const listener = settings.contacts.find(
    (contact) => contact.id === settings.addressee,
  );
  const validPlace = [
    "home",
    "hospital",
    "clinic",
    "outside",
    "other",
  ].includes(record.place)
    ? record.place
    : "any place";
  useEffect(() => {
    setHeard(correctionPrefill(record.rawTranscript || record.transcript));
    setMeans(correctionPrefill(record.target));
    setConfirmed(false);
    setStatus("");
  }, [record.id, record.rawTranscript, record.transcript, record.target]);
  // Permission and scope changes always require renewed review of the displayed mapping.
  useEffect(() => {
    setConfirmed(false);
  }, [caregiverUnlocked, settings.addressee, record.place, record.language]);
  useEffect(() => {
    allowed.current = caregiverUnlocked;
    return () => {
      allowed.current = false;
    };
  }, [caregiverUnlocked]);

  if (!caregiverUnlocked) return null;
  async function save() {
    if (!allowed.current || busy) return;
    setBusy(true);
    setStatus("");
    try {
      await db.transaction("rw", db.substitutions, async () => {
        const existing = await db.substitutions.toArray();
        const result = preparePracticeCorrection(
          record,
          {
            heard,
            means,
            addresseeId: listener?.id ?? "",
            personConfirmed: confirmed,
            caregiverUnlocked: allowed.current,
          },
          existing,
          { id: crypto.randomUUID(), now: Date.now() },
        );
        if (result.status === "duplicate") {
          setStatus(
            "This exact correction is already approved for this language, place and listener. No extra use was counted.",
          );
          return;
        }
        if (existing.length >= 500)
          throw new Error(
            "Review older corrections in Settings → Privacy before adding more.",
          );
        await db.substitutions.put(result.mapping);
        setStatus(
          "Correction saved on this device. It can guide future sentence suggestions when your context sharing settings allow it.",
        );
        setConfirmed(false);
      });
    } catch (error) {
      setStatus(friendlyError(error, "The correction could not be saved."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel rehab-practice-correction">
      <summary>
        Use this practice to improve future sentence suggestions
      </summary>
      <p>
        Optional: review a short heard → intended mapping with the person. Only
        their confirmed meaning should become a correction. A recognition
        mistake on its own is not evidence of a persistent speech difficulty.
      </p>
      <p>
        Practice method: {record.communicationMethod.replaceAll("_", " ")}.
        Mapping scope: {record.language === "ta" ? "Tamil" : "English"} ·{" "}
        {validPlace} · {listener?.name ?? "choose a listener in settings"}.
        Mappings are not restricted to a speech method.
      </p>
      {!record.transcriptReviewed && (
        <p className="notice">
          This attempt has no person-reviewed transcript. It cannot create a
          correction.
        </p>
      )}
      <div className="rehab-form-grid">
        <label>
          When the tool hears
          <input
            maxLength={120}
            value={heard}
            disabled={busy}
            onChange={(event) => {
              setHeard(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label>
          The person means
          <input
            maxLength={120}
            value={means}
            disabled={busy}
            onChange={(event) => {
              setMeans(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
      </div>
      <p>
        Long transcripts are not shortened automatically. Enter only the short
        phrase the person has reviewed.
      </p>
      <label className="rehab-check">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy || !record.transcriptReviewed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        The person confirmed this exact meaning and agrees to use this
        correction in future communication.
      </label>
      <TapButton
        disabled={
          busy || !confirmed || !listener || !heard.trim() || !means.trim()
        }
        onActivate={() => void save()}
      >
        {busy ? "Saving correction…" : "Save reviewed correction"}
      </TapButton>
      <p>
        Uses existing personal-context permissions; it does not enable sharing
        or send recordings. This saves a text correction, not acoustic-model
        training. Review or forget it in Settings → Privacy → Memory & word
        corrections.
      </p>
      {!settings.sharePersonalContext && (
        <p className="muted">
          Personal context sharing is off. Saving this correction does not turn
          it on.
        </p>
      )}
      <p role="status">{status}</p>
    </details>
  );
}
