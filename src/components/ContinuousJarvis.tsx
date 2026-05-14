"use client";

import { useEffect, useRef } from "react";
import { listenContinuous, extractWakeUtterance, getListenMode, speak } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";
import { streamJarvisVoice } from "@/lib/jarvis-stream";
import { isDeepgramConfigured, listenWithDeepgram, type DeepgramController } from "@/lib/deepgram";

// Background listener mounted in /cc layout. When listen mode is enabled,
// keeps a STT session alive (Deepgram if configured, else browser Web
// Speech) and routes recognized utterances into Jarvis.
//
// Wake-word mode: only utterances containing "jarvis" / "hey jarvis" /
// "command center" trigger a turn (the wake word is stripped first).
//
// Speculative response (#2): on Deepgram, a long-enough partial pre-warms
// the Anthropic stream so the final-transcript turn lands faster. The
// pre-warm is aborted as soon as a final transcript supersedes it.
export function ContinuousJarvis() {
  const stopRef = useRef<{ stop: () => void } | DeepgramController | null>(null);
  const busyRef = useRef(false);
  const inflightAbortRef = useRef<AbortController | null>(null);
  const lastSpecAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const mode = getListenMode();
      stopRef.current?.stop();
      stopRef.current = null;
      if (mode === "off") { setOrbState("idle"); return; }
      setOrbState("listening");

      const useDeepgram = await isDeepgramConfigured();
      if (cancelled) return;

      function gateUtterance(raw: string): string | null {
        if (mode === "wake") {
          const stripped = extractWakeUtterance(raw);
          return stripped === null ? null : (stripped || "Are you there?");
        }
        return raw;
      }

      async function handleFinal(raw: string) {
        if (busyRef.current) return;
        const text = gateUtterance(raw);
        if (text === null) return;
        // Cancel any speculative pre-warm in flight — the final wins.
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

      function handlePartial(raw: string) {
        if (!useDeepgram) return;
        if (busyRef.current) return;
        if (raw.split(/\s+/).length < 4) return;
        const now = Date.now();
        if (now - lastSpecAtRef.current < 500) return;
        const text = gateUtterance(raw);
        if (text === null) return;
        lastSpecAtRef.current = now;

        // Pre-warm: kick the streaming endpoint with the partial. We don't
        // pipe its output to TTS (we discard it). Anthropic warms the
        // connection + the model context, so when handleFinal fires for
        // real, the actual reply lands faster.
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

      if (useDeepgram) {
        const dg = await listenWithDeepgram({
          onPartial: handlePartial,
          onFinal:   handleFinal,
          onError:   (e) => console.warn("[deepgram]", e),
        });
        if (dg) stopRef.current = dg;
        else {
          stopRef.current = listenContinuous({
            onUtterance: handleFinal,
            onError: (e) => console.warn("[webspeech]", e),
          });
        }
      } else {
        stopRef.current = listenContinuous({
          onUtterance: handleFinal,
          onError: (e) => {
            if (e === "not-allowed" || e === "service-not-allowed") {
              console.warn("[jarvis] mic permission denied");
              setOrbState("idle");
            }
          },
        });
      }
    }

    start();
    window.addEventListener("cc:listen-changed", start);
    return () => {
      cancelled = true;
      window.removeEventListener("cc:listen-changed", start);
      stopRef.current?.stop();
      inflightAbortRef.current?.abort();
    };
  }, []);

  return null;
}
