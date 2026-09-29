import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { VoiceRevocations } from "../src/lib/revocations";

const directories: string[] = [];
const temporary = () => {
  const directory = mkdtempSync(join(tmpdir(), "sollu-revocations-"));
  directories.push(directory);
  return directory;
};
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("voice revocations", () => {
  it("keep a deleted voice deleted after a restart", () => {
    const directory = temporary();
    const now = 1_000_000;
    new VoiceRevocations(directory, now).add("voice-a", now + 60_000);
    const restarted = new VoiceRevocations(directory, now);
    expect(restarted.has("voice-a")).toBe(true);
  });

  it("forget only entries whose grants have expired", () => {
    const directory = temporary();
    const store = new VoiceRevocations(directory, 0);
    store.add("old", 10);
    store.add("current", 1_000);
    store.prune(500);
    const restarted = new VoiceRevocations(directory, 500);
    expect(restarted.has("old")).toBe(false);
    expect(restarted.has("current")).toBe(true);
  });

  it("refuse to start from a corrupt list instead of re-enabling voices", () => {
    const directory = temporary();
    writeFileSync(join(directory, "revoked-voices.json"), "{not json");
    expect(() => new VoiceRevocations(directory)).toThrow();
  });

  it("stay in memory when no data directory is configured", () => {
    const store = new VoiceRevocations(undefined);
    store.add("voice-b", Date.now() + 1_000);
    expect(store.has("voice-b")).toBe(true);
  });
});
