"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Mic, Ear } from "lucide-react";
import {
  isVoiceEnabled, setVoiceEnabled,
  getListenMode, setListenMode, type ListenMode,
} from "@/lib/speech";

// Two toggles stacked: voice-out (speak replies) and listen mode (off/wake/always).
export function VoiceToggle() {
  const [on, setOn] = useState(true);
  const [mode, setMode] = useState<ListenMode>("off");

  useEffect(() => {
    setOn(isVoiceEnabled());
    setMode(getListenMode());
    const f1 = () => setOn(isVoiceEnabled());
    const f2 = () => setMode(getListenMode());
    window.addEventListener("cc:voice-changed", f1);
    window.addEventListener("cc:listen-changed", f2);
    return () => {
      window.removeEventListener("cc:voice-changed", f1);
      window.removeEventListener("cc:listen-changed", f2);
    };
  }, []);

  function cycleMode() {
    const next: ListenMode = mode === "off" ? "wake" : mode === "wake" ? "always" : "off";
    setListenMode(next);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setVoiceEnabled(!on)}
        title={on ? "Mute voice" : "Enable voice"}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
          on ? "border-accent-500/40 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-400"
        }`}
      >
        {on ? <Volume2 size={12} /> : <VolumeX size={12} />}
      </button>
      <button
        type="button"
        onClick={cycleMode}
        title={
          mode === "off"   ? "Listening off — click to enable wake-word mode" :
          mode === "wake"  ? "Wake-word mode (say 'Jarvis') — click for always listening" :
                             "Always listening — click to turn off"
        }
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
          mode === "off" ? "border-ink-800 text-ink-400"
            : mode === "wake" ? "border-accent-500/40 text-accent-300 bg-accent-500/10"
            : "border-success-500/40 text-success-300 bg-success-500/10"
        }`}
      >
        {mode === "off" ? <Mic size={12} /> : mode === "wake" ? <Ear size={12} /> : <Mic size={12} />}
        <span>{mode === "off" ? "Listen" : mode === "wake" ? "Wake" : "Always"}</span>
      </button>
    </div>
  );
}
