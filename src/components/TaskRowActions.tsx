"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export function TaskRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (status === "done") return <span className="text-xs text-success-500">done</span>;

  async function patch(next: { status?: string }) {
    setBusy(true);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-1">
      {status === "pending" && (
        <button onClick={() => patch({ status: "in_progress" })} disabled={busy} className="btn-ghost text-xs inline-flex items-center gap-1">
          <Loader2 size={12} /> Start
        </button>
      )}
      <button onClick={() => patch({ status: "done" })} disabled={busy} className="btn-ghost text-xs inline-flex items-center gap-1">
        <Check size={12} /> Done
      </button>
    </div>
  );
}
