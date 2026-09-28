import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceCache, voiceCacheKey } from "./cache";
import {
  prefetchVoice,
  RetryAfterError,
  retryAfterMs,
  VoiceQueue,
} from "./queue";

afterEach(() => vi.useRealTimers());

describe("exact phrase cache", () => {
  it("never aliases text, language, or voice identity", () => {
    const keys = [
      voiceCacheKey("one", "ta", "Yes"),
      voiceCacheKey("two", "ta", "Yes"),
      voiceCacheKey("one", "en", "Yes"),
      voiceCacheKey("one", "ta", "Yes!"),
    ];
    expect(new Set(keys).size).toBe(4);
  });

  it("evicts least recently used audio while retaining pinned Help", () => {
    const cache = new VoiceCache(6);
    cache.put("help", new Blob(["12"]), { pinned: true });
    cache.put("old", new Blob(["34"]));
    cache.put("new", new Blob(["56"]));
    cache.get("old");
    cache.put("next", new Blob(["78"]));
    expect(cache.get("help")).toBeDefined();
    expect(cache.get("old")).toBeDefined();
    expect(cache.get("new")).toBeUndefined();
    expect(cache.bytes).toBe(6);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("fetch-only voice queue", () => {
  it("limits concurrency to two and prioritises a selected sentence over waiting prefetch", async () => {
    const queue = new VoiceQueue();
    const starts: string[] = [];
    const finish: Array<() => void> = [];
    const task = (name: string) => async () => {
      starts.push(name);
      return new Promise<Blob>((resolve) => {
        finish.push(() => resolve(new Blob([name])));
      });
    };
    const work = [
      queue.enqueue(task("a"), "pre-generation"),
      queue.enqueue(task("b"), "pre-generation"),
      queue.enqueue(task("background"), "pre-generation"),
      queue.enqueue(task("picked"), "tapped"),
    ];
    expect(starts).toEqual(["a", "b"]);
    finish[0]!();
    await vi.waitFor(() => expect(starts).toEqual(["a", "b", "picked"]));
    finish[1]!();
    finish[2]!();
    await vi.waitFor(() =>
      expect(starts).toEqual(["a", "b", "picked", "background"]),
    );
    finish[3]!();
    await Promise.all(work);
  });

  it("aborts active and waiting work with Stop", async () => {
    const queue = new VoiceQueue(1);
    const active = queue.enqueue(
      (signal) =>
        new Promise<Blob>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError")),
          );
        }),
      "first-card",
    );
    const waitingRun = vi.fn(async () => new Blob(["never"]));
    const waiting = queue.enqueue(waitingRun, "other-card");
    const all = Promise.allSettled([active, waiting]);
    queue.cancelAll();
    expect((await all).map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(waitingRun).not.toHaveBeenCalled();
  });

  it("honours Retry-After before retrying and puts completed prefetch only into cache", async () => {
    vi.useFakeTimers();
    const queue = new VoiceQueue();
    const cache = new VoiceCache();
    const fetchAudio = vi
      .fn()
      .mockRejectedValueOnce(new RetryAfterError(2_000))
      .mockResolvedValue(new Blob(["audio"]));
    const prefetched = prefetchVoice(queue, cache, "candidate", fetchAudio);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchAudio).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(await prefetched).toBe(true);
    expect(fetchAudio).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(1);
  });

  it("parses both HTTP Retry-After formats", () => {
    expect(retryAfterMs("2")).toBe(2_000);
    expect(retryAfterMs("Thu, 01 Jan 1970 00:00:10 GMT", 4_000)).toBe(6_000);
    expect(retryAfterMs("bad")).toBe(1_000);
  });
});
