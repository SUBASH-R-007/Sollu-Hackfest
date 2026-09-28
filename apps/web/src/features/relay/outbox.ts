import { db } from "../../db";

export const HELP_TTL_MS = 60_000;
export const SPOKEN_TTL_MS = 5 * 60_000;
export const CANCEL_TTL_MS = 5 * 60_000;
const SEEN_TTL_MS = 10 * 60_000;
export type QueuedType = "spoken" | "help" | "help_cancel";
export interface OutboxEntry {
  id: string;
  type: QueuedType;
  at: number;
  expiresAt: number;
  /** AES-GCM envelope only. No sentence, photo, transcript or key is stored here. */
  frame: string;
  sentAt?: number;
}
export interface OutboxState {
  version: 1;
  entries: OutboxEntry[];
  seen: { id: string; until: number }[];
  lastHelp?: { id: string; at: number };
}
export interface OutboxStorage {
  change<T>(scope: string, update: (state: OutboxState) => T): Promise<T>;
}
export const emptyOutbox = (): OutboxState => ({
  version: 1,
  entries: [],
  seen: [],
});
export function ttlFor(type: string): number | undefined {
  return type === "help"
    ? HELP_TTL_MS
    : ["spoken", "ask"].includes(type)
      ? SPOKEN_TTL_MS
      : type === "help_cancel"
        ? CANCEL_TTL_MS
        : undefined;
}
export function messageIsFresh(type: string, at: number, now = Date.now()) {
  const ttl = ttlFor(type);
  return at <= now + 60_000 && (ttl === undefined || now - at < ttl);
}
function readState(value: unknown): OutboxState {
  if (!value || typeof value !== "object") return emptyOutbox();
  const v = value as Partial<OutboxState>;
  if (v.version !== 1 || !Array.isArray(v.entries) || !Array.isArray(v.seen))
    return emptyOutbox();
  return {
    version: 1,
    entries: v.entries
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          entry.id.length <= 80 &&
          ["spoken", "help", "help_cancel"].includes(entry.type) &&
          Number.isFinite(entry.at) &&
          Number.isFinite(entry.expiresAt) &&
          entry.expiresAt === entry.at + ttlFor(entry.type)! &&
          typeof entry.frame === "string" &&
          entry.frame.length <= 16_384,
      )
      .slice(-50),
    seen: v.seen
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          entry.id.length <= 80 &&
          Number.isFinite(entry.until),
      )
      .slice(-1000),
    ...(v.lastHelp &&
    typeof v.lastHelp.id === "string" &&
    Number.isFinite(v.lastHelp.at)
      ? { lastHelp: v.lastHelp }
      : {}),
  };
}
export const indexedOutboxStorage: OutboxStorage = {
  async change<T>(
    scope: string,
    update: (state: OutboxState) => T,
  ): Promise<T> {
    return db.transaction("rw", db.kv, async () => {
      const key = `relay-outbox:v1:${scope}`;
      const state = readState((await db.kv.get(key))?.value);
      const result = update(state);
      await db.kv.put({ key, value: state });
      return result;
    });
  },
};

export class DurableOutbox {
  constructor(
    private scope: string,
    private storage: OutboxStorage = indexedOutboxStorage,
    private now = () => Date.now(),
  ) {}
  async add(entry: OutboxEntry) {
    return this.storage.change(this.scope, (state) => {
      const expired = state.entries.filter((v) => v.expiresAt <= this.now());
      state.entries = state.entries.filter((v) => v.expiresAt > this.now());
      if (state.entries.length >= 50)
        throw new Error("The relay queue is full.");
      if (!state.entries.some((v) => v.id === entry.id))
        state.entries.push(entry);
      if (entry.type === "help")
        state.lastHelp = { id: entry.id, at: entry.at };
      return expired;
    });
  }
  async pending() {
    return this.storage.change(this.scope, (state) => {
      const expired = state.entries.filter((v) => v.expiresAt <= this.now());
      state.entries = state.entries.filter((v) => v.expiresAt > this.now());
      // Keep network batches under the relay limit; urgent cancels precede old requests.
      return {
        entries: [...state.entries].sort(
          (a, b) =>
            (a.type === "help_cancel" ? -2 : a.type === "help" ? -1 : 0) -
              (b.type === "help_cancel" ? -2 : b.type === "help" ? -1 : 0) ||
            (a.sentAt ?? 0) - (b.sentAt ?? 0) ||
            a.at - b.at,
        ),
        expired,
      };
    });
  }
  async sent(id: string) {
    return this.storage.change(this.scope, (state) => {
      const entry = state.entries.find((v) => v.id === id);
      if (entry) entry.sentAt = this.now();
    });
  }
  async receipt(id: string) {
    return this.storage.change(this.scope, (state) => {
      const entry = state.entries.find((v) => v.id === id);
      state.entries = state.entries.filter((v) => v.id !== id);
      return entry;
    });
  }
  /** Remove the queued alert and record its cancellation in one durable transaction. */
  async cancel(
    refId: string | undefined,
    create: (ref: string) => Promise<OutboxEntry>,
  ) {
    const ref =
      refId ??
      (await this.storage.change(this.scope, (state) => state.lastHelp?.id));
    if (!ref) return undefined;
    const cancellation = await create(ref);
    const displaced = await this.storage.change(this.scope, (state) => {
      state.entries = state.entries.filter(
        (v) => !(v.type === "help" && v.id === ref) && v.expiresAt > this.now(),
      );
      // Prefer cancelling an alert to keeping an old unconfirmed message in a full queue.
      let displaced: OutboxEntry | undefined;
      if (state.entries.length >= 50) {
        const ordinary = state.entries.findIndex(
          (entry) => entry.type === "spoken",
        );
        [displaced] = state.entries.splice(ordinary >= 0 ? ordinary : 0, 1);
      }
      state.entries.push(cancellation);
      if (state.lastHelp?.id === ref) delete state.lastHelp;
      return displaced;
    });
    return { refId: ref, entry: cancellation, displaced };
  }
  async accept(id: string) {
    return this.storage.change(this.scope, (state) => {
      state.seen = state.seen.filter((v) => v.until > this.now());
      if (state.seen.some((v) => v.id === id)) return false;
      state.seen = [
        ...state.seen.slice(-999),
        { id, until: this.now() + SEEN_TTL_MS },
      ];
      return true;
    });
  }
}
