"use client";

import { useMemo, useState } from "react";
import { AGENTS, AGENT_CATEGORIES } from "@/lib/agents";

export default function AgentOS() {
  const [selectedId, setSelectedId] = useState(AGENTS[0].id);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const agent = useMemo(() => AGENTS.find((a) => a.id === selectedId), [selectedId]);
  const grouped = useMemo(() => {
    const out = {};
    for (const cat of AGENT_CATEGORIES) out[cat] = AGENTS.filter((a) => a.category === cat);
    return out;
  }, []);

  function selectAgent(id) {
    setSelectedId(id);
    setValues({});
    setOutput("");
    setError(null);
  }

  function setField(key, v) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function runAgent(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOutput("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Run failed");
        return;
      }
      setOutput(data.output ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar — agent picker */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">AgentOS</div>
          <h1 className="text-lg font-semibold mt-0.5">16 specialists</h1>
          <p className="text-xs text-zinc-500 mt-1">Pick one. Fill the inputs. Get publish-ready output.</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {AGENT_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.32em] text-zinc-500">{cat}</div>
              <ul className="space-y-0.5">
                {grouped[cat].map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => selectAgent(a.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition
                          ${active
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"}`}
                      >
                        <div className="font-medium">{a.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{a.tagline}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main — input form + output */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="px-8 py-5 border-b border-zinc-800">
          <div className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">{agent.category}</div>
          <h2 className="text-2xl font-semibold mt-0.5">{agent.name} Agent</h2>
          <p className="text-sm text-zinc-400 mt-1">{agent.tagline}</p>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <form onSubmit={runAgent} className="space-y-4">
            {agent.inputs.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">{f.label}</span>
                {f.multiline ? (
                  <textarea
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full min-h-[110px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                  />
                )}
              </label>
            ))}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {busy ? "Running…" : `Run ${agent.name} Agent`}
              </button>
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          </form>

          {/* Output */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 flex flex-col">
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">Output</span>
              {output && (
                <button
                  onClick={copyOutput}
                  className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {busy && <span className="text-zinc-500">thinking…</span>}
              {!busy && !output && <span className="text-zinc-600">Run the agent and the output will appear here.</span>}
              {output}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
