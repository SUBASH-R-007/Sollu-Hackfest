import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookHeart,
  ChevronRight,
  Clock3,
  AudioLines,
  GraduationCap,
  Home as HomeIcon,
  LockKeyhole,
  Settings as SettingsIcon,
  ShieldCheck,
  Sprout,
  Stethoscope,
  WifiOff,
  Wrench,
} from "lucide-react";
import { AppProvider, useApp } from "./state";
import { hashPin } from "./db";
import { audio } from "./features/audio";
import { Brand, FooterNote, TapButton } from "./ui";
import { clockNow, sentenceLanguage } from "./lib/context";
import { api } from "./lib/api";
import { copy, uiText } from "./lib/copy";
import { RehabilitationNav } from "./features/rehab/RehabilitationNav";
import { CommunicationDock, PausePage } from "./pages/Communication";
// Repair, comfort and the sentence builder load on first use.
const RepairPage = lazy(() =>
  import("./pages/Conversation").then((m) => ({ default: m.RepairPage })),
);
const ComfortPage = lazy(() =>
  import("./pages/Conversation").then((m) => ({ default: m.ComfortPage })),
);
const SentencePage = lazy(() =>
  import("./pages/Conversation").then((m) => ({ default: m.SentencePage })),
);
const ToolsPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.ToolsPage })),
);
const WordsPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.WordsPage })),
);
const ScenesPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.ScenesPage })),
);
const StoriesPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.StoriesPage })),
);
const PassportPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.PassportPage })),
);
const DrawPage = lazy(() =>
  import("./pages/Support").then((m) => ({ default: m.DrawPage })),
);
import {
  Home,
  QuickStrip,
  TypePage,
  TopicsPage,
  ConfirmPage,
  SpeakingPage,
  PhrasesPage,
  SpeakPage,
} from "./pages/Patient";
const SettingsPage = lazy(() => import("./pages/Settings"));
const CameraPage = lazy(() => import("./pages/Camera"));
const Care = lazy(() => import("./pages/Care"));
const Therapist = lazy(() => import("./pages/Therapist"));
const PracticePage = lazy(() => import("./features/rehab/PracticePage"));
const AppointmentsPage = lazy(
  () => import("./features/appointments/AppointmentsPage"),
);
const RehabilitationHub = lazy(
  () => import("./features/rehab/RehabilitationHub"),
);
const Demo = lazy(() => import("./pages/Demo"));
const FlowPage = lazy(() => import("./features/flow/FlowPage"));
const PeoplePage = lazy(() =>
  import("./pages/PatientMore").then((m) => ({ default: m.PeoplePage })),
);
const RecentPage = lazy(() =>
  import("./pages/PatientMore").then((m) => ({ default: m.RecentPage })),
);
const BaselinePage = lazy(() =>
  import("./pages/PatientMore").then((m) => ({ default: m.BaselinePage })),
);
const CompanionPage = lazy(() => import("./features/companion/CompanionPage"));

