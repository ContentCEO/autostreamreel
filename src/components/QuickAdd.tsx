"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Field {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "datetime-local" | "textarea";
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;        // grid columns to span
  options?: { value: string; label: string }[]; // renders <select> when provided
  defaultValue?: string;
  centsField?: boolean; // multiplies the entered dollar value by 100 on submit
}

interface Business { id: string; name: string }

interface Props {
  title: string;
  endpoint: string;
  businesses: Business[];
  fields: Field[];
}

export function QuickAdd({ title, endpoint, businesses, fields }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) if (f.defaultValue) init[f.key] = f.defaultValue;
    return init;
  });
  const [bizId, setBizId] = useState<string>(businesses[0]?.id ?? "");

  function set(k: string, v: string) { setValues((s) => ({ ...s, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const payload: Record<string, unknown> = { business_id: bizId || undefined };
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === "") continue;
      if (f.centsField) {
        const n = Number(v);
        if (!Number.isFinite(n)) { setError(`${f.label} must be a number`); setBusy(false); return; }
        payload[f.key] = Math.round(n * 100);
      } else if (f.type === "number") {
        const n = Number(v);
        if (!Number.isFinite(n)) { setError(`${f.label} must be a number`); setBusy(false); return; }
        payload[f.key] = n;
      } else {
        payload[f.key] = v;
      }
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    setValues({}); setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm">+ {title}</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {businesses.length > 0 && (
          <label className="block md:col-span-2">
            <span className="text-xs uppercase tracking-widest text-ink-500">Business</span>
            <select className="input mt-1" value={bizId} onChange={(e) => setBizId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        {fields.map((f) => (
          <label key={f.key} className={`block ${f.span === 2 ? "md:col-span-2" : ""}`}>
            <span className="text-xs uppercase tracking-widest text-ink-500">{f.label}{f.required ? " *" : ""}</span>
            {f.options ? (
              <select className="input mt-1" required={f.required}
                      value={values[f.key] ?? f.defaultValue ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea className="input mt-1 min-h-[80px]" required={f.required}
                        placeholder={f.placeholder}
                        value={values[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input className="input mt-1" required={f.required}
                     type={f.type ?? "text"} placeholder={f.placeholder}
                     value={values[f.key] ?? ""}
                     onChange={(e) => set(f.key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-danger-500">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
