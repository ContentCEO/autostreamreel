"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneOutgoing, MessageSquare, Mail } from "lucide-react";

interface Props {
  businessId: string | null;
  targetKind: "client" | "customer" | "lead";
  targetId: string;
  canSms: boolean;     // true if outbound.sms permission is on
  canCall: boolean;
  canEmail: boolean;
}

// Inline row action — schedules an outbound for "now" and immediately drains
// it. One click sends. If the kill switch for that channel is off, the
// scheduled row stays in the queue (status=failed with reason).
export function RowOutbound({ businessId, targetKind, targetId, canSms, canCall, canEmail }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sms" | "call" | "email" | null>(null);
  const [msg, setMsg]   = useState<string | null>(null);

  async function fire(channel: "sms" | "call" | "email") {
    setBusy(channel); setMsg(null);
    try {
      const r = await fetch("/api/outbound/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          single: {
            business_id: businessId,
            target_kind: targetKind,
            target_id:   targetId,
            channel,
            scheduled_at: new Date().toISOString(),
          },
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.id) { setMsg(j.error ?? "scheduling failed"); return; }
      const run = await fetch("/api/outbound/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: j.id }),
      });
      const runJ = await run.json();
      const first = runJ.results?.[0];
      setMsg(first ? (first.ok ? "Sent ✓" : `failed: ${first.detail}`) : "queued");
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <div className="flex items-center gap-1">
      <Btn icon={MessageSquare} label="SMS"   on={canSms}   busy={busy === "sms"}   onClick={() => fire("sms")} />
      <Btn icon={PhoneOutgoing} label="Call"  on={canCall}  busy={busy === "call"}  onClick={() => fire("call")} />
      <Btn icon={Mail}          label="Email" on={canEmail} busy={busy === "email"} onClick={() => fire("email")} />
      {msg && <span className="text-xs text-ink-500 ml-2">{msg}</span>}
    </div>
  );
}

function Btn({
  icon: Icon, label, on, busy, onClick,
}: {
  icon: typeof PhoneOutgoing; label: string; on: boolean; busy: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={on ? `Send ${label.toLowerCase()} now` : `${label} kill switch is off — go to Outbound to enable`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
        on ? "border-ink-700 hover:border-accent-500 text-ink-300" : "border-ink-800 text-ink-500"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Icon size={11} /> {label}
    </button>
  );
}