function CaregiverGate({ children }: { children: ReactNode }) {
  const { settings, updateSettings, caregiverUnlocked, unlock } = useApp();
  const [pin, setPin] = useState(""),
    [error, setError] = useState("");
  const [failures, setFailures] = useState(0),
    [blockedUntil, setBlockedUntil] = useState(0);
  if (caregiverUnlocked) return children;
  async function submit() {
    if (Date.now() < blockedUntil) {
      setError("Please wait a minute before trying again.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("Use four digits.");
      return;
    }
    const hashed = await hashPin(pin);
    if (!settings.pinHash) {
      await updateSettings({ pinHash: hashed });
      unlock();
    } else if (hashed === settings.pinHash) {
      unlock();
      setFailures(0);
    } else {
      setError("That PIN didn’t match. Please try again.");
      setFailures((f) => f + 1);
      if (failures >= 4) setBlockedUntil(Date.now() + 60000);
      setPin("");
    }
  }
  return (
    <div className="lock-panel">
      <span className="lock-icon">
        <LockKeyhole size={32} />
      </span>
      <span className="eyebrow">
        {copy(
          settings.lang,
          "A SPACE FOR FAMILY & CAREGIVERS",
          "குடும்பத்தினர், பராமரிப்பாளர்களுக்கு",
        )}
      </span>
      <h1>
        {settings.pinHash
          ? copy(settings.lang, "Welcome back.", "மீண்டும் வாருங்கள்.")
          : copy(
              settings.lang,
              "Let’s make this space yours.",
              "இந்த இடத்தை அமைப்போம்.",
            )}
      </h1>
      <p>
        {settings.pinHash
          ? copy(
              settings.lang,
              "Enter your PIN to open settings, Voice Studio and the clinician dashboard.",
              "அமைப்புகளைத் திறக்க PIN-ஐ உள்ளிடுங்கள்.",
            )
          : copy(
              settings.lang,
              "Create a four-digit PIN to keep settings separate from everyday communication.",
              "அமைப்புகளைத் தனியாக வைக்க நான்கு இலக்க PIN-ஐ உருவாக்குங்கள்.",
            )}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="caregiver-pin">Caregiver PIN</label>
        <input
          id="caregiver-pin"
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          autoComplete="off"
        />
        <button className="tap primary full" type="submit">
          {settings.pinHash ? "Unlock" : "Create PIN"}
          <ChevronRight size={21} />
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <small>This is a local settings lock, not account authentication.</small>
    </div>
  );
}
function Shell() {
  const {
    settings,
    session,
    online,
    ready,
    abandon,
    updateSettings,
    lock,
    paused,
    caregiverUnlocked,
  } = useApp();
  const navigate = useNavigate(),
    location = useLocation();
  const [provider, setProvider] = useState("Demo phrases");
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const path = location.pathname,
    care = path === "/care",
    family = ["/settings", "/therapist", "/clinician", "/demo"].includes(path),
    rehabilitation = ["/rehabilitation", "/practice", "/appointments"].includes(
      path,
    ),
    home = path === "/";
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api<{ provider: string }>(
        "llm/settings",
        undefined,
        undefined,
        "GET",
      )
        .then((result) => {
          if (!active) return;
          const labels: Record<string, string> = {
            mock: "Free vocabulary",
            ollama: "Local AI · Ollama",
            openai: "AI · OpenAI",
            anthropic: "AI · Claude",
            gemini: "AI · Gemini",
            groq: "AI · Groq",
          };
          setProvider(labels[result.provider] ?? "Sentence engine");
        })
        .catch(() => {
          if (active) setProvider("Offline phrases");
        });
    };
    refresh();
    window.addEventListener("sollu:llm-settings-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("sollu:llm-settings-changed", refresh);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = settings.lang;
    document.documentElement.style.setProperty(
      "--text-scale",
      String(settings.textScale),
    );
    document.documentElement.classList.toggle(
      "high-contrast",
      settings.highContrast,
    );
    document.documentElement.classList.toggle(
      "reduced-motion",
      settings.reducedMotion,
    );
  }, [
    settings.lang,
    settings.textScale,
    settings.highContrast,
    settings.reducedMotion,
  ]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (
      !["/speaking", "/help", "/confirm", "/baseline", "/care"].includes(path)
    )
      audio.stop();
  }, [path]);
  useEffect(() => () => clearTimeout(hold.current), []);
  if (!ready)
    return (
      <div className="app-loading">
        <Brand />
        <p>Getting your space ready…</p>
      </div>
    );
  // Pause from the dock must show the pause screen unless a caregiver is
  // already working in an unlocked family area.
  if (paused && !care && !(family && caregiverUnlocked)) return <PausePage />;
  const now = clockNow(settings);
  const nav = [
    { path: "/", label: "My space", icon: HomeIcon },
    { path: "/phrases", label: "My phrases", icon: BookHeart },
    { path: "/recent", label: "Recent words", icon: Clock3 },
    { path: "/tools", label: "My tools", icon: Wrench },
    { path: "/companion", label: "Companion", icon: GraduationCap },
    { path: "/flow", label: "Voice flow", icon: AudioLines },
    { path: "/rehabilitation", label: "Rehabilitation", icon: Sprout },
    { path: "/clinician", label: "Clinician", icon: Stethoscope },
  ];
  const isActive = (destination: string) =>
    path === destination ||
    (destination === "/rehabilitation" && rehabilitation) ||
    (destination === "/clinician" && path === "/therapist");
  function go(to: string) {
    abandon();
    navigate(to);
  }
  return (
    <div
      className={`app-shell ${care ? "care-shell" : ""} ${settings.keepLeft ? "keep-left" : ""} ${settings.quietMode ? "quiet-mode" : ""}`}
    >
      {!care && (
        <aside className="sidebar">
          <a className="brand-link" href="/" aria-label="Sollu home">
            <Brand />
          </a>
          <div className="sidebar-tagline">
            A little help finding
            <br />
            your words.
          </div>
          <div className="nav-caption">YOUR EVERYDAY SPACE</div>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <TapButton
                key={n.path}
                className={`nav-item ${isActive(n.path) ? "active" : ""}`}
                aria-current={isActive(n.path) ? "page" : undefined}
                onActivate={() => go(n.path)}
              >
                <n.icon size={23} />
                <span>{uiText(settings.lang, n.label)}</span>
                {isActive(n.path) && <span className="active-dot" />}
              </TapButton>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="device-note">
              <ShieldCheck size={21} />
              <span>
                Your memories stay
                <br />
                <strong>on this device.</strong>
              </span>
            </div>
            <TapButton
              className="family-nav"
              onActivate={() => navigate("/settings")}
            >
              <SettingsIcon size={21} />
              <span>For your family</span>
              <ChevronRight size={19} />
            </TapButton>
            <div className="sidebar-profile">
              <span className="avatar profile-avatar">{settings.name[0]}</span>
              <div>
                <strong>{settings.name}’s space</strong>
                <small>
                  {settings.demo ? "Demo family" : "Personal communication"}
                </small>
              </div>
            </div>
          </div>
        </aside>
      )}
      <div
        className={`workspace${
          // Mid-message screens show the choices first on phones.
          ["/confirm", "/speaking", "/practice"].includes(path)
            ? " task-focus"
            : ""
        }`}
      >
        <header className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="breadcrumb">
            <span>
              {care
                ? "STAY CLOSE"
                : family
                  ? "FAMILY SPACE"
                  : "YOUR COMMUNICATION COMPANION"}
            </span>
            <span className="beta-label">BETA</span>
          </div>
          <div className="topbar-actions">
            <span className="mode-badge">
              <span className="mode-dot" />
              {provider}
            </span>
            {!online && (
              <span className="offline-label">
                <WifiOff size={17} />
                Offline
              </span>
            )}
            {!care && (
              <button
                className="settings-gear"
                aria-label="Hold to open caregiver settings"
                title="Hold for two seconds to open caregiver settings"
                onPointerDown={() => {
                  hold.current = setTimeout(() => navigate("/settings"), 2000);
                }}
                onPointerUp={() => clearTimeout(hold.current)}
                onPointerLeave={() => clearTimeout(hold.current)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/settings");
                }}
              >
                <SettingsIcon size={22} />
              </button>
            )}
          </div>
        </header>
        {!care && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {nav.map((n) => (
              <TapButton
                key={n.path}
                className={isActive(n.path) ? "active" : ""}
                aria-current={isActive(n.path) ? "page" : undefined}
                onActivate={() => go(n.path)}
              >
                <n.icon size={21} />
                {uiText(settings.lang, n.label)}
              </TapButton>
            ))}
          </nav>
        )}
        <main className={`main-content ${home ? "home-content" : ""}`}>
          {!care && (
            <div className="page-meta">
              <span>
                <span className="hello-dot" />
                Hello, {settings.name}
                <span className="meta-divider">/</span>
                <span className="time-greeting">
                  {now.getHours() >= 17
                    ? "An evening, at your pace"
                    : now.getHours() < 12
                      ? "A morning, at your pace"
                      : "A moment, at your pace"}
                </span>
              </span>
              <div className="meta-controls">
                {settings.demo && (
                  <span className="demo-badge">
                    Demo time{" "}
                    {now.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                )}
                <TapButton
                  className="language-switch"
                  aria-label={
                    settings.lang === "ta"
                      ? "மொழி: தமிழ். Switch to English"
                      : "Language: English. தமிழுக்கு மாற்று"
                  }
                  onActivate={() =>
                    void updateSettings({
                      lang: settings.lang === "ta" ? "en" : "ta",
                    })
                  }
                >
                  <span className={settings.lang === "ta" ? "selected" : ""}>
                    தமிழ்
                  </span>
                  <span className={settings.lang === "en" ? "selected" : ""}>
                    EN
                  </span>
                </TapButton>
              </div>
            </div>
          )}
          {rehabilitation && <RehabilitationNav />}
          <Suspense
            fallback={<div className="route-loading">Opening your space…</div>}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/type" element={<TypePage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/speak" element={<SpeakPage />} />
              <Route path="/question" element={<SpeakPage partner />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/confirm" element={<ConfirmPage />} />
              <Route path="/speaking" element={<SpeakingPage />} />
              <Route path="/help" element={<SpeakingPage help />} />
              <Route path="/phrases" element={<PhrasesPage />} />
              <Route path="/recent" element={<RecentPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/flow" element={<FlowPage />} />
              <Route path="/companion" element={<CompanionPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/rehabilitation" element={<RehabilitationHub />} />
              <Route path="/words" element={<WordsPage />} />
              <Route path="/scenes" element={<ScenesPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/passport" element={<PassportPage />} />
              <Route path="/draw" element={<DrawPage />} />
              <Route path="/repair" element={<RepairPage />} />
              <Route path="/comfort" element={<ComfortPage />} />
              <Route path="/sentence" element={<SentencePage />} />
              <Route
                path="/settings"
                element={
                  <CaregiverGate>
                    <SettingsPage />
                  </CaregiverGate>
                }
              />
              <Route
                path="/clinician"
                element={
                  <CaregiverGate>
                    <Therapist />
                  </CaregiverGate>
                }
              />
              <Route
                path="/therapist"
                element={
                  <CaregiverGate>
                    <Therapist />
                  </CaregiverGate>
                }
              />
              <Route
                path="/demo"
                element={
                  <CaregiverGate>
                    <Demo />
                  </CaregiverGate>
                }
              />
              <Route path="/care" element={<Care />} />
              <Route path="/baseline" element={<BaselinePage />} />
              <Route
                path="/setup"
                element={<Navigate to="/settings" replace />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          {home && <QuickStrip />}
          {session && settings.stage && (
            <div
              data-testid="stage-overlay"
              className={`metrics-overlay ${settings.stage ? "stage" : ""}`}
              aria-label="Attempt metrics"
            >
              <span>☝ {session.attempt.taps} taps</span>
              <span>
                <Clock3 size={16} />
                {session.attempt.timeToSpeechMs !== undefined
                  ? `${(session.attempt.timeToSpeechMs / 1000).toFixed(1)} s`
                  : "Waiting for speech"}
              </span>
              <small>
                {session.attempt.demoCached
                  ? "CACHED"
                  : session.attempt.demoClock
                    ? "DEMO"
                    : ""}
              </small>
            </div>
          )}
          {family && caregiverUnlocked && (
            <div className="family-links">
              <TapButton onActivate={() => navigate("/settings?tab=voice")}>
                Voice Studio
              </TapButton>
              <TapButton onActivate={() => navigate("/clinician")}>
                {uiText(settings.lang, "Clinician dashboard")}
              </TapButton>
              <TapButton onActivate={() => navigate("/rehabilitation")}>
                {uiText(settings.lang, "Rehabilitation")}
              </TapButton>
              <TapButton onActivate={() => navigate("/demo")}>
                Demo & rehearsal
              </TapButton>
              <TapButton onActivate={() => navigate("/baseline")}>
                Baseline board
              </TapButton>
              <TapButton
                onActivate={() => {
                  lock();
                  navigate("/");
                }}
              >
                Lock & return
              </TapButton>
            </div>
          )}
          {!care && <FooterNote />}
          {/* Patients also reach family routes (PIN screen, Clinician), so the
              Help/Fix/Pause/Stop dock stays on every non-care screen. */}
          {!care && <CommunicationDock />}
        </main>
        <div className="workspace-bottom">
          <span>
            சொல்லு <span aria-hidden="true">✦</span> Say it, your way.
          </span>
          <span>
            {care
              ? "Caregiver companion"
              : `${sentenceLanguage(settings) === "en" ? "English" : "Tamil"} + English · Built for you`}
          </span>
        </div>
      </div>
    </div>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="lock-panel">
        <Brand />
        <h1>Let’s try that again.</h1>
        <p>Your saved words stay on this device.</p>
        <button className="tap primary" onClick={() => location.assign("/")}>
          Return home
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  );
}
