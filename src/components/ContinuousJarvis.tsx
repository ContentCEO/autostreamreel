"use client";

import { useEffect, useRef } from "react";
import { listenContinuous, extractWakeUtterance, getListenMode, speak } from "@/lib/speech";

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
      if (mode === "off") return;

      stopRef.current = listenContinuous({
        onUtterance: async (raw) => {
          // Don't interrupt an in-flight Jarvis turn.
          if (busyRef.current) return;
          let text = raw;
          if (mode === "wake") {
            const stripped = extractWakeUtterance(raw);
            if (stripped === null) return;       // no wake word
            text = stripped || "Are you there?";
          }
          busyRef.current = true;
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
            // Broadcast so the JarvisPanel can show the turn in its history.
            window.dispatchEvent(new CustomEvent("cc:jarvis-turn", {
              detail: { user: text, assistant: reply },
            }));
          } catch {
            speak("Sorry, I lost connection.");
          } finally { busyRef.current = false; }
        },
        onError: (e) => {
          // The only fatal error we care about is the user denying mic
          // permission. Anything else, just let auto-restart handle it.
          if (e === "not-allowed" || e === "service-not-allowed") {
            console.warn("[jarvis] mic permission denied");
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
