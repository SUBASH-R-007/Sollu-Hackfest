import { RelayEnvelopeSchema } from "@sollu/shared";
import { api } from "./api";
import { getKV, setKV, type Pairing } from "../db";

export interface RelayMessage {
  id: string;
  type:
    | "spoken"
    | "help"
    | "help_cancel"
    | "delivered"
    | "ack"
    | "ask"
    | "presence";
  at: number;
  from: { role: "patient" | "care"; contactId?: string };
  text?: string;
  gloss_en?: string;
  lang?: "ta" | "en";
  urgency?: "none" | "elevated" | "emergency";
  refId?: string;
  name?: string;
}
const base64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid relay object");
  return value as Record<string, unknown>;
};
const boundedText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const knownKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const patientTypes = ["spoken", "help", "help_cancel", "presence"];
const careTypes = ["delivered", "ack", "ask", "presence"];

/** The server attests sender role through patient↔care routing; the plaintext must agree. */
export function parseRelayMessage(
  input: unknown,
  receiverRole?: Pairing["role"],
): RelayMessage {
  const m = object(input),
    from = object(m.from);
  if (
    !boundedText(m.id, 80) ||
    !Number.isSafeInteger(m.at) ||
    Number(m.at) < 0 ||
    Number(m.at) > Date.now() + 60_000
  )
    throw new Error("Invalid message identity or time");
  if (from.role !== "patient" && from.role !== "care")
    throw new Error("Invalid sender role");
  if (receiverRole && from.role === receiverRole)
    throw new Error("Message sender has the wrong role");
  if (
    !knownKeys(from, ["role", "contactId"]) ||
    (from.contactId !== undefined && !boundedText(from.contactId, 80))
  )
    throw new Error("Invalid sender");
  const roleTypes = from.role === "patient" ? patientTypes : careTypes;
  if (typeof m.type !== "string" || !roleTypes.includes(m.type))
    throw new Error("This message type is not allowed for the sender role");
  const allowed: Record<RelayMessage["type"], string[]> = {
    spoken: ["text", "gloss_en", "lang", "urgency"],
    help: ["text", "gloss_en", "lang", "urgency"],
    help_cancel: ["refId"],
    delivered: ["refId"],
    ack: ["refId", "name"],
    ask: ["text", "lang"],
    presence: ["name"],
  };
  if (
    !knownKeys(m, [
      "id",
      "type",
      "at",
      "from",
      ...allowed[m.type as RelayMessage["type"]],
    ])
  )
    throw new Error("Unknown message field");
  for (const [key, limit] of [
    ["text", 500],
    ["gloss_en", 500],
    ["refId", 80],
    ["name", 120],
  ] as const) {
    if (m[key] !== undefined && !boundedText(m[key], limit))
      throw new Error("Invalid message text");
  }
  if (m.lang !== undefined && m.lang !== "ta" && m.lang !== "en")
    throw new Error("Unsupported message language");
  if (
    m.urgency !== undefined &&
    !["none", "elevated", "emergency"].includes(String(m.urgency))
  )
    throw new Error("Invalid urgency");
  const required: Record<RelayMessage["type"], string[]> = {
    spoken: ["text", "gloss_en", "lang", "urgency"],
    help: [],
    help_cancel: [],
    delivered: ["refId"],
    ack: ["refId"],
    ask: ["text", "lang"],
    presence: ["name"],
  };
  if (
    required[m.type as RelayMessage["type"]].some((key) => m[key] === undefined)
  )
    throw new Error("Missing message field");
  return m as unknown as RelayMessage;
}

