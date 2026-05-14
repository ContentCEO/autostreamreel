"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, MicOff, Monitor } from "lucide-react";
import { speak, listenOnce, isListenSupported } from "@/lib/speech";
import { VoiceToggle } from "@/components/VoiceToggle";
import { ComputerUsePanel } from "@/components/ComputerUsePanel";
import { JarvisOrb, type OrbState } from "@/components/JarvisOrb";
import { isDesktop } from "@/lib/desktop";
import { subscribeOrbState, setOrbState } from "@/lib/orb-state";

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
  const [orb, setOrb] = useState<OrbState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stopRef   = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { setShowTakeover(isDesktop()); }, []);
  useEffect(() => subscribeOrbState(setOrb), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    setOrbState("thinking");
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
    setOrbState("listening");
    stopRef.current = listenOnce({
      onResult: (transcript) => {
        setListening(false);
        setInput("");
        send(transcript);
      },
      onError:  () => { setListening(false); setOrbState("idle"); },
      onEnd:    () => { setListening(false); },
    });
  }

  const statusLabel =
    orb === "speaking"  ? "speaking" :
    orb === "thinking"  ? "thinking" :
    orb === "listening" ? "listening" : "online";

  return (
    <aside className="hidden lg:flex w-96 shrink-0 border-l border-ink-800 bg-ink-900/40 flex-col">
      {/* Persistent orb at the top — always visible, always animating. */}
      <div className="px-4 pt-6 pb-3 border-b border-ink-800 flex flex-col items-center gap-2">
        <JarvisOrb size={180} count={1100} state={orb} label="JARVIS" />
        <div className="flex items-center gap-2 mt-1">
          <span className={`badge ${
            orb === "speaking"  ? "bg-accent-500/20 text-accent-300" :
            orb === "thinking"  ? "bg-warn-500/20 text-warn-500" :
            orb === "listening" ? "bg-success-500/20 text-success-500" :
                                  "bg-ink-800 text-ink-300"
          }`}>{statusLabel}</span>
          {showTakeover && (
            <button
              type="button"
              onClick={() => setComputerOpen(true)}
              title="Computer Use — let Jarvis drive this Mac"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border border-ink-800 text-ink-400 hover:border-accent-500/40 hover:text-accent-300"
            >
              <Monitor size={11} /> Take over
            </button>
          )}
        </div>
        <div className="w-full flex items-center justify-center"><VoiceToggle /></div>
      </div>

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
          title={listening ? "Stop listening" : "Push-to-talk to Jarvis"}
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
