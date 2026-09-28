import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptMessage,
  encryptMessage,
  RelayClient,
  type RelayMessage,
} from "../../lib/relay";
import {
  DurableOutbox,
  emptyOutbox,
  HELP_TTL_MS,
  messageIsFresh,
  SPOKEN_TTL_MS,
  type OutboxEntry,
  type OutboxState,
  type OutboxStorage,
} from "./outbox";
import type { Pairing } from "../../db";

class MemoryStorage implements OutboxStorage {
  states = new Map<string, OutboxState>();
  async change<T>(
    scope: string,
    update: (state: OutboxState) => T,
  ): Promise<T> {
    const state = structuredClone(this.states.get(scope) ?? emptyOutbox());
    const result = update(state);
    this.states.set(scope, state);
    return result;
  }
}
class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: () => void = () => {};
  onclose: () => void = () => {};
  onerror: () => void = () => {};
  onmessage: (event: { data: string }) => void = () => {};
  constructor() {
    FakeSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen();
  }
  close() {
    this.readyState = 3;
    this.onclose();
  }
  send(frame: string) {
    if (this.readyState !== 1) throw new Error("Disconnected");
    this.sent.push(frame);
  }
}
const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(42)));
const pairing: Pairing = {
  roomId: "test-room",
  grant: "test-grant",
  role: "patient",
  key,
  name: "Family",
  contactId: "family",
};
const spoken = {
  text: "Please give me water.",
  gloss_en: "Please give me water.",
  lang: "en" as const,
  urgency: "none" as const,
};
const clients: RelayClient[] = [];
function client(
  storage: OutboxStorage,
  role: Pairing["role"] = "patient",
  now?: () => number,
  onMessage = vi.fn(),
) {
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("location", { protocol: "http:", host: "localhost:5173" });
  const value = new RelayClient(
    { ...pairing, role },
    onMessage,
    vi.fn(),
    vi.fn(),
    { storage, now },
  );
  clients.push(value);
  value.connect();
  return { client: value, socket: FakeSocket.instances.at(-1)!, onMessage };
}
afterEach(() => {
  clients.splice(0).forEach((v) => v.disconnect());
  FakeSocket.instances = [];
  vi.unstubAllGlobals();
});

