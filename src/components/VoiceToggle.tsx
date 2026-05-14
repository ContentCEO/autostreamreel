"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isVoiceEnabled, setVoiceEnabled } from "@/lib/speech";

// Sidebar / nav voice on/off toggle. Persists to localStorage. Other speech
// callers gate on isVoiceEnabled() so flipping this off silences everything.
export function VoiceToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(isVoiceEnabled());
    const f = () => setOn(isVoiceEnabled());
    window.addEventListener("cc:voice-changed", f);
    return () => window.removeEventListener("cc:voice-changed", f);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setVoiceEnabled(!on)}
      title={on ? "Mute voice" : "Enable voice"}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
        on ? "border-accent-500/40 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-400"
      }`}
    >
      {on ? <Volume2 size={12} /> : <VolumeX size={12} />}
      {on ? "Voice on" : "Voice off"}
    </button>
  );
}
