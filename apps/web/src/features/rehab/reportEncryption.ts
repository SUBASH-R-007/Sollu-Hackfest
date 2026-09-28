import { z } from "zod";
import { MAX_REPORT_BYTES, parseReport, type TherapyReport } from "./report";

export const MAX_ENCRYPTED_REPORT_BYTES = 3 * 1024 * 1024;
const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const additionalData = encoder.encode(
  "SolluRehabilitationReport/v1/PBKDF2-SHA256/600000/AES-256-GCM",
);
const envelopeSchema = z
  .object({
    format: z.literal("sollu-encrypted-rehabilitation-report"),
    version: z.literal(1),
    kdf: z.literal("PBKDF2-SHA256"),
    iterations: z.literal(ITERATIONS),
    cipher: z.literal("AES-256-GCM"),
    salt: z.string().max(24),
    iv: z.string().max(16),
    ciphertext: z.string().max(Math.ceil((MAX_REPORT_BYTES + 16) / 3) * 4),
  })
  .strict();
const bytes = (input: Uint8Array) => new Uint8Array(input).buffer;
function base64(input: Uint8Array): string {
  let value = "";
  for (let offset = 0; offset < input.length; offset += 8192)
    value += String.fromCharCode(...input.subarray(offset, offset + 8192));
  return btoa(value);
}
function decodeBase64(value: string, maxBytes: number): Uint8Array {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  )
    throw new Error("Invalid encrypted report encoding.");
  const binary = atob(value);
  if (binary.length > maxBytes)
    throw new Error("Encrypted report is too large.");
  const result = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );
  if (base64(result) !== value)
    throw new Error("Invalid encrypted report encoding.");
  return result;
}
async function keyFor(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  if (passphrase.length < 12 || passphrase.length > 512 || !passphrase.trim())
    throw new Error("Use a unique passphrase of 12–512 characters.");
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Secure browser cryptography is unavailable. Open the app on localhost or HTTPS.",
    );
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: bytes(salt),
      iterations: ITERATIONS,
    },
    key,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Only the report JSON is encrypted. Recordings, keys, PIN and device credentials are never added. */
export async function encryptTherapyReport(
  report: TherapyReport,
  passphrase: string,
): Promise<Blob> {
  const clean = parseReport(JSON.stringify(report));
  const plaintext = encoder.encode(JSON.stringify(clean));
  if (plaintext.byteLength > MAX_REPORT_BYTES)
    throw new Error(
      "Choose a shorter report range; report JSON must stay below 2 MB.",
    );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bytes(iv), additionalData, tagLength: 128 },
    key,
    plaintext,
  );
  return new Blob(
    [
      JSON.stringify({
        format: "sollu-encrypted-rehabilitation-report",
        version: 1,
        kdf: "PBKDF2-SHA256",
        iterations: ITERATIONS,
        cipher: "AES-256-GCM",
        salt: base64(salt),
        iv: base64(iv),
        ciphertext: base64(new Uint8Array(ciphertext)),
      }),
    ],
    { type: "application/json" },
  );
}

/** Decrypt and validate into a preview only. Import consent is a separate explicit UI step. */
export async function decryptTherapyReport(
  file: Blob,
  passphrase: string,
): Promise<TherapyReport> {
  if (!file.size || file.size > MAX_ENCRYPTED_REPORT_BYTES)
    throw new Error("Choose an encrypted Sollu report smaller than 3 MB.");
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new Error("Choose a valid encrypted Sollu report JSON file.");
  }
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("Unsupported encrypted report format or parameters.");
  const envelope = parsed.data;
  const salt = decodeBase64(envelope.salt, 16);
  const iv = decodeBase64(envelope.iv, 12);
  const ciphertext = decodeBase64(envelope.ciphertext, MAX_REPORT_BYTES + 16);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17)
    throw new Error("Invalid encrypted report lengths.");
  const key = await keyFor(passphrase, salt);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv), additionalData, tagLength: 128 },
      key,
      bytes(ciphertext),
    );
  } catch {
    throw new Error(
      "The passphrase is incorrect or the encrypted report was changed.",
    );
  }
  if (plaintext.byteLength > MAX_REPORT_BYTES)
    throw new Error("Decrypted report exceeds 2 MB.");
  return parseReport(
    new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
  );
}
