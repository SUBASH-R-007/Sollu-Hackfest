import { useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { download } from "../../lib/metrics";
import { TapButton } from "../../ui";
import type { TherapyReport } from "./report";
import { friendlyError } from "./model";
import {
  decryptTherapyReport,
  encryptTherapyReport,
  MAX_ENCRYPTED_REPORT_BYTES,
} from "./reportEncryption";

function useSensitiveTransfer() {
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const operation = useRef(0);
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState !== "hidden") return;
      operation.current++;
      setPassphrase("");
      setConfirmation("");
      setBusy(false);
    };
    document.addEventListener("visibilitychange", clear);
    return () => {
      operation.current++;
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);
  return {
    passphrase,
    setPassphrase,
    confirmation,
    setConfirmation,
    busy,
    setBusy,
    status,
    setStatus,
    operation,
  };
}

export function EncryptedReportExport({
  allowed,
  getReport,
}: {
  allowed: boolean;
  getReport: () => TherapyReport;
}) {
  const state = useSensitiveTransfer();
  const { operation, setBusy, setPassphrase, setConfirmation } = state;
  useEffect(() => {
    if (!allowed) {
      operation.current++;
      setBusy(false);
      setPassphrase("");
      setConfirmation("");
    }
  }, [allowed, operation, setBusy, setPassphrase, setConfirmation]);
  async function save() {
    if (!allowed || state.busy) return;
    state.setStatus("");
    if (state.passphrase !== state.confirmation) {
      state.setStatus("The two passphrases must match.");
      return;
    }
    const token = ++operation.current;
    state.setBusy(true);
    try {
      const report = getReport();
      const file = await encryptTherapyReport(report, state.passphrase);
      if (token !== operation.current) return;
      download(file, "sollu-encrypted-report.json");
      state.setStatus(
        "Encrypted report downloaded. Passphrase fields cleared. Send the passphrase separately to your chosen recipient; no recording clips are included.",
      );
    } catch (error) {
      if (token === operation.current)
        state.setStatus(
          friendlyError(error, "The report could not be encrypted."),
        );
    } finally {
      if (token === operation.current) {
        state.setBusy(false);
        state.setPassphrase("");
        state.setConfirmation("");
      }
    }
  }
  return (
    <div className="rehab-encrypted-transfer">
      <h4>
        <LockKeyhole size={19} aria-hidden="true" /> Encrypted report —
        recommended for transfer
      </h4>
      <p>
        Use a long, unique passphrase, at least 12 characters. The recipient
        will need it to open the file. It cannot be recovered. The app encrypts
        locally and does not save the passphrase.
      </p>
      <div className="rehab-form-grid">
        <label>
          Report passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={state.passphrase}
            minLength={12}
            maxLength={512}
            disabled={state.busy}
            onChange={(event) => state.setPassphrase(event.target.value)}
          />
        </label>
        <label>
          Repeat report passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={state.confirmation}
            minLength={12}
            maxLength={512}
            disabled={state.busy}
            onChange={(event) => state.setConfirmation(event.target.value)}
          />
        </label>
      </div>
      <TapButton
        className="primary-button"
        disabled={
          !allowed ||
          state.busy ||
          state.passphrase.length < 12 ||
          state.passphrase !== state.confirmation
        }
        onActivate={() => void save()}
      >
        {state.busy ? "Encrypting report…" : "Download encrypted report"}
      </TapButton>
      <p role="status">{state.status}</p>
    </div>
  );
}

export function EncryptedReportImport({
  onPreview,
  onClear,
}: {
  onPreview: (report: TherapyReport) => void;
  onClear: () => void;
}) {
  const state = useSensitiveTransfer();
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function inspect() {
    if (!file || state.busy) return;
    const token = ++state.operation.current;
    state.setStatus("");
    state.setBusy(true);
    onClear();
    try {
      const report = await decryptTherapyReport(file, state.passphrase);
      if (token !== state.operation.current) return;
      onPreview(report);
      setFile(null);
      if (input.current) input.current.value = "";
      state.setStatus(
        "Decrypted and validated locally. Review the preview below before keeping a snapshot. Imported snapshots are stored in the browser's local database, not in this encrypted file format.",
      );
    } catch (error) {
      if (token === state.operation.current)
        state.setStatus(
          friendlyError(error, "The report could not be opened."),
        );
    } finally {
      if (token === state.operation.current) {
        state.setBusy(false);
        state.setPassphrase("");
      }
    }
  }
  return (
    <div className="rehab-encrypted-transfer">
      <h4>Open an encrypted report</h4>
      <label>
        Choose encrypted Sollu report JSON (maximum 3 MB)
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          disabled={state.busy}
          onChange={(event) => {
            state.operation.current++;
            state.setPassphrase("");
            state.setStatus("");
            onClear();
            const selected = event.target.files?.[0] ?? null;
            if (selected && selected.size > MAX_ENCRYPTED_REPORT_BYTES) {
              state.setStatus("Choose an encrypted report smaller than 3 MB.");
              setFile(null);
              return;
            }
            setFile(selected);
          }}
        />
      </label>
      <label>
        Passphrase to open report
        <input
          type="password"
          autoComplete="off"
          value={state.passphrase}
          minLength={12}
          maxLength={512}
          disabled={state.busy}
          onChange={(event) => state.setPassphrase(event.target.value)}
        />
      </label>
      <TapButton
        className="secondary-button"
        disabled={!file || state.busy || state.passphrase.length < 12}
        onActivate={() => void inspect()}
      >
        {state.busy ? "Opening report…" : "Decrypt and preview report"}
      </TapButton>
      <p role="status">{state.status}</p>
    </div>
  );
}
