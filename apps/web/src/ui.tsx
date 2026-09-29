import {
  useEffect,
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
/** Extra reach (px) around a button in which a shaky release still counts. */
export const RELEASE_SLOP_PX = 12;
interface ReleasePoint {
  pointerId: number;
  button: number;
  clientX: number;
  clientY: number;
}
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/**
 * A pointer release activates a button only when the same pointer was pressed
 * down on that button and is released on (or just beside) it. Releasing after
 * drifting onto another button activates neither of them.
 */
export function releaseActivates(
  pressedPointer: number | null,
  release: ReleasePoint,
  box: Box,
  slop = RELEASE_SLOP_PX,
): boolean {
  return (
    release.button === 0 &&
    pressedPointer !== null &&
    pressedPointer === release.pointerId &&
    release.clientX >= box.left - slop &&
    release.clientX <= box.right + slop &&
    release.clientY >= box.top - slop &&
    release.clientY <= box.bottom + slop
  );
}
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
  // The pointer that started a press on this button; null when none is pending.
  const pressed = useRef<number | null>(null);
  const disarm = useRef<(() => void) | undefined>(undefined);
  const { settings } = useApp();
  useEffect(() => () => disarm.current?.(), []);
  // Remember which pointer pressed this button. The window listeners run after
  // this button's own pointerup handler and forget the press wherever that
  // pointer is released or cancelled, so a later press that starts elsewhere
  // can never be completed on this button.
  function arm(pointerId: number) {
    disarm.current?.();
    pressed.current = pointerId;
    const end = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointerId) cleanup();
    };
    const cleanup = () => {
      if (pressed.current === pointerId) pressed.current = null;
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      disarm.current = undefined;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    disarm.current = cleanup;
  }
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
      onPointerDown={(e) => {
        props.onPointerDown?.(e);
        if (e.button === 0) arm(e.pointerId);
      }}
      onPointerUp={(e) => {
        const pointer = pressed.current;
        if (pointer === e.pointerId) pressed.current = null;
        if (
          releaseActivates(pointer, e, e.currentTarget.getBoundingClientRect())
        )
          activate(e);
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
