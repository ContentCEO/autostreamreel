"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Mic, MicOff, Monitor } from "lucide-react";
import { speak, listenOnce, isListenSupported } from "@/lib/speech";
import { VoiceToggle } from "@/components/VoiceToggle";
import { ComputerUsePanel } from "@/components/ComputerUsePanel";
import { isDesktop } from "@/lib/desktop";

interface Msg { role: "user" | "assistant"; content: string }

export function JarvisPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Online. What's the move?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy]   = useState(false);
  const [listening, setListening] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);
  const [showTakeover, setShowTakeover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stopRef   = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { setShowTakeover(isDesktop()); }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Mirror spoken-utterance turns from ContinuousJarvis into the panel.
  useEffect(() => {
    function onTurn(e: Event) {
      const d = (e as CustomEvent<{ user: string; assistant: string }>).detail;
      setMessages((cur) => [
        ...cur,
        { role: "user", content: d.user },
        { role: "assistant", content: d.assistant },
      ]);
    }
    window.addEventListener("cc:jarvis-turn", onTurn);
    return () => window.removeEventListener("cc:jarvis-turn", onTurn);
  }, []);

  async function send(text: string) {
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.reply ?? "(no response)";
      setMessages([...next, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const reply = "Sorry, I couldn't reach the brain.";
      setMessages([...next, { role: "assistant", content: reply }]);
      speak(reply);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    await send(text);
  }

  function toggleListen() {
    if (listening) { stopRef.current?.stop(); return; }
    if (!isListenSupported()) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    setListening(true);
    stopRef.current = listenOnce({
      onResult: (transcript) => {
        setListening(false);
        setInput("");
        send(transcript);
      },
      onError:  () => setListening(false),
      onEnd:    () => setListening(false),
    });
  }

  return (
    <aside className="hidden lg:flex w-96 shrink-0 border-l border-ink-800 bg-ink-900/40 flex-col">
      <header className="px-4 py-3 border-b border-ink-800 flex items-center gap-2 flex-wrap">
        <Sparkles size={14} className="text-accent-400" />
        <div className="text-sm font-medium">Jarvis</div>
        <span className="badge bg-success-500/20 text-success-500">online</span>
        {showTakeover && (
          <button
            type="button"
            onClick={() => setComputerOpen(true)}
            title="Computer Use — let Jarvis drive this Mac"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-ink-800 text-ink-400 hover:border-accent-500/40 hover:text-accent-300"
          >
            <Monitor size={12} /> Take over
          </button>
        )}
        <div className="ml-auto"><VoiceToggle /></div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-accent-500/15 px-3 py-2 text-sm" : "max-w-[85%] rounded-lg bg-ink-800 px-3 py-2 text-sm"}>
            {m.content}
          </div>
        ))}
        {busy && <div className="text-xs text-ink-500">thinking…</div>}
        {listening && <div className="text-xs text-accent-400">listening…</div>}
      </div>

      <form onSubmit={submit} className="p-3 border-t border-ink-800 flex gap-2">
        <button
          type="button"
          onClick={toggleListen}
          disabled={busy}
          title={listening ? "Stop listening" : "Talk to Jarvis"}
          className={`btn-ghost px-2 ${listening ? "text-accent-300 bg-accent-500/10 border-accent-500/40" : ""}`}
        >
          {listening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Tell Jarvis what to do"}
          className="input flex-1"
          disabled={busy || listening}
        />
        <button className="btn-primary" disabled={busy}><Send size={14} /></button>
      </form>
      {computerOpen && <ComputerUsePanel onClose={() => setComputerOpen(false)} />}
    </aside>
  );
}
