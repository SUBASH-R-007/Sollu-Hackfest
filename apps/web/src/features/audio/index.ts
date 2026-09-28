import {
  BrowserAudioOutput,
  OutputError,
  type AudioOutput,
  type AudioSource,
  type OutputOptions,
} from "./browserOutput";
import {
  TAP_WINDOW_MS,
  TapGate,
  type AudioChannel,
  type TapContext,
  type TapTicket,
} from "./tapGate";

export type { AudioChannel, TapContext, TapTicket } from "./tapGate";
export type { AudioSource, VoiceInfo } from "./browserOutput";

export interface AudioStart {
  source: AudioSource;
  atMs: number;
}
export interface AudioResult {
  status: "completed" | "unavailable" | "expired" | "cancelled" | "failed";
  source?: AudioSource;
  firstAudioMs?: number;
}
export interface SpeakOptions {
  text: string;
  lang: string;
  ticket: TapTicket | null;
  channel?: Exclude<AudioChannel, "alarm">;
  /** Only the recording of this EXACT sentence may be supplied; never a voice-clone sample. */
  recording?: Blob;
  onStart?: (start: AudioStart) => void;
  onEnd?: () => void;
}

export class AudioController {
  private pending: AbortController | undefined;
  private alertsEnabled = false;
  private volume = 1;
  private rate = 0.9;
  private cancelPendingWork = new Set<() => void>();

  constructor(
    private readonly output: AudioOutput = new BrowserAudioOutput(),
    private readonly gate: TapGate = new TapGate(() => output.now()),
  ) {}

  createTap(event: Event, text: string, context: TapContext): TapTicket | null {
    const ticket = this.gate.create(event, text, context);
    if (ticket) this.cancelCurrent();
    return ticket;
  }

  getVoices(lang?: string) {
    return this.output.voices(lang);
  }

  /** Browser voices can load later; callers may retry after changing language or opening Studio. */
  getVoiceStatus(lang: string): "available" | "unavailable" {
    return this.output.voices(lang).length > 0 ? "available" : "unavailable";
  }

  setVolume(value: number): void {
    this.volume = Math.max(0.1, Math.min(1, value));
  }
  setRate(value: number): void {
    this.rate = Math.max(0.6, Math.min(1.2, value));
  }

  /** Register synthesis/prefetch queues so Stop and a newer tap cancel their pending work too. */
  registerPendingWork(cancel: () => void): () => void {
    this.cancelPendingWork.add(cancel);
    return () => this.cancelPendingWork.delete(cancel);
  }

  private cancelCurrent(): void {
    this.pending?.abort();
    this.pending = undefined;
    this.output.stop();
    for (const cancel of this.cancelPendingWork) cancel();
  }

  stop(): void {
    this.gate.invalidate();
    this.cancelCurrent();
  }

