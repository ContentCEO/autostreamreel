"use client";

import { useState } from "react";
import { PhoneOutgoing, MessageSquare, Mail, PlayCircle } from "lucide-react";

interface Business { id: string; name: string }

export function OutboundControls({ businesses }: { businesses: Business[] }) {
  const [bizId, setBizId] = useState<string>(businesses[0]?.id ?? "");
  const [channel, setChannel] = useState<"sms" | "call" | "email">("sms");
  const [cadence, setCadence] = useState(7);
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function schedule() {
    if (!bizId) { setMsg("Pick a business."); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/outbound/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: bizId, channel, cadence_days: cadence, count }),
      });
      const j = await r.json();
      setMsg(r.ok ? `Scheduled ${j.created} check-ins.` : `Failed: ${j.error}`);
    } finally { setBusy(false); }
  }

  async function runDue() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/outbound/run", { method: "POST", body: "{}" });
      const j = await r.json();
      setMsg(r.ok ? `Ran ${j.ran} due item(s).` : `Failed: ${j.error}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="text-sm font-medium">Run the call/text squad</div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <select className="input" value={bizId} onChange={(e) => setBizId(e.target.value)}>
          {businesses.length === 0 && <option value="">No businesses yet</option>}
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex gap-1">
          <ChanBtn icon={MessageSquare}    label="SMS"   value="sms"   active={channel} on={setChannel} />
          <ChanBtn icon={PhoneOutgoing}    label="Call"  value="call"  active={channel} on={setChannel} />
          <ChanBtn icon={Mail}             label="Email" value="email" active={channel} on={setChannel} />
        </div>
        <input className="input" type="number" min={1} max={30} value={cadence}
               onChange={(e) => setCadence(Number(e.target.value))}
               aria-label="Cadence (days)" placeholder="Cadence days" />
        <input className="input" type="number" min={1} max={20} value={count}
               onChange={(e) => setCount(Number(e.target.value))}
               aria-label="Occurrences per client" placeholder="Occurrences" />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={schedule}>Schedule</button>
          <button className="btn-ghost flex items-center gap-1" disabled={busy} onClick={runDue}>
            <PlayCircle size={14} /> Run due
          </button>
        </div>
      </div>
      {msg && <div className="text-xs text-ink-400">{msg}</div>}
      <div className="text-xs text-ink-500">
        Schedules every active client of the chosen business on the given cadence.
        Outbound only fires if the matching kill switch is on.
      </div>
    </div>
  );
}

function ChanBtn({
  icon: Icon, label, value, active, on,
}: {
  icon: typeof PhoneOutgoing;
  label: string;
  value: "sms" | "call" | "email";
  active: "sms" | "call" | "email";
  on: (v: "sms" | "call" | "email") => void;
}) {
  const on_ = active === value;
  return (
    <button
      type="button"
      onClick={() => on(value)}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
        on_ ? "border-accent-500 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-300"
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}
