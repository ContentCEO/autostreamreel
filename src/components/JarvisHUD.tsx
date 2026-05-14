"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { VoiceToggle } from "@/components/VoiceToggle";
import { ComputerUsePanel } from "@/components/ComputerUsePanel";
import { isDesktop } from "@/lib/desktop";
import { subscribeOrbState } from "@/lib/orb-state";
import type { OrbState } from "@/components/JarvisOrb";

// Floating top-right Jarvis HUD. Replaces the old chat sidebar — no message
// history, no typing. Just status + voice controls + take-over button.
// Jarvis is now voice-first: speak (mic / wake word), Jarvis speaks back.
export function JarvisHUD() {
  const [orb, setOrb] = useState<OrbState>("idle");
  const [computerOpen, setComputerOpen] = useState(false);
  const [showTakeover, setShowTakeover] = useState(false);

  useEffect(() => subscribeOrbState(setOrb), []);
  useEffect(() => { setShowTakeover(isDesktop()); }, []);

  const statusLabel =
    orb === "speaking"  ? "speaking" :
    orb === "thinking"  ? "thinking" :
    orb === "listening" ? "listening" : "online";

  const statusClass =
    orb === "speaking"  ? "bg-accent-500/20 text-accent-300 border-accent-500/40" :
    orb === "thinking"  ? "bg-warn-500/20 text-warn-500 border-warn-500/40" :
    orb === "listening" ? "bg-success-500/20 text-success-500 border-success-500/40" :
                          "bg-ink-900/80 text-ink-300 border-ink-700";

  return (
    <>
      <div className="fixed top-4 right-4 z-30 flex flex-col items-end gap-2">
        <div className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.28em] border backdrop-blur ${statusClass}`}>
          {statusLabel}
        </div>
        <div className="flex items-center gap-1 bg-ink-950/70 backdrop-blur rounded-md p-1 border border-ink-800">
          <VoiceToggle />
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
      </div>
      {computerOpen && <ComputerUsePanel onClose={() => setComputerOpen(false)} />}
    </>
  );
}
