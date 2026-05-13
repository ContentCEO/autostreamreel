"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X, Trash2 } from "lucide-react";

interface Field {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "textarea";
  options?: { value: string; label: string }[];
  centsField?: boolean;
}

interface Props {
  id: string;
  endpoint: string;        // e.g. /api/clients/<id>
  listHref: string;        // navigated to after delete
  initial: Record<string, string | number | null>;
  fields: Field[];
}

export function ContactEdit({ id, endpoint, listHref, initial, fields }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      const raw = initial[f.key];
      if (raw == null) { v[f.key] = ""; continue; }
      v[f.key] = f.centsField && typeof raw === "number" ? String(raw / 100) : String(raw);
    }
    return v;
  });

  function set(k: string, v: string) { setValues((s) => ({ ...s, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.centsField) {
        payload[f.key] = v === "" ? null : Math.round(Number(v) * 100);
      } else if (f.type === "number") {
        payload[f.key] = v === "" ? null : Number(v);
      } else {
        payload[f.key] = v;
      }
    }
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this record permanently?")) return;
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Delete failed");
      return;
    }
    router.push(listHref);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-ghost text-xs inline-flex items-center gap-1">
          <Pencil size={12} /> Edit
        </button>
        <button onClick={remove} disabled={busy} className="btn-ghost text-xs inline-flex items-center gap-1 text-danger-400">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs uppercase tracking-widest text-ink-500">{f.label}</span>
            {f.options ? (
              <select className="input mt-1" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea className="input mt-1 min-h-[80px]" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input className="input mt-1" type={f.type ?? "text"} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-danger-500">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary inline-flex items-center gap-1"><Save size={12} /> {busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost inline-flex items-center gap-1"><X size={12} /> Cancel</button>
      </div>
      <input type="hidden" value={id} readOnly />
    </form>
  );
}
