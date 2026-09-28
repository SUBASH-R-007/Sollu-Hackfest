import { describe, expect, it } from "vitest";
import {
  approveItem,
  mergePersonal,
  reviseItem,
  validatePersonalItem,
  validatePersonalStore,
  type PersonalWord,
} from "./model";
import {
  encryptBackup,
  inspectEncryptedBackup,
  validateBackup,
  type BackupPayload,
} from "./backup";

const word: PersonalWord = {
  id: "word1",
  kind: "word",
  title: "My tea",
  text: "I want tea.",
  category: "Drink",
  lang: "en",
  pinned: false,
  revision: 1,
  updatedAt: 1000,
};
const payload = (): BackupPayload => ({
  format: "sollu-personal",
  version: 1,
  createdAt: 2000,
  personal: { version: 1, items: [approveItem(word, 1, 1001)] },
  tables: {
    attempts: [],
    consents: [],
    recordings: [],
    phrases: [],
    memories: [],
    substitutions: [],
  },
});

describe("personal patient approval", () => {
  it("accepts legacy words and bounded search hints, but rejects oversized aliases and invalid visibility", () => {
    expect(validatePersonalItem(word)).toEqual(word);
    const enriched = {
      ...word,
      aliases: ["chai", "tea cup"],
      description: "My usual evening drink",
      hidden: true,
    };
    expect(validatePersonalItem(enriched)).toEqual(enriched);
    expect(() =>
      validatePersonalItem({
        ...word,
        aliases: Array.from({ length: 13 }, (_, index) => `name${index}`),
      }),
    ).toThrow(/12/);
    expect(() =>
      validatePersonalItem({ ...word, aliases: ["x".repeat(81)] }),
    ).toThrow(/80/);
    expect(() =>
      validatePersonalItem({ ...word, description: "x".repeat(241) }),
    ).toThrow(/240/);
    expect(() => validatePersonalItem({ ...word, hidden: "false" })).toThrow(
      /visibility/,
    );
  });
  it("invalidates approval when exact words change and rejects approval of an old revision", () => {
    const approved = approveItem(word, 1, 1001);
    if (approved.kind !== "word") throw new Error("Expected a word");
    const edited = reviseItem({ ...approved, text: "No tea, please." }, 2000);
    expect(edited.approvedAt).toBeUndefined();
    expect(edited.revision).toBe(2);
    expect(() => approveItem(edited, 1)).toThrow(/changed/);
    expect(approveItem(edited, 2, 2001).approvedAt).toBe(2001);
  });
  it("keeps existing content during merge and sends additions back to patient review", () => {
    const incoming = approveItem(
      { ...word, id: "word2", text: "Please give me time." },
      1,
    );
    const result = mergePersonal(
      { version: 1, items: [word] },
      {
        version: 1,
        items: [{ ...word, text: "Conflicting replacement" }, incoming],
      },
    );
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(
      result.store.items[0].kind === "word" && result.store.items[0].text,
    ).toBe(word.text);
    expect(result.store.items[1].approvedAt).toBeUndefined();
  });
  it("rejects duplicate IDs and unsupported media instead of partially saving", () => {
    expect(() =>
      validatePersonalStore({ version: 1, items: [word, word] }),
    ).toThrow(/Duplicate/);
    expect(() =>
      validatePersonalItem({
        ...word,
        kind: "scene",
        image: new Blob(["<svg/>"], { type: "image/svg+xml" }),
        choices: [{ id: "c", label: "Tea", text: "Tea please", x: 50, y: 50 }],
      }),
    ).toThrow(/photo/);
    expect(() =>
      validatePersonalItem({ ...word, kind: "story", lines: [""] }),
    ).toThrow(/short lines/);
  });
});

