"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, RefreshCw } from "lucide-react";

// Auto-fires on first paint of the Command Center. Pulls the latest briefing,
// or generates a fresh one if stale. Dismissible — won't re-open until next
// /cc visit.
export function BriefingOnOpen() {
  const [body, setBody] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("cc_briefing_dismissed") === "1") return;
    (async () => {
      try {
        const r = await fetch("/api/briefing");
        if (!r.ok) return;
        const j = await r.json();
        if (j.body) {
          setBody(j.body);
          setOpen(true);
        }
      } catch {
        /* offline — silently skip */
      }
    })();
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/briefing", { method: "POST" });
      const j = await r.json();
      if (j.body) setBody(j.body);
    } finally { setRefreshing(false); }
  }

  function dismiss() {
    sessionStorage.setItem("cc_briefing_dismissed", "1");
    setOpen(false);
  }

  if (!open || !body) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink-950/70 backdrop-blur-sm pt-16 px-4">
      <div className="card max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-400" />
            <h2 className="text-lg font-semibold">Briefing</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={refreshing} className="btn-ghost text-xs flex items-center gap-1">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Regenerating…" : "Refresh"}
            </button>
            <button onClick={dismiss} className="btn-ghost text-xs flex items-center gap-1">
              <X size={12} /> Dismiss
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-ink-200 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
