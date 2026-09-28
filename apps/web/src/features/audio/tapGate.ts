/** Tickets are one-use capabilities for a displayed, exact sentence. */
export type AudioRole = "patient" | "caregiver";
export type AudioSurface = "patient" | "studio" | "care" | "baseline";
export type AudioChannel =
  "speak" | "preview" | "studio" | "alarm" | "baseline" | "review";

export interface TapTicket {
  readonly id: number;
  readonly text: string;
  readonly issuedAt: number;
  readonly role: AudioRole;
  readonly surface: AudioSurface;
}

export interface TapContext {
  role: AudioRole;
  surface: AudioSurface;
}

export const TAP_WINDOW_MS = 1_500;

/** Keyboard key-up and a native accessibility click activate the same exact-text control. */
export function isTrustedActivation(event: Event): boolean {
  if (
    typeof Event === "undefined" ||
    !(event instanceof Event) ||
    !event.isTrusted
  )
    return false;
  if (event.type === "pointerup") {
    const pointer = event as PointerEvent;
    return pointer.button === 0 && pointer.isPrimary !== false;
  }
  // Screen readers may activate a native button without a pointer or key event.
  // HTMLElement.click()/dispatchEvent() remain excluded by the isTrusted check above.
  if (event.type === "click") return (event as MouseEvent).detail === 0;
  return (
    event.type === "keyup" &&
    ["Enter", " "].includes((event as KeyboardEvent).key) &&
    !(event as KeyboardEvent).repeat
  );
}

export class TapGate {
  private sequence = 0;
  private readonly issued = new WeakSet<TapTicket>();
  private readonly consumed = new WeakSet<TapTicket>();

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly accepts: (event: Event) => boolean = isTrustedActivation,
  ) {}

  create(event: Event, text: string, context: TapContext): TapTicket | null {
    if (!text.trim() || !this.accepts(event)) return null;
    const ticket = Object.freeze({
      id: ++this.sequence,
      text,
      issuedAt: this.now(),
      ...context,
    });
    this.issued.add(ticket);
    return ticket;
  }

  consume(
    ticket: TapTicket | null,
    text: string,
    channel: AudioChannel,
  ): boolean {
    if (
      !ticket ||
      !this.issued.has(ticket) ||
      this.consumed.has(ticket) ||
      ticket.id !== this.sequence ||
      ticket.text !== text ||
      !this.isFresh(ticket)
    )
      return false;
    const allowed =
      channel === "review"
        ? (ticket.role === "patient" && ticket.surface === "patient") ||
          (ticket.role === "caregiver" && ticket.surface === "studio")
        : channel === "studio"
          ? ticket.role === "caregiver" && ticket.surface === "studio"
          : channel === "alarm"
            ? ticket.role === "caregiver" && ticket.surface === "care"
            : channel === "baseline"
              ? ticket.role === "patient" && ticket.surface === "baseline"
              : ticket.role === "patient" && ticket.surface === "patient";
    if (!allowed) return false;
    this.consumed.add(ticket);
    return true;
  }

  isFresh(ticket: TapTicket): boolean {
    const age = this.now() - ticket.issuedAt;
    return age >= 0 && age < TAP_WINDOW_MS && ticket.id === this.sequence;
  }

  invalidate(): void {
    this.sequence += 1;
  }
}
