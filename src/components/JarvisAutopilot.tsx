"use client";

import { useEffect, useRef } from "react";
import { speak, isVoiceEnabled } from "@/lib/speech";

// Mounted in the layout. Every 60 seconds polls /api/jarvis/announcements for
// anything new since the last check, then speaks each announcement aloud.
// De-duplicates by id so the same item doesn't get announced twice in a
// session.
//
// This is the "Jarvis interrupts you when something happens" surface.
export function JarvisAutopilot() {
  const sinceRef = useRef<string>(new Date().toISOString());
  const spokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (!isVoiceEnabled()) return;
      try {
        const r = await fetch(`/api/jarvis/announcements?since=${encodeURIComponent(sinceRef.current)}`);
        if (!r.ok) return;
        const j = (await r.json()) as {
          at: string;
          announcements: { id: string; line: string }[];
        };
        sinceRef.current = j.at;
        if (cancelled) return;
        const fresh = (j.announcements ?? []).filter((a) => !spokenRef.current.has(a.id));
        if (fresh.length === 0) return;
        for (const a of fresh) spokenRef.current.add(a.id);
        // Speak each in sequence — speak() cancels prior utterances by default,
        // so concatenate to a single utterance.
        const sentence = fresh.map((a) => a.line).join(" ");
        speak(sentence);
      } catch { /* ignore */ }
    }
    tick();
    const t = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return null;
}
