"use client";

import { useEffect, useRef } from "react";
import { listenContinuous, extractWakeUtterance, getListenMode, speak } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";

// Mounted once at the layout level. When the user has enabled "wake" or
// "always" listen mode, this keeps a SpeechRecognition session alive in the
// background and routes every recognized utterance into Jarvis.
//
// - "wake": only processes utterances that contain a wake phrase ("jarvis",
//   "hey jarvis", "command center"). Strips the wake phrase before sending.
// - "always": sends every utterance straight through to Jarvis.
//
// Replies come back through speak() so the loop is fully spoken — you talk,
// Jarvis listens, talks back, keeps listening.
export function ContinuousJarvis() {
  const stopRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    function start() {
      const mode = getListenMode();
      stopRef.current?.stop();
      stopRef.current = null;
      if (mode === "off") { setOrbState("idle"); return; }
      setOrbState("listening");

      stopRef.current = listenContinuous({
        onUtterance: async (raw) => {
          if (busyRef.current) return;
          let text = raw;
          if (mode === "wake") {
            const stripped = extractWakeUtterance(raw);
            if (stripped === null) return;
            text = stripped || "Are you there?";
          }
          busyRef.current = true;
          setOrbState("thinking");
          try {
            const res = await fetch("/api/jarvis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: [{ role: "user", content: text }],
              }),
            });
            const data = await res.json();
            const reply = data.reply ?? "I didn't catch that.";
            speak(reply);
            window.dispatchEvent(new CustomEvent("cc:jarvis-turn", {
              detail: { user: text, assistant: reply },
            }));
          } catch {
            speak("Sorry, I lost connection.");
          } finally {
            busyRef.current = false;
            // speak() will set orb back to "idle" when audio ends; here we
            // restore "listening" so the orb shows we're still ready.
            setTimeout(() => {
              if (getListenMode() !== "off") setOrbState("listening");
            }, 200);
          }
        },
        onError: (e) => {
          if (e === "not-allowed" || e === "service-not-allowed") {
            console.warn("[jarvis] mic permission denied");
            setOrbState("idle");
          }
        },
      });
    }

    start();
    window.addEventListener("cc:listen-changed", start);
    return () => {
      window.removeEventListener("cc:listen-changed", start);
      stopRef.current?.stop();
    };
  }, []);

  return null;
}
