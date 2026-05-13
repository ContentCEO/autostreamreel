"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Workflow, PhoneOutgoing, Bot } from "lucide-react";

interface Counts {
  open_alerts: number;
  active_tasks: number;
  scheduled_outbound_next_24h: number;
  autonomous_on: boolean;
}

// Live status bar at the bottom — refreshes every 30s. Always-on indicator
// that the system is alive and watching.
export function StatusBar() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/status");
        const j = await r.json();
        if (!cancelled) setC(j);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="border-t border-ink-800 bg-ink-900/60 px-4 py-1.5 text-xs flex items-center gap-4 text-ink-400">
      <Pulse on={(c?.open_alerts ?? 0) > 0} color="danger" />
      <Item icon={AlertTriangle}    label="alerts"   value={c?.open_alerts} />
      <Item icon={Workflow}         label="tasks"    value={c?.active_tasks} />
      <Item icon={PhoneOutgoing}    label="next 24h" value={c?.scheduled_outbound_next_24h} />
      <div className="ml-auto flex items-center gap-1">
        <Bot size={12} className={c?.autonomous_on ? "text-success-500" : "text-ink-500"} />
        <span className={c?.autonomous_on ? "text-success-500" : "text-ink-500"}>
          {c?.autonomous_on ? "autonomous on" : "autonomous off"}
        </span>
      </div>
    </div>
  );
}

function Item({
  icon: Icon, label, value,
}: {
  icon: typeof AlertTriangle; label: string; value: number | undefined;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={12} />
      <span className="tabular-nums">{value ?? "—"}</span>
      <span className="text-ink-500">{label}</span>
    </span>
  );
}

function Pulse({ on, color }: { on: boolean; color: "danger" | "warn" }) {
  if (!on) return <span className="w-1.5 h-1.5 rounded-full bg-ink-700" aria-hidden />;
  const cls = color === "danger" ? "bg-danger-500" : "bg-warn-500";
  return <span className={`w-1.5 h-1.5 rounded-full ${cls} animate-pulse`} aria-hidden />;
}
