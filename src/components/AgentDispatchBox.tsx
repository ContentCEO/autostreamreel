"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Sparkles } from "lucide-react";

// Inline "give this agent a job right now" composer. Calls /api/agents/run
// which already records the response as a completed task.
export function AgentDispatchBox({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setBusy(true); setError(null); setOutput(null);
    try {
      const r = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, instruction }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? "Run failed"); return; }
      setOutput(j.output ?? "");
      setInstruction("");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={run} className="card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={14} className="text-accent-400" /> Dispatch {agentName}
      </div>
      <textarea
        className="input min-h-[80px]"
        placeholder={`Tell ${agentName} what to do. Example: "Draft a follow-up to the top 3 stalled deals in pipeline."`}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button className="btn-primary inline-flex items-center gap-1" disabled={busy || !instruction.trim()}>
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
