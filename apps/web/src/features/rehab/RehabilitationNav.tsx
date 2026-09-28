import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarPlus, Sprout, Stethoscope } from "lucide-react";
import { TapButton } from "../../ui";
import { useApp } from "../../state";
import { uiText } from "../../lib/copy";
import "./navigation.css";

export function RehabilitationNav() {
  const { settings } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav
      className="rehabilitation-nav print-hide"
      aria-label={uiText(settings.lang, "Rehabilitation navigation")}
    >
      <TapButton
        aria-current={pathname === "/rehabilitation" ? "page" : undefined}
        onActivate={() => navigate("/rehabilitation")}
      >
        <Sprout size={22} aria-hidden="true" />
        <span>{uiText(settings.lang, "My rehabilitation")}</span>
      </TapButton>
      <TapButton
        aria-current={pathname === "/practice" ? "page" : undefined}
        onActivate={() => navigate("/practice")}
      >
        <BookOpen size={22} aria-hidden="true" />
        <span>{uiText(settings.lang, "Practice")}</span>
      </TapButton>
      <TapButton onActivate={() => navigate("/clinician")}>
        <Stethoscope size={22} aria-hidden="true" />
        <span>{uiText(settings.lang, "Clinician dashboard")}</span>
      </TapButton>
      <TapButton
        aria-current={pathname === "/appointments" ? "page" : undefined}
        onActivate={() => navigate("/appointments")}
      >
        <CalendarPlus size={22} aria-hidden="true" />
        <span>{uiText(settings.lang, "Book appointment")}</span>
      </TapButton>
    </nav>
  );
}
