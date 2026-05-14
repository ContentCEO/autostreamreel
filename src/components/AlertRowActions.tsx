"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone } from "lucide-react";

export function AlertRowActions({ id, resolved, severity }: { id: string; resolved: boolean; severity: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resolve" | "call" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (resolved) return <span className="text-xs text-ink-500">resolved</span>;

  async function resolve() {
    setBusy("resolve");
    try {
      await fetch(`/api/alerts/${id}/resolve`, { method: "POST" });
      router.refresh();
    } finally { setBusy(null); }
  }

  async function call() {
    setBusy("call"); setMsg(null);
    try {
      const r = await fetch(`/api/alerts/${id}/call`, { method: "POST" });
      const j = await r.json();
      setMsg(r.ok ? "Calling…" : `Failed: ${j.error}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="flex items-center gap-1">
      {severity === "critical" && (
        <button onClick={call} disabled={busy !== null} className="btn-ghost text-xs inline-flex items-center gap-1">
          <Phone size={12} /> {busy === "call" ? "Calling…" : "Call me"}
        </button>
      )}
      <button onClick={resolve} disabled={busy !== null} className="btn-ghost text-xs inline-flex items-center gap-1">
        <Check size={12} /> {busy === "resolve" ? "Resolving…" : "Resolve"}
      </button>
      {msg && <span className="text-xs text-ink-500">{msg}</span>}
    </div>
  );
}
