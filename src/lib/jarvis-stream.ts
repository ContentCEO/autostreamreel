"use client";

import { speak, speakChunk, cancelSpeech } from "@/lib/speech";
import { setOrbState } from "@/lib/orb-state";

// Splits incoming Claude tokens into complete sentences and pipes each into
// TTS as soon as it's ready. The first sentence usually arrives in 200-400ms
// of the stream opening, so first-audible-word latency is ~600ms once you
// add ElevenLabs roundtrip.
//
// onText fires for every token (so the UI can show streaming text if it
// wants). Returns the full reply string when the stream ends.
const SENTENCE_BOUNDARY = /([.!?])(\s|$)/;

export async function streamJarvisVoice(opts: {
  text: string;
  onText?: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  cancelSpeech();
  setOrbState("thinking");

  const res = await fetch("/api/jarvis/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: opts.text }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    setOrbState("idle");
    const reply = "Sorry, I couldn't reach the brain.";
    speak(reply);
    return reply;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let pending = "";        // text not yet flushed to TTS
  let full    = "";        // complete reply text
  let firstChunkSpoken = false;

  function flushSentence(force = false) {
    while (true) {
      const m = pending.match(SENTENCE_BOUNDARY);
      if (m) {
        const end = (m.index ?? 0) + m[0].length;
        const sentence = pending.slice(0, end).trim();
        pending = pending.slice(end);
        if (sentence) {
          if (!firstChunkSpoken) {
            firstChunkSpoken = true;
            setOrbState("speaking");
          }
          speakChunk(sentence);
        }
      } else {
        break;
      }
    }
    // Force-flush any remainder when the stream ends.
    if (force && pending.trim()) {
      if (!firstChunkSpoken) setOrbState("speaking");
      speakChunk(pending.trim());
      pending = "";
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const obj = JSON.parse(dataLine.slice(6)) as { type: string; text?: string; error?: string };
        if (obj.type === "text" && obj.text) {
          pending += obj.text;
          full    += obj.text;
          opts.onText?.(obj.text);
          flushSentence(false);
        } else if (obj.type === "error") {
          full = obj.error ?? "Stream error.";
        }
      } catch { /* ignore malformed event */ }
    }
  }
  flushSentence(true);
  return full;
}
