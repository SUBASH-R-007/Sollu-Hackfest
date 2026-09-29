import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quickPhrases } from "@sollu/shared";
import { useApp } from "../state";
import { audio } from "../features/audio";
import { copy } from "../lib/copy";
import { TapButton } from "../ui";

export function CommunicationDock() {
  const { settings, speak, sayInPlace, pause, stop, resume, paused } = useApp();
  const navigate = useNavigate();
  const c = quickPhrases[settings.lang].help;
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(""), 6000);
    return () => clearTimeout(timer);
  }, [said]);
  // Yes/No answer a question from anywhere without losing the message.
  const quick = (key: "yes" | "no", event: Event) => {
    const phrase = quickPhrases[settings.lang][key];
    void sayInPlace(
      phrase,
      audio.createTap(event, phrase.text, {
        role: "patient",
        surface: "patient",
      }),
    ).then((status) =>
      setSaid(
        status === "completed"
          ? `✓ ${phrase.text}`
          : status === "unavailable"
            ? copy(
                settings.lang,
                `No voice installed. Show: ${phrase.text}`,
                `குரல் இல்லை. காட்டுங்கள்: ${phrase.text}`,
              )
            : status === "cancelled"
              ? ""
              : copy(
                  settings.lang,
                  `Could not play. Show: ${phrase.text}`,
                  `ஒலிக்கவில்லை. காட்டுங்கள்: ${phrase.text}`,
                ),
      ),
    );
  };
  return (
    <nav
      className="communication-dock"
      aria-label={copy(settings.lang, "Communication support", "பேச உதவி")}
    >
      <TapButton
        className="dock-help"
        onActivate={(event) =>
          speak(
            c,
            audio.createTap(event, c.text, {
              role: "patient",
              surface: "patient",
            }),
            false,
            settings.lang,
          )
        }
      >
        ✋ {c.text}
      </TapButton>
      <TapButton
        className="dock-yes"
        onActivate={(event) => quick("yes", event)}
      >
        👍 {quickPhrases[settings.lang].yes.text}
      </TapButton>
      <TapButton className="dock-no" onActivate={(event) => quick("no", event)}>
        👎 {quickPhrases[settings.lang].no.text}
      </TapButton>
      <TapButton
        onActivate={() => {
          stop();
          if (paused) resume();
          navigate("/repair");
        }}
      >
        ↩ {copy(settings.lang, "Fix", "திருத்து")}
      </TapButton>
      <TapButton onActivate={pause}>
        Ⅱ {copy(settings.lang, "Pause", "இடைவேளை")}
      </TapButton>
      <TapButton onActivate={stop}>
        ■ {copy(settings.lang, "Stop", "நிறுத்து")}
      </TapButton>
      {said && (
        <p className="dock-status" role="status">
          {said}
        </p>
      )}
    </nav>
  );
}
export function PausePage() {
  const { settings, session, resume, abandon } = useApp();
  const navigate = useNavigate();
  return (
    <div className="pause-space">
      <span className="pause-symbol" aria-hidden>
        Ⅱ
      </span>
      <h1>{copy(settings.lang, "Take your time.", "நிதானமாக இருங்கள்.")}</h1>
      <p>
        {copy(
          settings.lang,
          "Your words are saved here. Nothing will speak until you choose.",
          "உங்கள் வார்த்தைகள் இங்கே உள்ளன. நீங்கள் தேர்ந்தெடுத்தால் மட்டுமே பேசும்.",
        )}
      </p>
      {session?.context.fragment.raw && (
        <blockquote>{session.context.fragment.raw}</blockquote>
      )}
      <TapButton className="primary full" onActivate={resume}>
        {copy(settings.lang, "Continue my message", "என் செய்தியைத் தொடரவும்")}
      </TapButton>
      <TapButton
        className="full"
        onActivate={() => {
          abandon();
          navigate("/");
        }}
      >
        {copy(settings.lang, "Start a new message", "புதிய செய்தியைத் தொடங்கு")}
      </TapButton>
      <CommunicationDock />
    </div>
  );
}
