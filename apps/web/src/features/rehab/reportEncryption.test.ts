import { describe, expect, it } from "vitest";
import { createDefaultPlan, createDefaultProfile } from "./model";
import { buildReport, type TherapyReport } from "./report";
import {
  decryptTherapyReport,
  encryptTherapyReport,
  MAX_ENCRYPTED_REPORT_BYTES,
} from "./reportEncryption";

const passphrase = "four fictional private words";
const report = (): TherapyReport =>
  buildReport({
    profile: {
      ...createDefaultProfile(),
      goals: ["Private goal for a fictional person"],
    },
    plan: createDefaultPlan(),
    sessions: [],
    reviews: [],
    attempts: [],
    corrections: [],
    participant: "PRIVATE-PARTICIPANT",
    from: "2026-09-01",
    to: "2026-09-30",
    includeContent: true,
  });
async function envelope() {
  return JSON.parse(
    await (await encryptTherapyReport(report(), passphrase)).text(),
  );
}
const fileOf = (value: unknown) =>
  new Blob([JSON.stringify(value)], { type: "application/json" });

describe("encrypted rehabilitation report transfer", () => {
  it("round trips a validated report without exposing participant, dates or health text in the envelope", async () => {
    const original = report();
    const file = await encryptTherapyReport(original, passphrase);
    const text = await file.text();
    expect(text).not.toContain("PRIVATE-PARTICIPANT");
    expect(text).not.toContain("Private goal");
    expect(text).not.toContain("2026-09");
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(
      [
        "cipher",
        "ciphertext",
        "format",
        "iterations",
        "iv",
        "kdf",
        "salt",
        "version",
      ].sort(),
    );
    expect(await decryptTherapyReport(file, passphrase)).toEqual(original);
  });
  it("uses independent random salt and IV on every export", async () => {
    const first = await envelope(),
      second = await envelope();
    expect(first.salt).not.toBe(second.salt);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
  it("rejects the wrong passphrase and authenticated ciphertext tampering", async () => {
    const value = await envelope();
    await expect(
      decryptTherapyReport(fileOf(value), "different fictional passphrase"),
    ).rejects.toThrow(/incorrect or.*changed/);
    const binary = atob(value.ciphertext);
    value.ciphertext = btoa(
      String.fromCharCode(binary.charCodeAt(0) ^ 1) + binary.slice(1),
    );
    await expect(
      decryptTherapyReport(fileOf(value), passphrase),
    ).rejects.toThrow(/incorrect or.*changed/);
  });
  it("rejects altered salt and IV without returning a preview", async () => {
    const value = await envelope();
    for (const field of ["salt", "iv"] as const) {
      const binary = atob(value[field]);
      const changed = btoa(
        String.fromCharCode(binary.charCodeAt(0) ^ 1) + binary.slice(1),
      );
      await expect(
        decryptTherapyReport(
          fileOf({ ...value, [field]: changed }),
          passphrase,
        ),
      ).rejects.toThrow(/incorrect or.*changed/);
    }
  });
  it("rejects unsupported parameters, malformed lengths and extra plaintext metadata before expensive derivation", async () => {
    const value = await envelope();
    for (const extra of [
      { version: 2 },
      { iterations: 1 },
      { iterations: 9_999_999_999 },
      { cipher: "AES-CBC" },
      { participant: "private" },
      { salt: "AAAA" },
      { iv: "AAAA" },
      { ciphertext: "???" },
    ])
      await expect(
        decryptTherapyReport(fileOf({ ...value, ...extra }), passphrase),
      ).rejects.toThrow();
  });
  it("bounds file and passphrase sizes and rejects invalid report data at encryption", async () => {
    await expect(
      decryptTherapyReport(
        new Blob([new Uint8Array(MAX_ENCRYPTED_REPORT_BYTES + 1)]),
        passphrase,
      ),
    ).rejects.toThrow(/3 MB/);
    await expect(
      decryptTherapyReport(new Blob([]), passphrase),
    ).rejects.toThrow();
    for (const invalid of ["short", " ".repeat(20), "x".repeat(513)])
      await expect(encryptTherapyReport(report(), invalid)).rejects.toThrow(
        /12–512/,
      );
    await expect(
      encryptTherapyReport(
        { ...report(), version: 2 } as unknown as TherapyReport,
        passphrase,
      ),
    ).rejects.toThrow(/format/);
  });
  it("validates authenticated decrypted JSON with the existing report rules", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16)),
      iv = crypto.getRandomValues(new Uint8Array(12));
    const encode = new TextEncoder();
    const base = await crypto.subtle.importKey(
      "raw",
      encode.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", iterations: 600_000, salt },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encode.encode(
          "SolluRehabilitationReport/v1/PBKDF2-SHA256/600000/AES-256-GCM",
        ),
        tagLength: 128,
      },
      key,
      encode.encode(JSON.stringify({ ...report(), from: "2026-02-30" })),
    );
    const toBase64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));
    await expect(
      decryptTherapyReport(
        fileOf({
          format: "sollu-encrypted-rehabilitation-report",
          version: 1,
          kdf: "PBKDF2-SHA256",
          iterations: 600_000,
          cipher: "AES-256-GCM",
          salt: toBase64(salt),
          iv: toBase64(iv),
          ciphertext: toBase64(new Uint8Array(cipher)),
        }),
        passphrase,
      ),
    ).rejects.toThrow(/format/);
  });
});
