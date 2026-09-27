/** Exact strings are intentional: similar sentences must never share a recording. */
export function voiceCacheKey(
  voiceId: string,
  lang: string,
  text: string,
): string {
  return JSON.stringify([voiceId, lang, text]);
}

interface CacheEntry {
  blob: Blob;
  pinned: boolean;
  lastUsed: number;
}

/** Bounded in-memory synthesis cache. Persist consented phrases through the app's device database. */
export class VoiceCache {
  private entries = new Map<string, CacheEntry>();
  private clock = 0;

  constructor(private readonly maximumBytes = 20 * 1024 * 1024) {}

  get(key: string): Blob | undefined {
    const entry = this.entries.get(key);
    if (entry) entry.lastUsed = ++this.clock;
    return entry?.blob;
  }

  put(key: string, blob: Blob, options: { pinned?: boolean } = {}): boolean {
    if (blob.size > this.maximumBytes) return false;
    const previous = this.entries.get(key);
    this.entries.set(key, {
      blob,
      pinned: options.pinned ?? previous?.pinned ?? false,
      lastUsed: ++this.clock,
    });
    let total = this.bytes;
    const victims = [...this.entries.entries()]
      .filter(([entryKey, entry]) => entryKey !== key && !entry.pinned)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    for (const [victimKey, victim] of victims) {
      if (total <= this.maximumBytes) break;
      this.entries.delete(victimKey);
      total -= victim.blob.size;
    }
    if (total > this.maximumBytes) {
      this.entries.delete(key);
      if (previous) this.entries.set(key, previous);
      return false;
    }
    return true;
  }

  get bytes(): number {
    return [...this.entries.values()].reduce(
      (sum, entry) => sum + entry.blob.size,
      0,
    );
  }
  get size(): number {
    return this.entries.size;
  }
  delete(key: string): void {
    this.entries.delete(key);
  }
  clear(): void {
    this.entries.clear();
  }
}
