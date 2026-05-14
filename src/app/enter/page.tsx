"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JarvisOrb } from "@/components/JarvisOrb";
import { speak, listenOnce, isListenSupported, isVoiceEnabled, setVoiceEnabled } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";

// Replacement front door. No email, no password, no magic link. Just the
// orb and a 4-8 digit PIN. The code is verified server-side and translated
// into a real Supabase session under the hood.
export default function EnterPage() {
  const router = useRouter();
  const [now, setNow] = useState<Date>(() => new Date());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeted, setGreeted] = useState(false);
  const greetedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // First-time speakers need a user gesture before audio plays. Greet on
  // first click anywhere — but only once.
  useEffect(() => {
    if (greetedRef.current) return;
    function greetOnClick() {
      if (greetedRef.current) return;
      greetedRef.current = true;
      setGreeted(true);
      if (!isVoiceEnabled()) setVoiceEnabled(true);
      setOrbState("speaking");
      speak("Access required. State your code.");
    }
    window.addEventListener("click", greetOnClick, { once: true });
    window.addEventListener("keydown", greetOnClick, { once: true });
    return () => {
      window.removeEventListener("click", greetOnClick);
      window.removeEventListener("keydown", greetOnClick);
    };
  }, []);

  async function submit(value: string) {
    if (busy) return;
    setBusy(true); setError(null);
    setOrbState("thinking");
    try {
      const r = await fetch("/api/owner/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? "Wrong code.");
        setCode("");
        setOrbState("idle");
        speak("Access denied.");
        return;
      }
      setOrbState("speaking");
      speak("Welcome back.");
      // Tiny delay so the welcome plays before the redirect.
      setTimeout(() => router.push("/cc"), 900);
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    setCode((s) => {
      const next = (s + d).slice(0, 8);
      if (next.length === 8) {
        // 8 digits = the default code length. Auto-submit.
        setTimeout(() => submit(next), 100);
      }
      return next;
    });
  }
  function back() { setCode((s) => s.slice(0, -1)); }

  function listen() {
    if (!isListenSupported()) return;
    setOrbState("listening");
    listenOnce({
      onResult: (t) => {
        const digits = t.replace(/\D/g, "").slice(0, 8);
        if (digits) {
          setCode(digits);
          submit(digits);
        } else {
          setOrbState("idle");
        }
      },
      onError: () => setOrbState("idle"),
      onEnd:   () => setOrbState("idle"),
    });
  }

  // Keyboard shortcut: typing digits also fills the code.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); press(e.key); }
      else if (e.key === "Backspace")  { e.preventDefault(); back(); }
      else if (e.key === "Enter" && code.length > 0) { e.preventDefault(); submit(code); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, busy]);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dayName  = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dayNum   = now.getDate();
  const monthName = now.toLocaleDateString(undefined, { month: "long" }).toUpperCase();

  return (
    <main className="fixed inset-0 bg-black flex flex-col items-center justify-center text-ink-100 select-none">
      <JarvisOrb size={320} count={1300} state={busy ? "thinking" : "idle"} label="JARVIS" />

      <div
        className="mt-8 tabular-nums"
        style={{
          fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 64,
          letterSpacing: "0.18em",
          color: "rgba(230, 245, 255, 0.95)",
          textShadow: "0 0 14px rgba(77, 184, 255, 0.35)",
        }}
      >
        {hh}<span style={{ opacity: 0.55 }}>:</span>{mm}
      </div>

      <div
        className="mt-1 text-xs"
        style={{
          fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
          fontWeight: 400,
          letterSpacing: "0.32em",
          color: "rgba(180, 200, 220, 0.7)",
        }}
      >
        {dayName} {dayNum} {monthName}
      </div>

      <div className="mt-10 text-[11px] tracking-[0.32em] uppercase text-ink-400">
        ACCESS CODE
      </div>

      <div className="mt-3 font-mono tracking-[0.5em] text-3xl tabular-nums h-10" style={{ color: "rgba(220, 240, 255, 0.95)" }}>
        {code ? "•".repeat(code.length) + "_".repeat(Math.max(0, 8 - code.length)).replaceAll("_", " _") : "_ _ _ _ _ _ _ _"}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button key={d} onClick={() => press(d)}
                  className="w-14 h-14 rounded-full border border-ink-800 text-ink-200 text-lg hover:border-accent-500/40 hover:bg-accent-500/5 transition">{d}</button>
        ))}
        <button onClick={listen} title="Speak the code"
                className="w-14 h-14 rounded-full border border-ink-800 text-ink-400 hover:border-accent-500/40 hover:text-accent-300 transition">🎤</button>
        <button onClick={() => press("0")}
                className="w-14 h-14 rounded-full border border-ink-800 text-ink-200 text-lg hover:border-accent-500/40 hover:bg-accent-500/5 transition">0</button>
        <button onClick={back}
                className="w-14 h-14 rounded-full border border-ink-800 text-ink-400 hover:border-accent-500/40 transition">←</button>
      </div>

      {error && <div className="mt-4 text-xs text-danger-400">{error}</div>}
      {!greeted && <div className="mt-6 text-[10px] tracking-[0.32em] uppercase text-ink-600">click or press a key to begin</div>}
    </main>
  );
}
