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
  Home as HomeIcon,
  LockKeyhole,
  Settings as SettingsIcon,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { AppProvider, useApp } from "./state";
import { getKV, hashPin } from "./db";
import { audio } from "./features/audio";
import { Brand, FooterNote, TapButton } from "./ui";
import { clockNow } from "./lib/context";
import { uiText } from "./lib/copy";
import {
  CommunicationDock,
  PausePage,
  RepairPage,
  ComfortPage,
  SentencePage,
} from "./pages/Communication";
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
  PeoplePage,
  RecentPage,
  SpeakPage,
  BaselinePage,
} from "./pages/Patient";
const SettingsPage = lazy(() => import("./pages/Settings"));
const CameraPage = lazy(() => import("./pages/Camera"));
const Care = lazy(() => import("./pages/Care"));
const Therapist = lazy(() => import("./pages/Therapist"));
const Demo = lazy(() => import("./pages/Demo"));

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
      <span className="eyebrow">A SPACE FOR FAMILY & CAREGIVERS</span>
      <h1>
        {settings.pinHash ? "Welcome back." : "Let’s make this space yours."}
      </h1>
      <p>
        {settings.pinHash
          ? "Enter your PIN to open settings, Voice Studio and the communication log."
          : "Create a four-digit PIN to keep settings separate from everyday communication."}
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
  } = useApp();
  const navigate = useNavigate(),
    location = useLocation();
  const [provider, setProvider] = useState("Demo phrases"),
    [roleReady, setRoleReady] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const path = location.pathname,
    care = path === "/care",
    family = ["/settings", "/therapist", "/demo"].includes(path),
    home = path === "/";
  useEffect(() => {
    void getKV<string>("role").then((role) => {
      if (role === "care" && location.pathname === "/")
        navigate("/care", { replace: true });
      setRoleReady(true);
    });
    void fetch("/api/health")
      .then((r) => r.json())
      .then((h: { providers?: { intent?: string } }) =>
        setProvider(
          h.providers?.intent === "ollama"
            ? "Local AI · Ollama"
            : "Demo phrases",
        ),
      )
      .catch(() => setProvider("Offline phrases"));
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
  }, [settings.lang, settings.textScale, settings.highContrast]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (
      !["/speaking", "/help", "/confirm", "/baseline", "/care"].includes(path)
    )
      audio.stop();
  }, [path]);
  useEffect(() => () => clearTimeout(hold.current), []);
  if (!ready || !roleReady)
    return (
      <div className="app-loading">
        <Brand />
        <p>Getting your space ready…</p>
      </div>
    );
  if (paused && !care && !family) return <PausePage />;
  const now = clockNow(settings),
    contact = settings.contacts.find((c) => c.id === settings.addressee);
  const nav = [
    { path: "/", label: "My space", icon: HomeIcon },
    { path: "/phrases", label: "My phrases", icon: BookHeart },
    { path: "/recent", label: "Recent words", icon: Clock3 },
    { path: "/tools", label: "My tools", icon: BookHeart },
  ];
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
                className={`nav-item ${path === n.path ? "active" : ""}`}
                onActivate={() => go(n.path)}
              >
                <n.icon size={23} />
                <span>{uiText(settings.lang, n.label)}</span>
                {path === n.path && <span className="active-dot" />}
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
      <div className="workspace">
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
                className={path === n.path ? "active" : ""}
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
          {family && (
            <div className="family-links">
              <TapButton onActivate={() => navigate("/settings?tab=voice")}>
                Voice Studio
              </TapButton>
              <TapButton onActivate={() => navigate("/therapist")}>
                Communication log
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
          {!care && !family && <CommunicationDock />}
        </main>
        <div className="workspace-bottom">
          <span>
            சொல்லு <span aria-hidden="true">✦</span> Say it, your way.
          </span>
          <span>
            {care
              ? "Caregiver companion"
              : `${contact?.lang === "en" ? "English" : "Tamil"} + English · Built for you`}
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