describe("durable ciphertext outbox", () => {
  it("queues offline, survives a new client, and resends the same encrypted frame and ID", async () => {
    const storage = new MemoryStorage(),
      first = client(storage);
    const id = await first.client.send("spoken", spoken);
    expect(id).toBeTypeOf("string");
    expect(first.client.getDeliveryStatus(id!)).toBe("queued");
    const saved = storage.states.get("test-room:patient")!.entries[0];
    expect(
      JSON.stringify(storage.states.get("test-room:patient")),
    ).not.toContain("water");
    first.client.disconnect();
    const second = client(storage);
    second.socket.open();
    await vi.waitFor(() => expect(second.socket.sent).toHaveLength(1));
    expect(second.socket.sent[0]).toBe(saved.frame);
    expect((await decryptMessage(second.socket.sent[0], key, "care")).id).toBe(
      id,
    );
    expect(second.client.getDeliveryStatus(id!)).toBe("sent");
  });
  it("only removes an outgoing message after the recipient receipt, never on socket send", async () => {
    const storage = new MemoryStorage(),
      instance = client(storage);
    instance.socket.open();
    const id = await instance.client.send("spoken", spoken);
    expect(storage.states.get("test-room:patient")!.entries).toHaveLength(1);
    const receipt: RelayMessage = {
      id: "receipt1",
      type: "delivered",
      at: Date.now(),
      from: { role: "care" },
      refId: id!,
    };
    instance.socket.onmessage({
      data: JSON.stringify(await encryptMessage(receipt, key)),
    });
    await vi.waitFor(() =>
      expect(storage.states.get("test-room:patient")!.entries).toHaveLength(0),
    );
    expect(instance.client.getDeliveryStatus(id!)).toBe("delivered");
  });
  it("expires Help after 60 seconds without replaying it on reconnect", async () => {
    const storage = new MemoryStorage();
    let now = Date.now();
    const first = client(storage, "patient", () => now);
    const id = await first.client.send("help");
    first.client.disconnect();
    now += HELP_TTL_MS;
    const second = client(storage, "patient", () => now);
    second.socket.open();
    await vi.waitFor(() =>
      expect(second.client.getDeliveryStatus(id!)).toBe("expired"),
    );
    expect(second.socket.sent).toHaveLength(0);
    expect(storage.states.get("test-room:patient")!.entries).toHaveLength(0);
  });
  it("cancels only the referenced queued Help and sends a scoped cancellation", async () => {
    const storage = new MemoryStorage(),
      instance = client(storage);
    const first = await instance.client.send("help"),
      second = await instance.client.send("help");
    const cancelId = await instance.client.send("help_cancel", {
      refId: first!,
    });
    const entries = storage.states.get("test-room:patient")!.entries;
    expect(entries.some((v) => v.id === first)).toBe(false);
    expect(entries.some((v) => v.id === second)).toBe(true);
    const cancel = await decryptMessage(
      entries.find((v) => v.id === cancelId)!.frame,
      key,
      "care",
    );
    expect(cancel.refId).toBe(first);
    expect(instance.client.getDeliveryStatus(first!)).toBe("cancelled");
  });
  it("deduplicates across reload, but sends a new receipt for the repeated frame", async () => {
    const storage = new MemoryStorage(),
      onMessage = vi.fn();
    const message: RelayMessage = {
      id: "help-1",
      type: "help",
      at: Date.now(),
      from: { role: "patient" },
    };
    const frame = JSON.stringify(await encryptMessage(message, key));
    const first = client(storage, "care", undefined, onMessage);
    first.socket.open();
    first.socket.onmessage({ data: frame });
    await vi.waitFor(() => expect(first.socket.sent).toHaveLength(1));
    expect(onMessage).toHaveBeenCalledTimes(1);
    first.client.disconnect();
    const second = client(storage, "care", undefined, onMessage);
    second.socket.open();
    second.socket.onmessage({ data: frame });
    await vi.waitFor(() => expect(second.socket.sent).toHaveLength(1));
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(
      (await decryptMessage(second.socket.sent[0], key, "patient")).refId,
    ).toBe("help-1");
  });
  it("serializes an immediate implicit cancellation against the new Help, not a prior spoken message", async () => {
    const storage = new MemoryStorage(),
      instance = client(storage);
    const previous = await instance.client.send("spoken", spoken);
    // The UI can cancel while Help encryption/storage is still pending.
    const helpPending = instance.client.send("help");
    const cancelPending = instance.client.send("help_cancel");
    const [helpId, cancelId] = await Promise.all([helpPending, cancelPending]);
    const entries = storage.states.get("test-room:patient")!.entries;
    expect(entries.some((entry) => entry.id === previous)).toBe(true);
    expect(entries.some((entry) => entry.id === helpId)).toBe(false);
    const cancellation = await decryptMessage(
      entries.find((entry) => entry.id === cancelId)!.frame,
      key,
      "care",
    );
    expect(cancellation.refId).toBe(helpId);
    expect(cancellation.refId).not.toBe(previous);
    expect(instance.client.getDeliveryStatus(helpId!)).toBe("cancelled");
  });
  it("drops an already expired Help before UI or alarm callbacks", async () => {
    const instance = client(new MemoryStorage(), "care");
    instance.socket.open();
    const frame = await encryptMessage(
      {
        id: "old-help",
        type: "help",
        at: Date.now() - HELP_TTL_MS,
        from: { role: "patient" },
      },
      key,
    );
    instance.socket.onmessage({ data: JSON.stringify(frame) });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(instance.onMessage).not.toHaveBeenCalled();
    expect(instance.socket.sent).toHaveLength(0);
  });
  it("keeps rooms isolated and bounds the two message lifetimes", async () => {
    const storage = new MemoryStorage(),
      now = Date.now();
    const a = new DurableOutbox("a:patient", storage, () => now),
      b = new DurableOutbox("b:patient", storage, () => now);
    const entry: OutboxEntry = {
      id: "1",
      type: "spoken",
      at: now,
      expiresAt: now + SPOKEN_TTL_MS,
      frame: "ciphertext",
    };
    await a.add(entry);
    expect((await b.pending()).entries).toHaveLength(0);
    expect(messageIsFresh("spoken", now, now + SPOKEN_TTL_MS - 1)).toBe(true);
    expect(messageIsFresh("spoken", now, now + SPOKEN_TTL_MS)).toBe(false);
    expect(messageIsFresh("help", now, now + HELP_TTL_MS)).toBe(false);
  });
  it("does not resend an entire backlog when a new message is sent", async () => {
    const storage = new MemoryStorage(),
      instance = client(storage);
    instance.socket.open();
    await instance.client.send("spoken", spoken);
    await instance.client.send("spoken", {
      ...spoken,
      text: "Thank you.",
      gloss_en: "Thank you.",
    });
    expect(instance.socket.sent).toHaveLength(2);
  });
});
