import {
  AttemptSchema,
  CandidateSchema,
  MemoryEntrySchema,
  WordSubstitutionSchema,
} from "@sollu/shared";
import { db, recordingId } from "../../db";
import {
  mergePersonal,
  PERSONAL_KEY,
  validatePersonalStore,
  type PersonalStore,
} from "./model";
import { emptyPersonal, readPersonal } from "./store";

const MAX_FILE = 40 * 1024 * 1024;
const MAX_PLAIN = 25 * 1024 * 1024;
const ITERATIONS = 310_000;
const tableNames = [
  "phrases",
  "consents",
  "recordings",
  "attempts",
  "memories",
  "substitutions",
] as const;
type TableName = (typeof tableNames)[number];
type Row = Record<string, unknown> & { id: string };
export interface BackupPayload {
  format: "sollu-personal";
  version: 1;
  createdAt: number;
  personal: PersonalStore;
  tables: Record<TableName, Row[]>;
}
export interface BackupPreview {
  createdAt: number;
  counts: Record<string, number>;
  payload: BackupPayload;
}
const previews = new WeakSet<BackupPreview>();
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const bytes = (v: Uint8Array) => new Uint8Array(v).buffer as ArrayBuffer;
function base64(input: Uint8Array) {
  let s = "";
  for (let i = 0; i < input.length; i += 8192)
    s += String.fromCharCode(...input.subarray(i, i + 8192));
  return btoa(s);
}
function unbase64(input: unknown, limit: number) {
  if (
    typeof input !== "string" ||
    input.length > Math.ceil(limit / 3) * 4 + 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/u.test(input)
  )
    throw new Error("Invalid backup encoding.");
  let data: string;
  try {
    data = atob(input);
  } catch {
    throw new Error("Invalid backup encoding.");
  }
  if (data.length > limit) throw new Error("Backup is too large.");
  return Uint8Array.from(data, (c) => c.charCodeAt(0));
}
async function encode(value: unknown, depth = 0): Promise<unknown> {
  if (depth > 20) throw new Error("Backup is too complex.");
  if (value instanceof Blob)
    return {
      $blob: base64(new Uint8Array(await value.arrayBuffer())),
      mime: value.type,
    };
  if (Array.isArray(value))
    return Promise.all(value.map((v) => encode(v, depth + 1)));
  if (object(value)) {
    const entries = await Promise.all(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(async ([k, v]) => [k, await encode(v, depth + 1)]),
    );
    return Object.fromEntries(entries);
  }
  return value;
}
function decode(value: unknown, depth = 0): unknown {
  if (depth > 20) throw new Error("Backup is too complex.");
  if (typeof value === "string" && value.length > 40_000)
    throw new Error("Backup text is too long.");
  if (Array.isArray(value)) {
    if (value.length > 10_000) throw new Error("Too many backup entries.");
    return value.map((v) => decode(v, depth + 1));
  }
  if (object(value)) {
    if (
      Object.keys(value).some((key) =>
        ["__proto__", "constructor", "prototype"].includes(key),
      )
    )
      throw new Error("Invalid backup field.");
    if ("$blob" in value) {
      if (
        Object.keys(value).length !== 2 ||
        typeof value.mime !== "string" ||
        !/^(image\/(jpeg|png|webp)|audio\/(webm|mp4|wav|x-wav|ogg|mpeg))(;codecs=[\w,.-]+)?$/u.test(
          value.mime,
        )
      )
        throw new Error("Unsupported backup media type.");
      return new Blob([bytes(unbase64(value.$blob, 10 * 1024 * 1024))], {
        type: value.mime,
      });
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, decode(v, depth + 1)]),
    );
  }
  return value;
}

