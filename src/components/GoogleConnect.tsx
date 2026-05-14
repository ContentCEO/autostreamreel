"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

interface Status { configured: boolean; connected: boolean }

// Sidebar widget. Shows Google connection state + a one-click button to
// kick or revoke the OAuth flow. Replaces having to paste
// /api/google/start into the address bar.
export function GoogleConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/google/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  async function disconnect() {
    if (!confirm("Disconnect Google? Jarvis will lose mail/calendar access.")) return;
    setBusy(true);
    try {
      await fetch("/api/google/status", { method: "DELETE" });
      setStatus({ configured: status?.configured ?? false, connected: false });
    } finally { setBusy(false); }
  }

  if (!status) return null;
  if (!status.configured) {
    return (
      <div className="text-[10px] uppercase tracking-widest text-ink-600 px-3">
        Google not configured · set GOOGLE_CLIENT_ID
      </div>
    );
  }
  if (status.connected) {
    return (
      <button
        onClick={disconnect}
        disabled={busy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-success-300 hover:text-danger-400 transition w-full"
        title="Disconnect Google (Jarvis loses mail + calendar access)"
      >
        <Mail size={12} /> Google · connected
      </button>
    );
  }
  return (
    <a
      href="/api/google/start"
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-ink-300 hover:text-accent-300 hover:bg-ink-800/60 transition"
    >
      <Mail size={12} /> Connect Google
    </a>
  );
}
