"use client";

import { useEffect, useRef } from "react";
import { listenContinuous, listenOnce, extractWakeUtterance, getListenMode, speak } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";
import { streamJarvisVoice } from "@/lib/jarvis-stream";
import { isDeepgramConfigured, listenWithDeepgram, type DeepgramController } from "@/lib/deepgram";
import { isWakeWordConfigured, startWakeWordListener } from "@/lib/wake-word";

// Background voice loop. Decision tree on mount:
//
//   Porcupine + Deepgram → Best mode. Porcupine listens continuously for
//                           "Jarvis" on-device (~30ms, no false positives).
//                           On wake, spin up Deepgram for a single utterance,
//                           then return to Porcupine-only mode.
//
//   Porcupine only       → Wake fires; we then run Web Speech for one
//                           utterance.
//
//   Deepgram only        → Stream Deepgram continuously; substring-match
//                           "jarvis" on partials/finals (current behavior).
//
//   Neither              → Web Speech listenContinuous + substring wake.
//
// "always" listen mode bypasses the wake gate in any mode.
export function ContinuousJarvis() {
  const stopFns = useRef<Array<() => void | Promise<void>>>([]);
  const busyRef = useRef(false);
  const inflightAbortRef = useRef<AbortController | null>(null);
  const lastSpecAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function runJarvis(text: string) {
      if (busyRef.current) return;
      inflightAbortRef.current?.abort();
      inflightAbortRef.current = null;
      busyRef.current = true;
      setOrbState("thinking");
      try {
        const reply = await streamJarvisVoice({ text });
        window.dispatchEvent(new CustomEvent("cc:jarvis-turn", {
          detail: { user: text, assistant: reply },
        }));
      } catch {
        speak("Sorry, I lost connection.");
      } finally {
        busyRef.current = false;
        setTimeout(() => {
          if (getListenMode() !== "off") setOrbState("listening");
        }, 200);
      }
    }

    function stopAll() {
      while (stopFns.current.length) {
        try { void stopFns.current.pop()?.(); } catch { /* ignore */ }
      }
    }

    async function start() {
      const mode = getListenMode();
      stopAll();
      inflightAbortRef.current?.abort();
      if (mode === "off") { setOrbState("idle"); return; }
      setOrbState("listening");

      const [hasWake, hasDg] = await Promise.all([
        isWakeWordConfigured(),
        isDeepgramConfigured(),
      ]);
      if (cancelled) return;

      function gate(raw: string): string | null {
        if (mode === "wake") {
          const stripped = extractWakeUtterance(raw);
          return stripped === null ? null : (stripped || "Are you there?");
        }
        return raw;
      }

      function handlePartial(raw: string) {
        if (busyRef.current) return;
        if (raw.split(/\s+/).length < 4) return;
        const now = Date.now();
        if (now - lastSpecAtRef.current < 500) return;
        const text = gate(raw);
        if (text === null) return;
        lastSpecAtRef.current = now;
        inflightAbortRef.current?.abort();
        const ac = new AbortController();
        inflightAbortRef.current = ac;
        fetch("/api/jarvis/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: ac.signal,
        }).catch(() => {});
      }

      // Path A: Porcupine wake word (best). On wake, capture one utterance
      // via Deepgram or Web Speech, run Jarvis, return to wake-listening.
      if (hasWake && (mode === "wake")) {
        const wake = await startWakeWordListener(async () => {
          if (cancelled || busyRef.current) return;
          setOrbState("listening");
          if (hasDg) {
            const dg = await listenWithDeepgram({
              onPartial: () => { /* we already woke; partials are noise here */ },
              onFinal: (raw) => {
                if (raw) runJarvis(raw);
                dg?.stop();
              },
              onError: () => { /* swallow */ },
              onClose: () => { /* swallow */ },
            });
            // Auto-close the burst after 8s in case the user never finishes.
            setTimeout(() => { try { dg?.stop(); } catch { /* ignore */ } }, 8000);
          } else {
            listenOnce({
              onResult: (t) => { if (t) runJarvis(t); },
              onError: () => { /* swallow */ },
              onEnd:   () => { /* swallow */ },
            });
          }
        });
        if (wake) { stopFns.current.push(() => wake.stop()); return; }
        // Porcupine failed to start — fall through to streaming STT path.
      }

      // Path B: Deepgram continuous (no wake word, or "always" mode).
      if (hasDg) {
        const dg = await listenWithDeepgram({
          onPartial: handlePartial,
          onFinal:   (raw) => {
            const text = gate(raw);
            if (text !== null) runJarvis(text);
          },
          onError: (e) => console.warn("[deepgram]", e),
        });
        if (dg) {
          stopFns.current.push(() => dg.stop());
          return;
        }
      }

      // Path C: Web Speech fallback.
      const stop = listenContinuous({
        onUtterance: (raw) => {
          const text = gate(raw);
          if (text !== null) runJarvis(text);
        },
        onError: (e) => {
          if (e === "not-allowed" || e === "service-not-allowed") {
            console.warn("[jarvis] mic permission denied");
            setOrbState("idle");
          }
        },
      });
      if (stop) stopFns.current.push(() => stop.stop());
    }

    start();
    window.addEventListener("cc:listen-changed", start);
    return () => {
      cancelled = true;
      window.removeEventListener("cc:listen-changed", start);
      stopAll();
      inflightAbortRef.current?.abort();
    };
  }, []);

  return null;
}
