"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, PhoneOutgoing, MessageSquare, Mail } from "lucide-react";

interface Props {
  businessId: string | null;
  targetKind: "client" | "customer" | "lead";
  targetId:   string;
  canSms: boolean; canCall: boolean; canEmail: boolean;
}

// Compose-and-send box for a specific contact. Drafts a script with Claude,
// lets the owner tweak, then schedules + drains in one click.
export function OneOffOutbound({ businessId, targetKind, targetId, canSms, canCall, canEmail }: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState<"sms" | "call" | "email">("sms");
  const [note, setNote]       = useState("");
  const [script, setScript]   = useState("");
  const [busy, setBusy]       = useState<"draft" | "send" | null>(null);
  const [status, setStatus]   = useState<string | null>(null);

  const enabled = channel === "sms" ? canSms : channel === "call" ? canCall : canEmail;

  async function draft() {
    setBusy("draft"); setStatus(null);
    try {
      const r = await fetch("/api/outbound/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_kind: targetKind, target_id: targetId, channel, note }),
      });
      const j = await r.json();
      if (!r.ok) { setStatus(j.error ?? "draft failed"); return; }
      setScript(j.script ?? "");
    } finally { setBusy(null); }
  }

  async function send() {
    setBusy("send"); setStatus(null);
    try {
      const r = await fetch("/api/outbound/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          single: {
            business_id: businessId, target_kind: targetKind, target_id: targetId,
            channel, script: script || undefined,
            scheduled_at: new Date().toISOString(),
          },
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.id) { setStatus(j.error ?? "schedule failed"); return; }
      const run = await fetch("/api/outbound/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: j.id }),
      });
      const runJ = await run.json();
      const first = runJ.results?.[0];
      setStatus(first ? (first.ok ? "Sent ✓" : `failed: ${first.detail}`) : "queued");
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={14} className="text-accent-400" /> One-off reach-out
      </div>
      <div className="flex gap-1">
        <ChanBtn icon={MessageSquare}    label="SMS"   value="sms"   active={channel} on={setChannel} disabled={!canSms} />
        <ChanBtn icon={PhoneOutgoing}    label="Call"  value="call"  active={channel} on={setChannel} disabled={!canCall} />
        <ChanBtn icon={Mail}             label="Email" value="email" active={channel} on={setChannel} disabled={!canEmail} />
      </div>
      <textarea
        className="input min-h-[60px]"
        placeholder="Optional context for the draft — what to mention, what to ask."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={draft} disabled={busy !== null} className="btn-ghost text-sm inline-flex items-center gap-1">
          <Sparkles size={12} /> {busy === "draft" ? "Drafting…" : "Draft script"}
        </button>
      </div>
      <textarea
        className="input min-h-[120px]"
        placeholder="Script will appear here after drafting. You can also write your own."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={send}
          disabled={busy !== null || !script || !enabled}
          title={!enabled ? `${channel} kill switch is off` : ""}
          className="btn-primary inline-flex items-center gap-1"
        >
          <Send size={12} /> {busy === "send" ? "Sending…" : `Send now`}
        </button>
        {status && <span className="text-xs text-ink-400">{status}</span>}
        {!enabled && <span className="text-xs text-warn-500">{channel} disabled in kill switches</span>}
      </div>
    </div>
  );
}

function ChanBtn({
  icon: Icon, label, value, active, on, disabled,
}: {
  icon: typeof PhoneOutgoing; label: string;
  value: "sms" | "call" | "email";
  active: "sms" | "call" | "email";
  on: (v: "sms" | "call" | "email") => void;
  disabled: boolean;
}) {
  const on_ = active === value;
  return (
    <button
      type="button"
      onClick={() => on(value)}
      title={disabled ? `${label} disabled in kill switches` : ""}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
        on_ ? "border-accent-500 text-accent-300 bg-accent-500/10"
            : disabled ? "border-ink-800 text-ink-600"
            : "border-ink-800 text-ink-300"
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}
