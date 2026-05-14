"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Workflow, Download } from "lucide-react";

interface Business { id: string; name: string }

export function ContractorFlowSync({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [bizId, setBizId] = useState(businesses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/contractorflow/sync").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  async function sync() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/integrations/contractorflow/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: bizId || undefined }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error ?? "sync failed"); return; }
      setMsg(`Pulled ${j.pulled}, inserted ${j.inserted}, skipped ${j.skipped}.${j.errors?.length ? ` ${j.errors.length} errors.` : ""}`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Workflow size={14} className="text-accent-400" /> Pull leads from ContractorFlow
      </div>
      {!status ? (
        <p className="text-xs text-ink-500">Checking integration status…</p>
      ) : !status.configured ? (
        <p className="text-xs text-ink-500">
          Not configured. Set <code>CONTRACTORFLOW_SUPABASE_URL</code> and <code>CONTRACTORFLOW_SUPABASE_SERVICE_ROLE_KEY</code> in env, then reload.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <select className="input" value={bizId} onChange={(e) => setBizId(e.target.value)}>
              <option value="">— assign to no business —</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={sync} disabled={busy} className="btn-primary inline-flex items-center gap-1">
              <Download size={12} /> {busy ? "Pulling…" : "Sync now"}
            </button>
          </div>
          {msg && <p className="text-xs text-ink-400">{msg}</p>}
          <p className="text-xs text-ink-500">Dedupes by email or phone. Status mapped from CF (new/contacted/qualified/won/lost). Source tagged &ldquo;ContractorFlow&rdquo;.</p>
        </>
      )}
    </div>
  );
}
