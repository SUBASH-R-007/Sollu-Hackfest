/** All browser APIs capable of making sound are confined to this directory. */
export type AudioSource = "recording" | "device" | "tone";
export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
}
export interface OutputOptions {
  signal: AbortSignal;
  deadline: number;
  volume: number;
  rate?: number;
  onStart: (source: AudioSource) => void;
}

export class OutputError extends Error {
  constructor(
    public readonly code: "unavailable" | "expired" | "cancelled" | "failed",
  ) {
    super(code);
  }
}

export interface AudioOutput {
  now(): number;
  pathname(): string;
  voices(lang?: string): VoiceInfo[];
  device(text: string, lang: string, options: OutputOptions): Promise<void>;
  recording(blob: Blob, options: OutputOptions): Promise<void>;
  tone(options: OutputOptions): Promise<void>;
  unlock(): Promise<boolean>;
  stop(): void;
}

export function languageMatches(requested: string, available: string): boolean {
  return (
    requested.toLowerCase().split("-")[0] ===
    available.toLowerCase().split("-")[0]
  );
}

export class BrowserAudioOutput implements AudioOutput {
  private context: AudioContext | undefined;
  private currentNodes = new Set<AudioScheduledSourceNode>();
  private speechGeneration = 0;

  now(): number {
    return performance.now();
  }
  pathname(): string {
    return typeof location === "undefined" ? "" : location.pathname;
  }

  voices(lang?: string): VoiceInfo[] {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    return window.speechSynthesis
      .getVoices()
      .filter((voice) => !lang || languageMatches(lang, voice.lang))
      .map(({ name, lang: voiceLang, localService }) => ({
        name,
        lang: voiceLang,
        localService,
      }));
  }

  private synthesisVoice(lang: string): SpeechSynthesisVoice | undefined {
    if (typeof window === "undefined" || !window.speechSynthesis)
      return undefined;
    return window.speechSynthesis
      .getVoices()
      .filter((voice) => languageMatches(lang, voice.lang))
      .sort((a, b) => Number(b.localService) - Number(a.localService))[0];
  }

  private assertReady(options: OutputOptions): void {
    if (options.signal.aborted) throw new OutputError("cancelled");
    if (this.now() >= options.deadline) throw new OutputError("expired");
  }

  device(text: string, lang: string, options: OutputOptions): Promise<void> {
    const voice = this.synthesisVoice(lang);
    if (!voice) return Promise.reject(new OutputError("unavailable"));
    return new Promise((resolve, reject) => {
      try {
        this.assertReady(options);
      } catch (error) {
        reject(error);
        return;
      }
      const generation = ++this.speechGeneration;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.volume = options.volume;
      utterance.rate = options.rate ?? 0.9;
      let settled = false;
      let started = false;
      const finish = (error?: OutputError) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        options.signal.removeEventListener("abort", cancel);
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => {
        finish(new OutputError("cancelled"));
        if (generation === this.speechGeneration)
          window.speechSynthesis.cancel();
      };
      // Browsers may defer native speech. Cancel the queued utterance at the deadline.
      const startTimer = setTimeout(
        () => {
          if (!started) {
            finish(new OutputError("expired"));
            if (generation === this.speechGeneration)
              window.speechSynthesis.cancel();
          }
        },
        Math.max(0, options.deadline - this.now()),
      );
      options.signal.addEventListener("abort", cancel, { once: true });
      utterance.onstart = () => {
        // A late event from an already cancelled utterance must not cancel a newer one.
        if (generation !== this.speechGeneration) {
          finish(new OutputError("cancelled"));
          return;
        }
        if (settled) {
          window.speechSynthesis.cancel();
          return;
        }
        try {
          this.assertReady(options);
        } catch (error) {
          finish(
            error instanceof OutputError ? error : new OutputError("failed"),
          );
          window.speechSynthesis.cancel();
          return;
        }
        started = true;
        clearTimeout(startTimer);
        options.onStart("device");
      };
      utterance.onend = () =>
        finish(started ? undefined : new OutputError("failed"));
      utterance.onerror = () => finish(new OutputError("failed"));
      window.speechSynthesis.speak(utterance);
    });
  }

  private getContext(): AudioContext {
    if (!this.context) {
      if (typeof window === "undefined" || !window.AudioContext)
        throw new OutputError("unavailable");
      this.context = new window.AudioContext();
    }
    return this.context;
  }

  async unlock(): Promise<boolean> {
    try {
      const context = this.getContext();
      if (context.state === "suspended") await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }

  async recording(blob: Blob, options: OutputOptions): Promise<void> {
    this.assertReady(options);
    const context = this.getContext();
    const resumed =
      context.state === "running" ? Promise.resolve() : context.resume();
    const bytes = await blob.arrayBuffer();
    this.assertReady(options);
    const buffer = await context.decodeAudioData(bytes);
    await resumed;
    this.assertReady(options);
    if (context.state !== "running") throw new OutputError("unavailable");
    const source = context.createBufferSource();
    source.buffer = buffer;
    await this.playNode(source, context, options, "recording");
  }

  async tone(options: OutputOptions): Promise<void> {
    this.assertReady(options);
    const context = this.getContext();
    if (context.state === "suspended") await context.resume();
    this.assertReady(options);
    if (context.state !== "running") throw new OutputError("unavailable");
    const source = context.createOscillator();
    source.type = "sine";
    source.frequency.value = 660;
    await this.playNode(source, context, options, "tone", 0.7);
  }

  private playNode(
    source: AudioScheduledSourceNode,
    context: AudioContext,
    options: OutputOptions,
    kind: AudioSource,
    duration?: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.assertReady(options);
      } catch (error) {
        reject(error);
        return;
      }
      const gain = context.createGain();
      gain.gain.value = kind === "tone" ? options.volume * 0.2 : options.volume;
      source.connect(gain).connect(context.destination);
      this.currentNodes.add(source);
      let settled = false;
      const finish = (error?: OutputError) => {
        if (settled) return;
        settled = true;
        options.signal.removeEventListener("abort", cancel);
        this.currentNodes.delete(source);
        source.disconnect();
        gain.disconnect();
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => {
        try {
          source.stop();
        } catch {
          /* Already stopped. */
        }
        finish(new OutputError("cancelled"));
      };
      options.signal.addEventListener("abort", cancel, { once: true });
      source.onended = () => finish();
      try {
        this.assertReady(options);
        source.start();
        if (duration) source.stop(context.currentTime + duration);
        options.onStart(kind);
      } catch (error) {
        finish(
          error instanceof OutputError ? error : new OutputError("failed"),
        );
      }
    });
  }

  stop(): void {
    this.speechGeneration += 1;
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
    for (const source of this.currentNodes) {
      try {
        source.stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.currentNodes.clear();
  }
}