async function importKey(key: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(key) || key.length > 48)
    throw new Error("Invalid pairing key");
  const bytes = fromBase64(key);
  if (bytes.length !== 32) throw new Error("The pairing key must be 256 bits");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encryptMessage(message: RelayMessage, key: string) {
  const validated = parseRelayMessage(message);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(key),
    new TextEncoder().encode(JSON.stringify(validated)),
  );
  return {
    v: 1 as const,
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(ciphertext)),
  };
}
export async function decryptMessage(
  raw: string,
  key: string,
  receiverRole?: Pairing["role"],
): Promise<RelayMessage> {
  if (raw.length > 16 * 1024) throw new Error("Encrypted frame too large");
  const frame = RelayEnvelopeSchema.parse(JSON.parse(raw));
  const iv = fromBase64(frame.iv),
    ciphertext = fromBase64(frame.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16)
    throw new Error("Invalid AES-GCM envelope");
  const result = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await importKey(key),
    ciphertext,
  );
  return parseRelayMessage(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result)),
    receiverRole,
  );
}
function validatePairing(pairing: Pairing): Pairing {
  if (
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pairing.roomId) ||
    !boundedText(pairing.grant, 2048) ||
    !boundedText(pairing.name, 120) ||
    !boundedText(pairing.contactId, 80) ||
    (pairing.role !== "patient" && pairing.role !== "care")
  )
    throw new Error("Invalid pairing details");
  return pairing;
}
export async function createPairing(name: string, contactId: string) {
  if (!boundedText(name, 120) || !boundedText(contactId, 80))
    throw new Error("Invalid caregiver details");
  const room = await api<{
    roomId: string;
    roomGrant: string;
    careGrant: string;
  }>("relay/room", {});
  const key = base64(crypto.getRandomValues(new Uint8Array(32)));
  const patient = validatePairing({
    roomId: room.roomId,
    grant: room.roomGrant,
    key,
    role: "patient",
    name,
    contactId,
  });
  await setKV("pairing", patient);
  const hash = new URLSearchParams({
    r: room.roomId,
    g: room.careGrant,
    k: key,
    c: contactId,
    n: name,
  });
  return { patient, url: `${location.origin}/care#${hash}` };
}
export async function receivePairing() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (!hash.has("r")) {
    const saved = await getKV<Pairing>("carePairing");
    if (saved) {
      validatePairing(saved);
      if (saved.role !== "care") throw new Error("Invalid caregiver pairing");
      await importKey(saved.key);
    }
    return saved;
  }
  const pairing = validatePairing({
    roomId: hash.get("r") ?? "",
    grant: hash.get("g") ?? "",
    key: hash.get("k") ?? "",
    contactId: hash.get("c") ?? "care",
    name: hash.get("n") ?? "Caregiver",
    role: "care",
  });
  await importKey(pairing.key);
  await setKV("carePairing", pairing);
  await setKV("role", "care");
  history.replaceState({}, "", location.pathname);
  return pairing;
}
export class RelayClient {
  private socket?: WebSocket;
  private stopped = false;
  private retry?: ReturnType<typeof setTimeout>;
  private seen = new Set<string>();
  constructor(
    public pairing: Pairing,
    private onMessage: (message: RelayMessage) => void,
    private onStatus: (connected: boolean) => void,
  ) {}
  connect() {
    clearTimeout(this.retry);
    this.stopped = false;
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws?r=${encodeURIComponent(this.pairing.roomId)}&g=${encodeURIComponent(this.pairing.grant)}&role=${this.pairing.role}`,
    );
    this.socket = socket;
    socket.onopen = () => {
      if (!this.stopped && this.socket === socket) this.onStatus(true);
    };
    socket.onmessage = (event) => {
      void decryptMessage(
        String(event.data),
        this.pairing.key,
        this.pairing.role,
      )
        .then((message) => {
          if (
            this.stopped ||
            this.socket !== socket ||
            this.seen.has(message.id)
          )
            return;
          this.seen.add(message.id);
          if (this.seen.size > 1000)
            this.seen.delete(this.seen.values().next().value!);
          this.onMessage(message);
        })
        .catch(() => undefined);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.onStatus(false);
      if (!this.stopped) this.retry = setTimeout(() => this.connect(), 3000);
    };
    socket.onerror = () => socket.close();
  }
  async send(
    type: RelayMessage["type"],
    data: Partial<RelayMessage> = {},
  ): Promise<string | null> {
    const socket = this.socket;
    if (this.stopped || socket?.readyState !== WebSocket.OPEN) return null;
    const message: RelayMessage = {
      ...data,
      id: crypto.randomUUID(),
      type,
      at: Date.now(),
      from: { role: this.pairing.role, contactId: this.pairing.contactId },
    };
    const frame = await encryptMessage(message, this.pairing.key);
    if (
      this.stopped ||
      socket !== this.socket ||
      socket.readyState !== WebSocket.OPEN
    )
      return null;
    socket.send(JSON.stringify(frame));
    return message.id;
  }
  disconnect() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.socket?.close();
  }
}
