"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Play } from "lucide-react";

interface Agent { id: string; name: string; role: string }

interface Props {
  contactKind: "client" | "customer" | "lead";
  contactName: string;
  agents: Agent[];
}

// "Have an agent take this on" — picks one of the contact's business's agents
// and dispatches them with an instruction that already names the contact.
export function ContactAgentDispatch({ contactKind, contactName, agents }: Props) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (agents.length === 0) {
    return null;
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim() || !agentId) return;
    setBusy(true); setError(null); setOutput(null);
    try {
      const instruction = `Work on this ${contactKind}: "${contactName}". ${task.trim()}`;
      const r = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, instruction }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? "Failed"); return; }
      setOutput(j.output ?? "");
      setTask("");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={run} className="card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={14} className="text-accent-400" /> Have an agent handle this
      </div>
      <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
        ))}
      </select>
      <textarea
        className="input min-h-[80px]"
        placeholder={`What should they do for ${contactName}? e.g. "Draft a renewal email referencing their usage in the last 30 days."`}
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button className="btn-primary inline-flex items-center gap-1" disabled={busy || !task.trim()}>
          <Play size={12} /> {busy ? "Running…" : "Run now"}
        </button>
        {error && <span className="text-xs text-danger-500">{error}</span>}
      </div>
      {output && (
        <div className="mt-2 border-t border-ink-800 pt-3">
          <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Latest output</div>
          <p className="text-sm text-ink-200 whitespace-pre-wrap">{output}</p>
        </div>
      )}
    </form>
  );
}
