"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { JarvisOrb, type OrbState } from "@/components/JarvisOrb";
import { subscribeOrbState } from "@/lib/orb-state";

// Permanent background view: black, centered orb with JARVIS, large clock,
// DAY DATE MONTH. Lives behind everything in /cc. When a tab is "open"
// (children visible in the sliding panel), the boot view dims and shrinks
// the orb upward slightly so the tab can breathe — but the orb is always
// there, never dismissed. The component reads pathname itself so the
// layout doesn't have to plumb a dimmed prop down.
export function BootBackground() {
  const pathname = usePathname();
  const dimmed = pathname !== "/cc";
  const [now, setNow] = useState<Date>(() => new Date());
  const [orb, setOrb] = useState<OrbState>("idle");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => subscribeOrbState(setOrb), []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dayName  = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dayNum   = now.getDate();
  const monthName = now.toLocaleDateString(undefined, { month: "long" }).toUpperCase();

  // When dimmed, push the orb upward so it sits above the content panel.
  const translate = dimmed ? "translateY(-22vh) scale(0.78)" : "translateY(0) scale(1)";
  const orbWrapperOpacity = dimmed ? 0.78 : 1;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out"
        style={{ transform: translate, opacity: orbWrapperOpacity }}
      >
        <JarvisOrb size={320} count={1300} state={orb} label="JARVIS" />

        <div
          className="mt-10 tabular-nums"
          style={{
            fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
            fontWeight: 400,
            fontSize: 80,
            letterSpacing: "0.18em",
            color: "rgba(230, 245, 255, 0.95)",
            textShadow: "0 0 14px rgba(77, 184, 255, 0.35)",
          }}
        >
          {hh}<span style={{ opacity: 0.55 }}>:</span>{mm}
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
      </div>
    </div>
  );
}
