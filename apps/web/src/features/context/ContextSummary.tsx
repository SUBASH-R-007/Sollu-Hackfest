import {
  deriveContextSignals,
  type ContextPacket,
  type Lang,
} from "@sollu/shared";
import { copy } from "../../lib/copy";
import "./context.css";

const placeNames = {
  home: ["Home", "வீடு"],
  clinic: ["Clinic", "மருத்துவமனை"],
  hospital: ["Hospital", "மருத்துவமனை"],
  outside: ["Outside", "வெளியே"],
  other: ["Other place", "வேறு இடம்"],
} as const;

/** Shows the fixed request snapshot, never the moving clock after an answer arrives. */
export function ContextSummary({
  context,
  lang,
}: {
  context: ContextPacket;
  lang: Lang;
}) {
  const signals = deriveContextSignals(context);
  return (
    <details className="context-summary">
      <summary>
        {copy(
          lang,
          "Context for these suggestions",
          "இந்த வாக்கியங்களுக்கான சூழல்",
        )}
      </summary>
      <p>
        {copy(
          lang,
          "These are clues. Your words and your choice come first.",
          "இவை குறிப்புகள் மட்டுமே. உங்கள் வார்த்தையும் தேர்வும் முக்கியம்.",
        )}
      </p>
      <ul>
        {signals.clock && (
          <li>
            {copy(
              lang,
              signals.clock.isDemo ? "Demo time" : "Time",
              signals.clock.isDemo ? "மாதிரி நேரம்" : "நேரம்",
            )}
            : <strong>{signals.clock.localTime}</strong>
          </li>
        )}
        {signals.place && (
          <li>
            {copy(lang, "Selected place", "தேர்ந்தெடுத்த இடம்")}:{" "}
            <strong>{placeNames[signals.place][lang === "ta" ? 1 : 0]}</strong>
          </li>
        )}
        {context.partnerQuestion && (
          <li>
            {copy(lang, "Current question", "தற்போதைய கேள்வி")}:{" "}
            {context.partnerQuestion.text}
          </li>
        )}
        {signals.routines.map((routine) => (
          <li key={routine.path}>
            {copy(lang, "Routine clue", "வழக்கக் குறிப்பு")}:{" "}
            <strong>{routine.label}</strong> · {routine.time}
          </li>
        ))}
        {Boolean(context.recentTurns?.length) && (
          <li>
            {copy(
              lang,
              "Recent confirmed messages",
              "சமீபத்தில் உறுதிசெய்த செய்திகள்",
            )}
            : {context.recentTurns!.length}
          </li>
        )}
      </ul>
      {signals.routineResolution === "ambiguous" && (
        <p>
          {copy(
            lang,
            "More than one routine fits. Add a word to say which one.",
            "ஒன்றுக்கு மேற்பட்ட வழக்கங்கள் பொருந்துகின்றன. எது என்று ஒரு வார்த்தை சேருங்கள்.",
          )}
        </p>
      )}
    </details>
  );
}
