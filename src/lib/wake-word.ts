"use client";

// Picovoice Porcupine wake-word listener. Runs continuously on-device in
// a Web Worker — ~30ms detection, no false positives, no per-utterance
// network cost. When the user says "Jarvis" the onWake callback fires.
//
// Falls back to null if either:
//   - PICOVOICE_ACCESS_KEY isn't set, OR
//   - the Porcupine model file isn't served at /porcupine/porcupine_params.pv
//
// To enable: set PICOVOICE_ACCESS_KEY in env, then drop the file
// porcupine_params.pv (~1.5MB) into public/porcupine/. Download it from
// https://github.com/Picovoice/porcupine/blob/master/lib/common/porcupine_params.pv

import { PorcupineWorker, BuiltInKeyword } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

interface WakeController {
  stop: () => Promise<void>;
}

let probed = false;
let cachedKey: string | null = null;

async function getKey(): Promise<string | null> {
  if (probed) return cachedKey;
  try {
    const r = await fetch("/api/picovoice/key");
    const j = await r.json();
    cachedKey = j.configured ? (j.key as string) : null;
  } catch {
    cachedKey = null;
  }
  probed = true;
  return cachedKey;
}

export async function isWakeWordConfigured(): Promise<boolean> {
  return Boolean(await getKey());
}

export async function startWakeWordListener(onWake: () => void): Promise<WakeController | null> {
  const key = await getKey();
  if (!key) return null;
  let worker: PorcupineWorker | null = null;
  try {
    worker = await PorcupineWorker.create(
      key,
      [{ builtin: BuiltInKeyword.Jarvis, sensitivity: 0.6 }],
      (detection) => {
        if (detection.label) onWake();
      },
      { publicPath: "/porcupine/porcupine_params.pv" },
    );
    await WebVoiceProcessor.subscribe(worker);
    return {
      stop: async () => {
        try { if (worker) await WebVoiceProcessor.unsubscribe(worker); } catch { /* ignore */ }
        try { worker?.terminate(); } catch { /* ignore */ }
      },
    };
  } catch (e) {
    console.warn("[porcupine] init failed (model file at /porcupine/porcupine_params.pv?):", e);
    try { worker?.terminate(); } catch { /* ignore */ }
    return null;
  }
}
