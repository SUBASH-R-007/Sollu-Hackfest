import {
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ArrowLeft, ArrowUpRight, Heart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "./state";
import { uiText, copy } from "./lib/copy";
type Activation =
  globalThis.PointerEvent | globalThis.KeyboardEvent | globalThis.MouseEvent;
export function TapButton({
  onActivate,
  children,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onActivate?: (event: Activation) => void;
  children: ReactNode;
}) {
  const last = useRef(Number.NEGATIVE_INFINITY);
  const { settings } = useApp();
  function activate(
    e:
      | PointerEvent<HTMLButtonElement>
      | KeyboardEvent<HTMLButtonElement>
      | MouseEvent<HTMLButtonElement>,
  ) {
    if (
      props.disabled ||
      performance.now() - last.current < settings.tapFilterMs
    )
      return;
    last.current = performance.now();
    window.dispatchEvent(new Event("sollu:tap"));
    onActivate?.(e.nativeEvent);
  }
  return (
    <button
      {...props}
      data-tap="true"
      className={`tap ${className}`}
      onPointerUp={(e) => {
        if (e.button === 0) activate(e);
      }}
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        if (e.key === "Enter" || e.key === " ") e.preventDefault();
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(e);
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        if (e.nativeEvent.isTrusted && e.detail === 0) activate(e);
      }}
    >
      {children}
    </button>
  );
}
export function Back({
  to = "/",
  label = "Start over",
}: {
  to?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const { abandon, settings } = useApp();
  return (
    <TapButton
      className="back-button"
      onActivate={() => {
        abandon();
        navigate(to);
      }}
    >
      <ArrowLeft size={22} />
      <span>{uiText(settings.lang, label)}</span>
    </TapButton>
  );
}
export function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { settings } = useApp();
  return (
    <div className="page-title">
      <div>
        {eyebrow && settings.lang !== "ta" && (
          <div className="eyebrow">{eyebrow}</div>
        )}
        <h1>{uiText(settings.lang, title)}</h1>
        {subtitle && <p>{uiText(settings.lang, subtitle)}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  icon = "💬",
  title,
  children,
}: {
  icon?: string;
  title: string;
  children: ReactNode;
}) {
  const { settings } = useApp();
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h2>{uiText(settings.lang, title)}</h2>
      <p>
        {typeof children === "string"
          ? uiText(settings.lang, children)
          : children}
      </p>
    </div>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <span />
        <span />
        <span />
      </span>
      <span>
        sollu<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function FooterNote() {
  const { settings } = useApp();
  return (
    <div className="footer-note">
      <Heart size={15} />
      <span>{uiText(settings.lang, "Your words. At your pace.")}</span>
      <span className="footer-credit">Made with care, by team echo</span>
    </div>
  );
}
export function Hint({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  return (
    <div className="hint">
      <Sparkles size={19} />
      <span>
        {typeof children === "string"
          ? uiText(settings.lang, children)
          : children}
      </span>
    </div>
  );
}
export function Tile({
  icon,
  title,
  tamil,
  detail,
  tone,
  onActivate,
}: {
  icon: ReactNode;
  title: string;
  tamil?: string;
  detail?: string;
  tone: string;
  onActivate: (event: Activation) => void;
}) {
  const { settings } = useApp();
  return (
    <TapButton className={`big-tile ${tone}`} onActivate={onActivate}>
      <span className="tile-top">
        <span className="tile-icon">{icon}</span>
        <ArrowUpRight size={25} className="tile-arrow" />
      </span>
      <span className="tile-title">
        {copy(settings.lang, title, tamil ?? title)}{" "}
        {tamil && settings.lang === "en" && <span lang="ta">{tamil}</span>}
      </span>
      {detail && !settings.quietMode && (
        <span className="tile-detail">{uiText(settings.lang, detail)}</span>
      )}
    </TapButton>
  );
}
