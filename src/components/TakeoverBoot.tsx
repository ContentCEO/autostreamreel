"use client";

import { useEffect } from "react";

// Tauri "takeover" — when running inside the desktop shell, force fullscreen
// on first paint. Browsers (no Tauri) just no-op.
export function TakeoverBoot() {
  useEffect(() => {
    const w = window as unknown as { __TAURI__?: { window?: unknown } };
    if (!w.__TAURI__) return;
    (async () => {
      try {
        const mod = await import("@tauri-apps/api/window").catch(() => null);
        if (!mod) return;
        const current = (mod as any).getCurrentWindow?.() ?? (mod as any).appWindow;
        if (current?.setFullscreen) await current.setFullscreen(true);
        if (current?.setAlwaysOnTop) await current.setAlwaysOnTop(true);
      } catch {
        // Tauri API not available — fall through silently.
      }
    })();
  }, []);
  return null;
}
