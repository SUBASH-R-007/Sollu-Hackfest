import { useEffect, useState } from "react";

/** Refresh calendar windows after midnight or returning to an open dashboard. */
export function useProgressClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const visible = () => {
      if (!document.hidden) refresh();
    };
    const interval = window.setInterval(visible, 60_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return now;
}
