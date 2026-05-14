"use client";

import { useEffect, useState } from "react";
import { JarvisOrb } from "@/components/JarvisOrb";
import { speak, cancelSpeech, isVoiceEnabled, getListenMode, setListenMode } from "@/lib/speech";

const BOOT_LINES = [
  "Booting Control Center.",
  "Authenticating owner session.",
  "Connecting to Supabase…",
  "Loading agent roster.",
  "Querying live pipeline.",
  "Reading open alerts.",
  "Preparing briefing.",
];

// Fullscreen "Jarvis boot" overlay shown on first /cc load per session.
// Matches the huwprosser reference: black background, centered blue particle
// sphere with JARVIS inside, large HH:MM clock + DAY DATE MONTH below.
// Speaks the live briefing through the speech layer (ElevenLabs when
// configured, browser TTS fallback). Fades out when the briefing finishes,
// or when the user clicks anywhere on screen.
export function BootSequence() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading]   = useState(false);
  const [now, setNow]         = useState<Date>(() => new Date());
  const [statusIndex, setStatusIndex] = useState(0);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Skip the boot screen once per browser session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("cc_boot_done") === "1") {
      setVisible(false);
    }
  }, []);

  // Live clock at 1s resolution.
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [visible]);

  // Cycle the status lines while we boot.
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 550);
    return () => clearInterval(t);
  }, [visible]);

  // Fetch + speak the briefing while the boot screen is up.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/briefing");
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        if (j.body) {
          setBriefingText(j.body);
          if (isVoiceEnabled()) {
            setSpeaking(true);
            // Tiny lead so the boot screen is on-screen first.
            setTimeout(() => speak(`Welcome back. ${j.body}`), 600);
            // Auto-fade ~2s after the typical briefing finishes; rough but
            // good enough for the visual. User can click to dismiss anytime.
            const dwell = Math.min(20000, 3500 + (j.body as string).length * 50);
            setTimeout(() => { if (!cancelled) startFade(); }, dwell);
          } else {
            // No voice? Just show the screen for 3.5s then fade.
            setTimeout(() => { if (!cancelled) startFade(); }, 3500);
          }
        } else {
          // Empty workspace — no briefing yet. Fade quickly so first-run
          // welcome screen takes over.
          setTimeout(() => { if (!cancelled) startFade(); }, 2200);
        }
      } catch {
        setTimeout(() => { if (!cancelled) startFade(); }, 3500);
      }
    })();
    return () => { cancelled = true; cancelSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function startFade() {
    setFading(true);
    setSpeaking(false);
    setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("cc_boot_done", "1");
        // First boot ever — default the user into wake-word listening so
        // "Hey Jarvis" actually does something out of the box. We don't
        // request mic permission here; ContinuousJarvis surfaces any denial.
        if (!localStorage.getItem("cc_listen_mode") && getListenMode() === "off") {
          setListenMode("wake");
        }
      }
    }, 800);
  }

  function skip() {
    cancelSpeech();
    startFade();
  }

  if (!visible) return null;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dayName  = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dayNum   = now.getDate();
  const monthName = now.toLocaleDateString(undefined, { month: "long" }).toUpperCase();

  return (
    <div
      onClick={skip}
      className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-ink-100 cursor-pointer select-none transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <JarvisOrb size={300} count={1200} color="#4DB8FF" state={speaking ? "speaking" : "thinking"} label="JARVIS" />

      <div
        className="mt-10 tabular-nums"
        style={{
          fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 72,
          letterSpacing: "0.18em",
          color: "rgba(230, 245, 255, 0.95)",
          textShadow: "0 0 14px rgba(77, 184, 255, 0.35)",
        }}
      >
        {hh}<span style={{ opacity: 0.6 }}>:</span>{mm}
      </div>

      <div
        className="mt-2"
        style={{
          fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 13,
          letterSpacing: "0.32em",
          color: "rgba(180, 200, 220, 0.7)",
        }}
      >
        {dayName} {dayNum} {monthName}
      </div>

      <div className="mt-12 h-5 text-[11px] tracking-[0.28em] uppercase text-ink-400">
        {BOOT_LINES[Math.min(statusIndex, BOOT_LINES.length - 1)]}
      </div>

      {briefingText && (
        <p className="absolute bottom-10 max-w-2xl px-6 text-xs text-ink-500 text-center leading-relaxed">
          {briefingText.slice(0, 220)}{briefingText.length > 220 ? "…" : ""}
        </p>
      )}

      <div className="absolute bottom-3 text-[10px] tracking-[0.28em] uppercase text-ink-600">
        click anywhere to skip
      </div>
    </div>
  );
}
