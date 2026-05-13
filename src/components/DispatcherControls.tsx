"use client";

import { useState } from "react";
import { Bot, Play } from "lucide-react";

export function DispatcherControls() {
  const [busy, setBusy] = useState(false);
  const [force, setForce] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function tick() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/dispatch/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force, limit: 30 }),
      });
      const j = await r.json();
      setMsg(r.ok ? `Ran ${j.ran} agents · ${j.alerts} alerts raised.` : `Failed: ${j.error}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bot size={14} className="text-accent-400" /> Autonomous tick
      </div>
      <p className="text-xs text-ink-500">
        Each tick wakes every agent whose cadence is due, lets them act, logs results,
        and escalates anything they couldn&apos;t do without you. Set <code>CRON_SECRET</code> +
        a Vercel cron POST to <code>/api/dispatch/tick</code> for continuous runs.
      </p>
      <div className="flex items-center gap-3">
        <label className="text-xs flex items-center gap-2 text-ink-300">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force (ignore cadence)
        </label>
        <button onClick={tick} disabled={busy} className="btn-primary flex items-center gap-1">
          <Play size={12} /> Run tick now
        </button>
        {msg && <span className="text-xs text-ink-400">{msg}</span>}
      </div>
    </div>
  );
}
