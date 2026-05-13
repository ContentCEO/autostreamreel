"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewBusinessForm({ defaultOpen }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen]       = useState(Boolean(defaultOpen));
  const [name, setName]       = useState("");
  const [industry, setInd]    = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create business");
      return;
    }
    setOpen(false); setName(""); setInd("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">+ Add business</button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ink-500">Name</span>
          <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ink-500">Industry</span>
          <input className="input mt-1" value={industry} onChange={(e) => setInd(e.target.value)} placeholder="Cleaning services, agency, …" />
        </label>
      </div>
      <p className="text-xs text-ink-500">Creating a business instantiates the full org chart: 1 CEO, 3 VPs, 2 assistant managers, and 48 IC agents.</p>
      {error && <p className="text-sm text-danger-500">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">{busy ? "Creating…" : "Create + seed team"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