describe("encrypted portable backup", () => {
  it("round-trips local photos and produces a review without importing", async () => {
    const input = payload();
    input.personal.items.push({
      id: "photo1",
      kind: "scene",
      title: "My kitchen",
      lang: "en",
      pinned: false,
      revision: 1,
      updatedAt: 1000,
      image: new Blob([new Uint8Array([255, 216, 255, 224, 1, 2, 3])], {
        type: "image/jpeg",
      }),
      choices: [{ id: "c1", label: "Tea", text: "I want tea.", x: 25, y: 75 }],
    });
    const file = await encryptBackup(input, "our long passphrase");
    const raw = await file.text();
    expect(raw).not.toContain("I want tea");
    const preview = await inspectEncryptedBackup(file, "our long passphrase");
    expect(preview.counts["Personal cards"]).toBe(2);
    const scene = preview.payload.personal.items[1];
    expect(scene.kind).toBe("scene");
    if (scene.kind === "scene")
      expect(new Uint8Array(await scene.image.arrayBuffer())).toEqual(
        new Uint8Array([255, 216, 255, 224, 1, 2, 3]),
      );
  });
  it("uses fresh randomness and rejects wrong keys and changed ciphertext", async () => {
    const first = await encryptBackup(payload(), "our long passphrase"),
      second = await encryptBackup(payload(), "our long passphrase");
    expect(await first.text()).not.toBe(await second.text());
    await expect(
      inspectEncryptedBackup(first, "a different passphrase"),
    ).rejects.toThrow(/incorrect|changed/);
    const tampered = JSON.parse(await first.text());
    tampered.ciphertext =
      (tampered.ciphertext[0] === "A" ? "B" : "A") +
      tampered.ciphertext.slice(1);
    await expect(
      inspectEncryptedBackup(
        new Blob([JSON.stringify(tampered)]),
        "our long passphrase",
      ),
    ).rejects.toThrow(/incorrect|changed/);
  });
  it("enforces the envelope and passphrase limits before decryption", async () => {
    await expect(encryptBackup(payload(), "short")).rejects.toThrow(/12/);
    await expect(
      inspectEncryptedBackup(
        new Blob([JSON.stringify({ format: "sollu-encrypted", version: 2 })]),
        "our long passphrase",
      ),
    ).rejects.toThrow(/Unsupported/);
  });
  it("rejects oversized photo collections before allocating their base64 payload", async () => {
    const input = payload();
    const image = new Blob([new Uint8Array(2 * 1024 * 1024)], {
      type: "image/jpeg",
    });
    for (let index = 0; index < 20; index++)
      input.personal.items.push({
        id: `scene${index}`,
        kind: "scene",
        title: "Photo",
        lang: "en",
        pinned: false,
        revision: 1,
        updatedAt: 1000,
        image,
        choices: [
          {
            id: "choice",
            label: "Photo",
            text: "Look at this photo.",
            x: 50,
            y: 50,
          },
        ],
      });
    await expect(encryptBackup(input, "our long passphrase")).rejects.toThrow(
      /25 MB/,
    );
  });
  it("rejects recordings that lack consent or bind different exact words", () => {
    const input = payload();
    input.tables.recordings.push({
      id: "en:wrong",
      text: "I want tea.",
      lang: "en",
      consentId: "missing",
      createdAt: 1000,
      blob: new Blob(["voice"], { type: "audio/webm" }),
    });
    expect(() => validateBackup(input)).toThrow(/recording/);
  });
  it("does not restore signatures or unknown connection credentials", () => {
    const input = payload();
    input.tables.phrases.push({
      id: "p1",
      lang: "en",
      pinned: false,
      candidate: {
        text: "Tea please.",
        gloss_en: "Tea please.",
        intent: "request tea",
        reading: "tea",
        keyword: "Tea",
        urgency: "none",
        icon: "☕",
        sig: "old-device-proof",
      },
    });
    const result = validateBackup({ ...input, pairing: { grant: "secret" } });
    expect(result).not.toHaveProperty("pairing");
    expect(result.tables.phrases[0].candidate).not.toHaveProperty("sig");
  });
  it("requires fresh local approval for imported memories and corrections", () => {
    const input = payload();
    input.tables.memories.push({
      id: "memory1",
      fragmentRaw: "cup",
      fragmentKey: "cup",
      reading: "tea",
      sentence: "Tea please.",
      lang: "en",
      timeBucket: "evening",
      placeLabel: "home",
      addresseeId: "priya",
      count: 4,
      firstAt: 1000,
      lastAt: 2000,
      confirmed: true,
      sig: "old-proof",
      candidate: {
        text: "Tea please.",
        gloss_en: "Tea please.",
        intent: "request tea",
        reading: "tea",
        keyword: "Tea",
        urgency: "none",
        icon: "☕",
        sig: "nested-old-proof",
      },
    });
    input.tables.substitutions.push({
      id: "correction1",
      heard: "cup",
      means: "tea",
      count: 2,
      lastAt: 2000,
      confirmed: true,
      lang: "en",
      place: "home",
      addresseeId: "priya",
    });
    const result = validateBackup(input);
    expect(result.tables.memories[0].confirmed).toBe(false);
    expect(result.tables.memories[0]).not.toHaveProperty("sig");
    expect(result.tables.memories[0].candidate).not.toHaveProperty("sig");
    expect(result.tables.substitutions[0].confirmed).toBe(false);
  });
});
