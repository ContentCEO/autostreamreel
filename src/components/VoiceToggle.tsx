"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Mic, MicOff, Ear } from "lucide-react";
import {
  isVoiceEnabled, setVoiceEnabled,
  getListenMode, setListenMode, type ListenMode,
} from "@/lib/speech";

// Two clear chips: speak (on/off), listen (off / "Hey Jarvis" / always on).
// Cycles via click. The third chip explicitly requests mic permission when
// the mode flips from off so the user knows the mic is actually live.
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

  async function cycleMode() {
    const next: ListenMode = mode === "off" ? "wake" : mode === "wake" ? "always" : "off";
    if (next !== "off") {
      // Surface the mic permission dialog the moment we turn listening on.
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        alert("Microphone permission was denied. Allow mic access for the site, then try again.");
        return;
      }
    }
    setListenMode(next);
  }

  const modeLabel =
    mode === "off"   ? "Listen: off" :
    mode === "wake"  ? "Hey Jarvis"   :
                       "Always on";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setVoiceEnabled(!on)}
        title={on ? "Mute Jarvis" : "Unmute Jarvis"}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border ${
          on ? "border-accent-500/40 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-400"
        }`}
      >
        {on ? <Volume2 size={11} /> : <VolumeX size={11} />}
        {on ? "Voice" : "Muted"}
      </button>
      <button
        type="button"
        onClick={cycleMode}
        title={
          mode === "off"   ? "Click: listen for the wake word “Jarvis”" :
          mode === "wake"  ? "Wake-word mode — say “Jarvis ...”. Click for always on." :
                             "Always listening. Click to turn off."
        }
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border ${
          mode === "off"
            ? "border-ink-800 text-ink-400"
            : mode === "wake"
              ? "border-accent-500/40 text-accent-300 bg-accent-500/10"
              : "border-success-500/40 text-success-300 bg-success-500/10"
        }`}
      >
        {mode === "off" ? <MicOff size={11} /> : mode === "wake" ? <Ear size={11} /> : <Mic size={11} />}
        {modeLabel}
      </button>
    </div>
  );
}
