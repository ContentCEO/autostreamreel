"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export function AlertRowActions({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (resolved) return <span className="text-xs text-ink-500">resolved</span>;

  async function resolve() {
    setBusy(true);
    try {
      await fetch(`/api/alerts/${id}/resolve`, { method: "POST" });
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button onClick={resolve} disabled={busy} className="btn-ghost text-xs inline-flex items-center gap-1">
      <Check size={12} /> {busy ? "Resolving…" : "Resolve"}
    </button>
  );
}
