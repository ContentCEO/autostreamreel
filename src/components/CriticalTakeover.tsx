"use client";

import { useEffect, useState } from "react";
import { AlertOctagon } from "lucide-react";

interface CriticalAlert {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
}

// Hard takeover when an unresolved CRITICAL alert exists. Polls /api/status to
// detect, then fetches details. The owner cannot keep working until they
// acknowledge — drives the "Jarvis interrupts you" UX.
export function CriticalTakeover() {
  const [alert, setAlert] = useState<CriticalAlert | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const r = await fetch("/api/alerts/critical");
        const j = await r.json();
        if (!cancelled) setAlert(j.alert ?? null);
      } catch { /* ignore */ }
    }
    check();
    const t = setInterval(check, 20_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  async function resolve() {
    if (!alert) return;
    setBusy(true);
    try {
      await fetch("/api/alerts/critical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id }),
      });
      setAlert(null);
    } finally { setBusy(false); }
  }

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-danger-500/30 backdrop-blur">
      <div className="card max-w-lg w-full p-6 border-danger-500/50 bg-ink-900 shadow-2xl">
        <div className="flex items-center gap-2 text-danger-400 mb-2">
          <AlertOctagon size={18} />
          <span className="uppercase tracking-widest text-xs">critical</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">{alert.title}</h2>
        {alert.body && <p className="text-sm text-ink-200 whitespace-pre-wrap mb-4">{alert.body}</p>}
        <div className="flex justify-end">
          <button onClick={resolve} disabled={busy} className="btn-primary">
            {busy ? "Acknowledging…" : "Acknowledge & resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}
