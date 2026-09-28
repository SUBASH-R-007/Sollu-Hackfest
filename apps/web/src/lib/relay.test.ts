import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptMessage,
  encryptMessage,
  parseRelayMessage,
  RelayClient,
  type RelayMessage,
} from "./relay";

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(42)));
const base = {
  id: "message-1",
  at: Date.now(),
  from: { role: "patient" as const, contactId: "priya" },
};
const spoken: RelayMessage = {
  ...base,
  type: "spoken",
  text: "தண்ணி வேணும்.",
  gloss_en: "I want water.",
  lang: "ta",
  urgency: "none",
};
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("end-to-end relay encryption and schema", () => {
  it("round-trips encrypted text and uses a fresh 96-bit IV on each message", async () => {
    const first = await encryptMessage(spoken, key),
      second = await encryptMessage(spoken, key);
    expect(first.iv).not.toBe(second.iv);
    expect(atob(first.iv).length).toBe(12);
    expect(JSON.stringify(first)).not.toContain(spoken.text);
    expect(JSON.stringify(first)).not.toContain("water");
    expect(await decryptMessage(JSON.stringify(first), key, "care")).toEqual(
      spoken,
    );
  });
  it("rejects changed ciphertext, wrong keys and malformed envelopes", async () => {
    const encrypted = await encryptMessage(spoken, key);
    const bytes = Uint8Array.from(atob(encrypted.ciphertext), (c) =>
      c.charCodeAt(0),
    );
    bytes[5] ^= 1;
    await expect(
      decryptMessage(
        JSON.stringify({
          ...encrypted,
          ciphertext: btoa(String.fromCharCode(...bytes)),
        }),
        key,
      ),
    ).rejects.toThrow();
    await expect(
      decryptMessage(
        JSON.stringify(encrypted),
        btoa(String.fromCharCode(...new Uint8Array(32).fill(43))),
      ),
    ).rejects.toThrow();
    await expect(
      decryptMessage(JSON.stringify({ ...encrypted, iv: btoa("bad") }), key),
    ).rejects.toThrow();
    await expect(
      decryptMessage(JSON.stringify({ ...encrypted, text: "plaintext" }), key),
    ).rejects.toThrow();
    await expect(decryptMessage("x".repeat(17000), key)).rejects.toThrow();
  });
  it("enforces sender-role/type permissions and opposite recipient role", () => {
    expect(() => parseRelayMessage(spoken, "patient")).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, from: { role: "care" } }),
    ).toThrow();
    expect(() =>
      parseRelayMessage({ ...base, type: "ack", refId: "help-1" }),
    ).toThrow();
    expect(() =>
      parseRelayMessage({ ...base, type: "speak", text: "Unauthorized" }),
    ).toThrow();
    expect(
      parseRelayMessage(
        { ...base, type: "ack", from: { role: "care" }, refId: "help-1" },
        "patient",
      ).type,
    ).toBe("ack");
    expect(parseRelayMessage({ ...base, type: "help" }, "care").type).toBe(
      "help",
    );
  });
  it("requires receipt references and rejects overlong, future or unsupported content", () => {
    expect(() =>
      parseRelayMessage({ ...base, type: "delivered", from: { role: "care" } }),
    ).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, text: "x".repeat(501) }),
    ).toThrow();
    expect(() => parseRelayMessage({ ...spoken, lang: "hi" })).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, urgency: "immediate" }),
    ).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, at: Date.now() + 120_000 }),
    ).toThrow();
    expect(() => parseRelayMessage({ ...spoken, at: NaN })).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, playImmediately: true }),
    ).toThrow();
    expect(() =>
      parseRelayMessage({ ...spoken, from: { role: "patient", force: true } }),
    ).toThrow();
  });
  it("does not call the application after a pending decrypt outlives disconnect", async () => {
    class FakeSocket {
      static instances: FakeSocket[] = [];
      static OPEN = 1;
      readyState = 1;
      onopen: () => void = () => {};
      onclose: () => void = () => {};
      onerror: () => void = () => {};
      onmessage: (event: { data: string }) => void = () => {};
      constructor() {
        FakeSocket.instances.push(this);
      }
      close() {
        this.readyState = 3;
        this.onclose();
      }
      send() {}
    }
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("location", { protocol: "http:", host: "localhost:5173" });
    const onMessage = vi.fn();
    const client = new RelayClient(
      {
        roomId: "room",
        grant: "grant",
        role: "care",
        key,
        name: "Priya",
        contactId: "priya",
      },
      onMessage,
      vi.fn(),
    );
    client.connect();
    const encrypted = await encryptMessage(spoken, key);
    FakeSocket.instances[0].onmessage({ data: JSON.stringify(encrypted) });
    client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onMessage).not.toHaveBeenCalled();
  });
});