  /** Explicit review of a local evidence clip; never speaks as the patient. */
  async reviewMedia(options: {
    element: HTMLMediaElement;
    blob: Blob;
    text: string;
    ticket: TapTicket | null;
  }): Promise<AudioResult> {
    const { element, blob, text, ticket } = options;
    if (!ticket || !this.gate.consume(ticket, text, "review"))
      return {
        status:
          ticket && !this.gate.isFresh(ticket) ? "expired" : "unavailable",
      };
    if (!blob.size || !/^(audio|video)\//u.test(blob.type))
      return { status: "unavailable" };
    this.cancelCurrent();
    const controller = new AbortController();
    this.pending = controller;
    let url: string | undefined;
    let started = false;
    try {
      url = URL.createObjectURL(blob);
      element.autoplay = false;
      element.srcObject = null;
      element.src = url;
      // Unmute only after the actual playing event passes the tap freshness check.
      element.muted = true;
      element.volume = this.volume;
      return await new Promise<AudioResult>((resolve) => {
        let finished = false;
        const finish = (status: AudioResult["status"]) => {
          if (finished) return;
          finished = true;
          clearTimeout(deadline);
          controller.signal.removeEventListener("abort", cancel);
          element.muted = true;
          element.pause();
          element.onplaying = element.onended = element.onerror = null;
          resolve({ status });
        };
        const cancel = () => finish("cancelled");
        const deadline = setTimeout(
          () => {
            if (!started) finish("expired");
          },
          Math.max(0, TAP_WINDOW_MS - (this.output.now() - ticket.issuedAt)),
        );
        controller.signal.addEventListener("abort", cancel, {
          once: true,
        });
        element.onplaying = () => {
          if (finished || !this.gate.isFresh(ticket)) finish("expired");
          else {
            started = true;
            clearTimeout(deadline);
            element.muted = false;
          }
        };
        element.onended = () => finish(started ? "completed" : "failed");
        element.onerror = () => finish("failed");
        try {
          void element.play().catch(() => finish("failed"));
        } catch {
          finish("failed");
        }
      });
    } catch {
      return { status: controller.signal.aborted ? "cancelled" : "failed" };
    } finally {
      // A superseding tap may reuse this element before this promise resumes.
      // Old cleanup must not erase the newer clip or its event handlers.
      if (url && element.src === url) {
        element.muted = true;
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
      if (url) URL.revokeObjectURL(url);
      if (this.pending === controller) this.pending = undefined;
    }
  }

  async speak(options: SpeakOptions): Promise<AudioResult> {
    return this.play(options, false);
  }

  /** Exact Help phrase only, supplied by the caller from the canonical quick-phrase list. */
  async playHelp(options: Omit<SpeakOptions, "channel">): Promise<AudioResult> {
    return this.play({ ...options, channel: "speak" }, true);
  }

  private async play(
    options: SpeakOptions,
    help: boolean,
  ): Promise<AudioResult> {
    const channel = options.channel ?? "speak";
    const ticket = options.ticket;
    if (channel === "baseline" && this.output.pathname() !== "/baseline")
      return { status: "unavailable" };
    if (!ticket || !this.gate.consume(ticket, options.text, channel)) {
      return {
        status:
          ticket && !this.gate.isFresh(ticket) ? "expired" : "unavailable",
      };
    }
    this.cancelCurrent();
    const controller = new AbortController();
    this.pending = controller;
    let start: AudioStart | undefined;
    const outputOptions: OutputOptions = {
      signal: controller.signal,
      deadline: ticket.issuedAt + TAP_WINDOW_MS,
      volume: channel === "preview" ? this.volume * 0.65 : this.volume,
      rate: this.rate,
      onStart: (source) => {
        start = { source, atMs: this.output.now() };
        options.onStart?.(start);
      },
    };
    try {
      // Preview and baseline can never use a person's recording.
      const useRecording =
        options.recording && (channel === "speak" || channel === "studio");
      if (useRecording) {
        try {
          await this.output.recording(options.recording!, outputOptions);
        } catch (error) {
          // Studio must not disguise a broken sample as a successful device-voice preview.
          if (controller.signal.aborted) throw error;
          if (!this.gate.isFresh(ticket)) throw new OutputError("expired");
          if (channel === "studio" || start) throw error;
          await this.deviceOrTone(
            options.text,
            options.lang,
            outputOptions,
            help,
          );
        }
      } else
        await this.deviceOrTone(
          options.text,
          options.lang,
          outputOptions,
          help,
        );
      if (controller.signal.aborted) return { status: "cancelled" };
      if (!start) throw new OutputError("failed");
      options.onEnd?.();
      return {
        status: "completed",
        ...(start
          ? { source: start.source, firstAudioMs: start.atMs - ticket.issuedAt }
          : {}),
      };
    } catch (error) {
      return {
        status: controller.signal.aborted
          ? "cancelled"
          : error instanceof OutputError
            ? error.code
            : "failed",
      };
    } finally {
      if (this.pending === controller) this.pending = undefined;
    }
  }

  private async deviceOrTone(
    text: string,
    lang: string,
    options: OutputOptions,
    help: boolean,
  ): Promise<void> {
    try {
      await this.output.device(text, lang, options);
    } catch (error) {
      if (
        !help ||
        options.signal.aborted ||
        (error instanceof OutputError && error.code === "expired")
      )
        throw error;
      await this.output.tone(options);
    }
  }

  async enableAlerts(ticket: TapTicket | null): Promise<boolean> {
    if (
      this.output.pathname() !== "/care" ||
      !ticket ||
      !this.gate.consume(ticket, ticket.text, "alarm")
    )
      return false;
    this.alertsEnabled = await this.output.unlock();
    return this.alertsEnabled;
  }

  /** Remote events may only request a neutral tone on the caregiver route after local opt-in. */
  async alarm(): Promise<AudioResult> {
    if (!this.alertsEnabled || this.output.pathname() !== "/care")
      return { status: "unavailable" };
    this.cancelCurrent();
    const controller = new AbortController();
    this.pending = controller;
    try {
      await this.output.tone({
        signal: controller.signal,
        deadline: this.output.now() + TAP_WINDOW_MS,
        volume: this.volume,
        onStart: () => {},
      });
      return { status: "completed", source: "tone" };
    } catch (error) {
      return {
        status: controller.signal.aborted
          ? "cancelled"
          : error instanceof OutputError
            ? error.code
            : "failed",
      };
    } finally {
      if (this.pending === controller) this.pending = undefined;
    }
  }
}

/** Importing this singleton does not create an AudioContext or touch the DOM. */
export const audio = new AudioController();
