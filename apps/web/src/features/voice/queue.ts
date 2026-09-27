import { VoiceCache } from "./cache";

export type VoicePriority =
  "tapped" | "first-card" | "other-card" | "pre-generation";
const priorities: Record<VoicePriority, number> = {
  tapped: 0,
  "first-card": 1,
  "other-card": 2,
  "pre-generation": 3,
};

export class RetryAfterError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Voice provider is busy.");
  }
}

export function retryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return 1_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 1_000 : Math.max(0, date - now);
}

function abortError(): Error {
  return new DOMException("Voice work cancelled.", "AbortError");
}

function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, milliseconds);
    const cancel = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}

interface Work {
  order: number;
  priority: VoicePriority;
  controller: AbortController;
  run: (signal: AbortSignal) => Promise<Blob>;
  resolve: (blob: Blob) => void;
  reject: (error: unknown) => void;
  dispose: () => void;
}

/** Fetch-only queue. It has no playback dependency and never uses a tap ticket. */
export class VoiceQueue {
  private waiting: Work[] = [];
  private active = new Set<Work>();
  private sequence = 0;

  constructor(private readonly concurrency = 2) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2)
      throw new Error("Voice concurrency must be 1 or 2.");
  }

  enqueue(
    run: Work["run"],
    priority: VoicePriority,
    signal?: AbortSignal,
  ): Promise<Blob> {
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const forwardAbort = () => controller.abort();
      signal?.addEventListener("abort", forwardAbort, { once: true });
      const work: Work = {
        order: ++this.sequence,
        priority,
        controller,
        run,
        resolve,
        reject,
        dispose: () => signal?.removeEventListener("abort", forwardAbort),
      };
      controller.signal.addEventListener(
        "abort",
        () => {
          const index = this.waiting.indexOf(work);
          if (index >= 0) {
            this.waiting.splice(index, 1);
            work.dispose();
          }
          // The caller settles immediately even if a provider ignores AbortSignal.
          // execute still discards that provider's eventual result before returning it.
          reject(abortError());
        },
        { once: true },
      );
      this.waiting.push(work);
      this.drain();
    });
  }

  cancelAll(): void {
    for (const work of [...this.waiting, ...this.active])
      work.controller.abort();
  }

  private drain(): void {
    this.waiting.sort(
      (a, b) =>
        priorities[a.priority] - priorities[b.priority] || a.order - b.order,
    );
    while (this.active.size < this.concurrency && this.waiting.length > 0) {
      const work = this.waiting.shift()!;
      this.active.add(work);
      void this.execute(work).finally(() => {
        this.active.delete(work);
        work.dispose();
        this.drain();
      });
    }
  }

  private async execute(work: Work): Promise<void> {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (work.controller.signal.aborted) throw abortError();
        try {
          const blob = await work.run(work.controller.signal);
          if (work.controller.signal.aborted) throw abortError();
          work.resolve(blob);
          return;
        } catch (error) {
          if (
            !(error instanceof RetryAfterError) ||
            attempt === 2 ||
            work.controller.signal.aborted
          )
            throw error;
          await pause(error.retryAfterMs, work.controller.signal);
        }
      }
    } catch (error) {
      work.reject(error);
    }
  }
}

/** Completed prefetch only fills the cache. A fresh local activation is needed to play it. */
export async function prefetchVoice(
  queue: VoiceQueue,
  cache: VoiceCache,
  key: string,
  fetchAudio: (signal: AbortSignal) => Promise<Blob>,
  priority: Exclude<VoicePriority, "tapped"> = "other-card",
  signal?: AbortSignal,
): Promise<boolean> {
  if (cache.get(key)) return true;
  const blob = await queue.enqueue(fetchAudio, priority, signal);
  return cache.put(key, blob);
}
