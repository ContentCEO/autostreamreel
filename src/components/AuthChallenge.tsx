"use client";

import { useEffect, useRef, useState } from "react";
import { JarvisOrb } from "@/components/JarvisOrb";
import { speak, cancelSpeech, listenOnce } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";

type Phase =
  | "checking"        // probing /api/auth/challenge for config
  | "name-prompt"     // speaking "State your name."
  | "name-listening"
  | "code-prompt"     // speaking "Authentication code, please."
  | "code-listening"
  | "verifying"
  | "denied"
  | "granted";

// Voice-driven entry challenge. On first session load (after sign-in to the
// app), Jarvis asks for the owner's name, then a 4-digit code. Both are
// verified server-side against OWNER_NAME / OWNER_CODE. A keypad is shown
// as a fallback for the code if speech is unavailable.
//
// When the challenge isn't configured (no env vars), this component
// resolves immediately and hands control back to the layout.
export function AuthChallenge({ onPass }: { onPass: () => void }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [keypad, setKeypad] = useState<string>("");
  const heardNameRef = useRef<string>("");

  useEffect(() => {
    if (sessionStorage.getItem("cc_authed") === "1") {
      onPass();
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/auth/challenge");
        const j = await r.json();
        if (!j.required) {
          sessionStorage.setItem("cc_authed", "1");
          onPass();
          return;
        }
        startNamePrompt();
      } catch {
        sessionStorage.setItem("cc_authed", "1");
        onPass();
      }
    })();
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNamePrompt() {
    setPhase("name-prompt");
    setOrbState("speaking");
    speak("Welcome. Please state your name to continue.");
    // Start listening after the speech finishes — a tight 1.6s budget.
    setTimeout(() => {
      setPhase("name-listening");
      setOrbState("listening");
      listenOnce({
        onResult: (transcript) => {
          heardNameRef.current = transcript;
          startCodePrompt();
        },
        onError: () => { setError("Couldn't hear you. Click the orb to retry."); setPhase("denied"); setOrbState("idle"); },
        onEnd:   () => { /* result handler already fires */ },
      });
    }, 1800);
  }

  function startCodePrompt() {
    setPhase("code-prompt");
    setOrbState("speaking");
    speak("Authentication code, please.");
    setTimeout(() => {
      setPhase("code-listening");
      setOrbState("listening");
      listenOnce({
        onResult: (transcript) => {
          const digits = transcript.replace(/\D/g, "").slice(0, 8);
          verify(heardNameRef.current, digits);
        },
        // No speech recognized? Keep listening visually but show the keypad.
        onError: () => setPhase("code-listening"),
        onEnd:   () => { /* handled by onResult */ },
      });
    }, 1400);
  }

  async function verify(name: string, code: string) {
    setPhase("verifying");
    setOrbState("thinking");
    try {
      const r = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });
      const j = await r.json();
      if (j.ok) {
        setPhase("granted");
        setOrbState("speaking");
        speak("Welcome back.");
        sessionStorage.setItem("cc_authed", "1");
        setTimeout(onPass, 1200);
      } else {
        const msg = !j.nameOk && !j.codeOk ? "Name and code didn't match."
                  : !j.nameOk ? "Name didn't match."
                  : "Code didn't match.";
        setError(msg);
        setPhase("denied");
        setOrbState("idle");
        speak("Access denied.");
      }
    } catch {
      setError("Couldn't reach the server.");
      setPhase("denied");
      setOrbState("idle");
    }
  }

  function submitKeypad() {
    if (keypad.length < 3) return;
    verify(heardNameRef.current || "owner", keypad);
  }

  function retry() {
    setError(null);
    setKeypad("");
    heardNameRef.current = "";
    startNamePrompt();
  }

  const prompt =
    phase === "checking"         ? "" :
    phase === "name-prompt"      ? "State your name…" :
    phase === "name-listening"   ? "Listening for your name." :
    phase === "code-prompt"      ? "Code, please…" :
    phase === "code-listening"   ? "Listening for the code. Or use the keypad." :
    phase === "verifying"        ? "Verifying…" :
    phase === "granted"          ? "Authenticated." :
    "Access denied.";

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      <JarvisOrb size={300} count={1200} state={phase === "name-listening" || phase === "code-listening" ? "listening" : phase === "verifying" ? "thinking" : phase === "granted" || phase === "name-prompt" || phase === "code-prompt" ? "speaking" : "idle"} label="JARVIS" />

      <div
        className="mt-10 tabular-nums"
        style={{
          fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: "0.32em",
          color: "rgba(220, 240, 255, 0.92)",
        }}
      >
        ACCESS REQUIRED
      </div>
      <div
        className="mt-2 text-[11px] tracking-[0.28em] uppercase text-ink-400"
      >
        {prompt}
      </div>
      {error && <div className="mt-4 text-xs text-danger-400">{error}</div>}

      {/* Keypad fallback — visible during code phase or denied state. */}
      {(phase === "code-listening" || phase === "denied") && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="font-mono tracking-[0.4em] text-2xl tabular-nums" style={{ color: "rgba(220, 240, 255, 0.95)" }}>
            {keypad ? "•".repeat(keypad.length) : "_ _ _ _"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <button key={d} onClick={() => setKeypad((s) => (s + d).slice(0, 8))}
                className="w-12 h-12 rounded-full border border-ink-800 text-ink-200 hover:bg-ink-800 transition">{d}</button>
            ))}
            <button onClick={() => setKeypad((s) => s.slice(0, -1))}
              className="w-12 h-12 rounded-full border border-ink-800 text-ink-400 hover:bg-ink-800 transition">←</button>
            <button onClick={() => setKeypad((s) => (s + "0").slice(0, 8))}
              className="w-12 h-12 rounded-full border border-ink-800 text-ink-200 hover:bg-ink-800 transition">0</button>
            <button onClick={submitKeypad}
              className="w-12 h-12 rounded-full border border-accent-500/50 text-accent-300 hover:bg-accent-500/10 transition">✓</button>
          </div>
        </div>
      )}

      {phase === "denied" && (
        <button onClick={retry} className="mt-8 btn-primary text-xs">Try again</button>
      )}
    </div>
  );
}