function row(value: unknown): Row {
  if (
    !object(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    value.id.length > 2048
  )
    throw new Error("Invalid backup row.");
  return value as Row;
}
function validateRow(table: TableName, value: unknown): Row {
  const v = row(value);
  if (table === "attempts") return AttemptSchema.parse(v) as Row;
  if (table === "memories") {
    // Existing local memory identifiers contain the full text and may exceed 120 characters.
    const result = MemoryEntrySchema.parse({ ...v, id: "imported" });
    const { sig: _signature, ...clean } = result;
    const candidate = clean.candidate ? { ...clean.candidate } : undefined;
    if (candidate) delete candidate.sig;
    return {
      ...clean,
      id: v.id,
      confirmed: false,
      ...(candidate ? { candidate } : {}),
    };
  }
  if (table === "substitutions")
    return {
      ...WordSubstitutionSchema.parse({ ...v, id: "imported" }),
      id: v.id,
      confirmed: false,
    };
  if (table === "phrases") {
    if (!["ta", "en"].includes(String(v.lang)) || typeof v.pinned !== "boolean")
      throw new Error("Invalid saved phrase.");
    const { sig: _signature, ...candidate } = CandidateSchema.parse(
      v.candidate,
    );
    return { id: v.id, lang: v.lang, pinned: v.pinned, candidate };
  }
  if (table === "consents") {
    if (
      v.scope !== "recorded_phrases" ||
      !["self", "self_supported", "voice_donor"].includes(String(v.givenBy)) ||
      typeof v.name !== "string" ||
      !v.name.trim() ||
      v.name.length > 120 ||
      typeof v.at !== "number" ||
      !Number.isFinite(v.at) ||
      v.at <= 0
    )
      throw new Error("Invalid voice consent record.");
    return {
      id: v.id,
      scope: v.scope,
      givenBy: v.givenBy,
      name: v.name,
      at: v.at,
    };
  }
  if (
    !["ta", "en"].includes(String(v.lang)) ||
    typeof v.text !== "string" ||
    !v.text.trim() ||
    v.text.length > 500 ||
    typeof v.consentId !== "string" ||
    v.consentId.length > 2048 ||
    !(v.blob instanceof Blob) ||
    !/^audio\/(webm|mp4|wav|x-wav|ogg|mpeg)(;codecs=[\w,.-]+)?$/u.test(
      v.blob.type,
    ) ||
    !v.blob.size ||
    v.blob.size > 10 * 1024 * 1024 ||
    typeof v.createdAt !== "number" ||
    !Number.isFinite(v.createdAt) ||
    v.id !== recordingId(v.text, v.lang as "ta" | "en")
  )
    throw new Error("Invalid exact-phrase recording.");
  return {
    id: v.id,
    text: v.text,
    lang: v.lang,
    consentId: v.consentId,
    blob: v.blob,
    createdAt: v.createdAt,
  };
}
export function validateBackup(value: unknown): BackupPayload {
  if (
    !object(value) ||
    value.format !== "sollu-personal" ||
    value.version !== 1 ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    !object(value.tables)
  )
    throw new Error("Unsupported backup format.");
  const tables = {} as Record<TableName, Row[]>;
  for (const name of tableNames) {
    const values = value.tables[name];
    if (!Array.isArray(values) || values.length > 10_000)
      throw new Error("Invalid backup collection.");
    tables[name] = values.map((v) => validateRow(name, v));
    if (new Set(tables[name].map((v) => v.id)).size !== tables[name].length)
      throw new Error("Duplicate backup identifiers.");
  }
  const consentIds = new Set(tables.consents.map((v) => v.id));
  if (tables.recordings.some((v) => !consentIds.has(v.consentId as string)))
    throw new Error("A recording is missing its consent record.");
  return {
    format: "sollu-personal",
    version: 1,
    createdAt: value.createdAt,
    personal: validatePersonalStore(value.personal),
    tables,
  };
}
async function keyFor(passphrase: string, salt: Uint8Array) {
  if (passphrase.length < 12 || passphrase.length > 512)
    throw new Error("Use a passphrase of 12–512 characters.");
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: ITERATIONS,
      salt: bytes(salt),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
const aad = new TextEncoder().encode("SolluBackup/v1");
function checkEncodedSize(value: unknown) {
  let total = 0;
  const visit = (v: unknown) => {
    if (v instanceof Blob) total += Math.ceil(v.size / 3) * 4 + 100;
    else if (typeof v === "string")
      total += new TextEncoder().encode(v).byteLength + 2;
    else if (Array.isArray(v)) {
      total += v.length + 2;
      for (const item of v) visit(item);
    } else if (object(v)) {
      for (const [key, item] of Object.entries(v)) {
        total += key.length + 4;
        visit(item);
      }
    } else total += 20;
    if (total > MAX_PLAIN)
      throw new Error(
        "Backup is larger than 25 MB. Remove unused photos or recordings first.",
      );
  };
  visit(value);
}
export async function encryptBackup(
  payload: BackupPayload,
  passphrase: string,
): Promise<Blob> {
  const clean = validateBackup(payload);
  // Bound memory before converting Blob data to base64, not only after allocating it.
  checkEncodedSize(clean);
  const data = new TextEncoder().encode(JSON.stringify(await encode(clean)));
  if (data.byteLength > MAX_PLAIN)
    throw new Error(
      "Backup is larger than 25 MB. Remove unused recordings first.",
    );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bytes(iv), additionalData: aad },
    key,
    data,
  );
  return new Blob(
    [
      JSON.stringify({
        format: "sollu-encrypted",
        version: 1,
        kdf: "PBKDF2-SHA256",
        iterations: ITERATIONS,
        salt: base64(salt),
        iv: base64(iv),
        ciphertext: base64(new Uint8Array(ciphertext)),
      }),
    ],
    { type: "application/json" },
  );
}
export async function inspectEncryptedBackup(
  file: Blob,
  passphrase: string,
): Promise<BackupPreview> {
  if (!file.size || file.size > MAX_FILE)
    throw new Error("Choose a Sollu backup smaller than 40 MB.");
  let envelope: unknown;
  try {
    envelope = JSON.parse(await file.text());
  } catch {
    throw new Error("This is not a Sollu backup.");
  }
  if (
    !object(envelope) ||
    envelope.format !== "sollu-encrypted" ||
    envelope.version !== 1 ||
    envelope.kdf !== "PBKDF2-SHA256" ||
    envelope.iterations !== ITERATIONS
  )
    throw new Error("Unsupported encrypted backup.");
  const salt = unbase64(envelope.salt, 16),
    iv = unbase64(envelope.iv, 12),
    encrypted = unbase64(envelope.ciphertext, MAX_PLAIN + 16);
  if (salt.length !== 16 || iv.length !== 12 || encrypted.length < 16)
    throw new Error("Invalid encrypted backup.");
  const key = await keyFor(passphrase, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv), additionalData: aad },
      key,
      bytes(encrypted),
    );
  } catch {
    throw new Error("The passphrase is incorrect or the backup was changed.");
  }
  const payload = validateBackup(
    decode(JSON.parse(new TextDecoder().decode(plain))),
  );
  const preview = {
    createdAt: payload.createdAt,
    counts: {
      "Personal cards": payload.personal.items.length,
      ...Object.fromEntries(
        tableNames.map((name) => [name, payload.tables[name].length]),
      ),
    },
    payload,
  };
  previews.add(preview);
  return preview;
}
export async function exportEncryptedBackup(passphrase: string): Promise<Blob> {
  const payload = await db.transaction("r", db.tables, async () => ({
    format: "sollu-personal" as const,
    version: 1 as const,
    createdAt: Date.now(),
    personal: await readPersonal(),
    tables: Object.fromEntries(
      await Promise.all(
        tableNames.map(async (name) => [name, await db.table(name).toArray()]),
      ),
    ) as Record<TableName, Row[]>,
  }));
  return encryptBackup(payload, passphrase);
}
export async function mergeEncryptedBackup(
  preview: BackupPreview,
  caregiverUnlocked: boolean,
) {
  if (!caregiverUnlocked) throw new Error("Unlock settings before importing.");
  if (!previews.has(preview))
    throw new Error("Preview this backup before importing.");
  const payload = validateBackup(preview.payload);
  const result = await db.transaction("rw", db.tables, async () => {
    const current = (await db.kv.get(PERSONAL_KEY))?.value ?? emptyPersonal;
    const merged = mergePersonal(
      validatePersonalStore(current),
      payload.personal,
    );
    let added = merged.added,
      skipped = merged.skipped;
    await db.kv.put({ key: PERSONAL_KEY, value: merged.store });
    // Consent rows precede their recordings. Existing entries are never replaced.
    for (const name of [
      "consents",
      "phrases",
      "recordings",
      "attempts",
      "memories",
      "substitutions",
    ] as TableName[]) {
      for (const entry of payload.tables[name]) {
        if (await db.table(name).get(entry.id)) {
          skipped++;
          continue;
        }
        if (name === "recordings") {
          const actual = await db.consents.get(entry.consentId as string);
          const archived = payload.tables.consents.find(
            (v) => v.id === entry.consentId,
          );
          if (
            !actual ||
            !archived ||
            actual.name !== archived.name ||
            actual.at !== archived.at ||
            actual.givenBy !== archived.givenBy
          ) {
            skipped++;
            continue;
          }
        }
        await db.table(name).add(entry);
        added++;
      }
    }
    return { added, skipped };
  });
  previews.delete(preview);
  return result;
}
