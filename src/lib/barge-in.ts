"use client";

// Barge-in: while Jarvis is speaking, watch the mic. If the user starts
// talking (mic level above threshold sustained for ~150ms), interrupt
// playback so the conversation feels natural.
//
// Uses a SEPARATE getUserMedia stream from the STT pipeline so we don't
// have to coordinate ownership. The browser's built-in echo cancellation
// keeps Jarvis's own audio from triggering us back.

import { cancelSpeech } from "@/lib/speech";

let active: { stream: MediaStream; ctx: AudioContext; raf: number } | null = null;

export async function startBargeInWatcher(): Promise<void> {
  if (active) return;
  if (typeof window === "undefined") return;
  if (!navigator.mediaDevices?.getUserMedia) return;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
      },
    });
  } catch {
    return;
  }

  const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const THRESHOLD = 0.04;     // RMS — tuned conservatively
  const HOLD_MS   = 150;      // sustain time before we trigger
  let aboveSince  = 0;

  function loop() {
    analyser.getByteTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / data.length);
    const now = performance.now();
    if (rms > THRESHOLD) {
      if (aboveSince === 0) aboveSince = now;
      if (now - aboveSince >= HOLD_MS) {
        // User is talking — kill Jarvis so they can be heard.
        cancelSpeech();
        window.dispatchEvent(new CustomEvent("cc:barge-in"));
        aboveSince = 0;
      }
    } else {
      aboveSince = 0;
    }
    if (active) active.raf = requestAnimationFrame(loop);
  }

  active = { stream, ctx, raf: 0 };
  active.raf = requestAnimationFrame(loop);
}

export function stopBargeInWatcher(): void {
  if (!active) return;
  cancelAnimationFrame(active.raf);
  try { active.ctx.close(); } catch { /* ignore */ }
  try { active.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
  active = null;
}
