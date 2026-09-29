import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Deleted voice IDs with their grant expiry (ms). Signed voice grants outlive a
 * restart when SERVER_SECRET is fixed, so withdrawal (I-7) must persist too.
 * Without a data directory (development/tests) the list is memory-only.
 */
export class VoiceRevocations {
  private readonly entries = new Map<string, number>();
  private readonly file?: string;

  constructor(dataDir?: string, now = Date.now()) {
    if (!dataDir) return;
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, "revoked-voices.json");
    try {
      const saved: unknown = JSON.parse(readFileSync(this.file, "utf8"));
      if (saved && typeof saved === "object")
        for (const [id, expiry] of Object.entries(saved))
          if (typeof expiry === "number" && expiry > now)
            this.entries.set(id, expiry);
    } catch (error) {
      // A missing file is a fresh start; anything else must not silently
      // re-enable deleted voices.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  has(id: string) {
    return this.entries.has(id);
  }

  add(id: string, expiry: number) {
    this.entries.set(id, expiry);
    this.persist();
  }

  prune(now = Date.now()) {
    let changed = false;
    for (const [id, expiry] of this.entries)
      if (expiry < now) {
        this.entries.delete(id);
        changed = true;
      }
    if (changed) this.persist();
  }

  private persist() {
    if (!this.file) return;
    const temporary = `${this.file}.tmp`;
    writeFileSync(temporary, JSON.stringify(Object.fromEntries(this.entries)));
    renameSync(temporary, this.file);
  }
}
