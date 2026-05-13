"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

export function JarvisPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Online. What's the move?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "(no response)" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't reach the brain." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="hidden lg:flex w-96 shrink-0 border-l border-ink-800 bg-ink-900/40 flex-col">
      <header className="px-4 py-3 border-b border-ink-800 flex items-center gap-2">
        <Sparkles size={14} className="text-accent-400" />
        <div className="text-sm font-medium">Jarvis</div>
        <span className="ml-auto badge bg-success-500/20 text-success-500">online</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-accent-500/15 px-3 py-2 text-sm" : "max-w-[85%] rounded-lg bg-ink-800 px-3 py-2 text-sm"}>
            {m.content}
          </div>
        ))}
        {busy && <div className="text-xs text-ink-500">thinking…</div>}
      </div>

      <form onSubmit={submit} className="p-3 border-t border-ink-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell Jarvis what to do"
          className="input flex-1"
          disabled={busy}
        />
        <button className="btn-primary" disabled={busy}><Send size={14} /></button>
      </form>
    </aside>
  );
}
