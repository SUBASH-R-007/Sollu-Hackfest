import { Volume2 } from "lucide-react";
import { TapButton } from "../../ui";
import { audio } from "../audio";
import type { CompanionLang } from "./content";

/**
 * A neutral example voice (preview channel) for the exact phrase on screen.
 * It plays only after this fresh tap; nothing is queued, repeated or played
 * automatically, and the accessible name carries the exact text played.
 */
export default function ListenButton({
  text,
  lang,
  label,
  disabled,
  onUnavailable,
  className = "",
  iconOnly = false,
}: {
  text: string;
  lang: CompanionLang;
  label: string;
  disabled?: boolean;
  onUnavailable: () => void;
  className?: string;
  /** Show only the speaker icon (the phrase is already shown beside it). */
  iconOnly?: boolean;
}) {
  return (
    <TapButton
      className={`companion-listen secondary ${className}`}
      aria-label={`${label}: ${text}`}
      disabled={disabled}
      onActivate={(event) => {
        const ticket = audio.createTap(event, text, {
          role: "patient",
          surface: "patient",
        });
        void audio
          .speak({
            text,
            lang: lang === "ta" ? "ta-IN" : "en-IN",
            ticket,
            channel: "preview",
          })
          .then((result) => {
            // A newer tap or Stop cancels quietly; anything else is reported.
            if (result.status !== "completed" && result.status !== "cancelled")
              onUnavailable();
          });
      }}
    >
      <Volume2 aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </TapButton>
  );
}
