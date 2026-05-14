"use client";

// Deepgram streaming STT client. Opens a direct WebSocket to Deepgram with
// a temporary key minted server-side. Streams microphone audio via
// MediaRecorder (Opus in WebM container, which Deepgram understands).
//
// Returns a controller you can stop. Fires onPartial for interim transcripts
// (used for speculative response generation) and onFinal for completed
// utterances.

interface DeepgramHandlers {
  onPartial: (text: string) => void;
  onFinal:   (text: string) => void;
  onError?:  (err: string) => void;
  onClose?:  () => void;
}

export interface DeepgramController {
  stop: () => void;
}

// Probes /api/stt/token to see if Deepgram is configured. Cached.
let dgConfigured: boolean | null = null;
export async function isDeepgramConfigured(): Promise<boolean> {
  if (dgConfigured !== null) return dgConfigured;
  try {
    const r = await fetch("/api/stt/token");
    const j = await r.json();
    dgConfigured = Boolean(j.configured);
  } catch {
    dgConfigured = false;
  }
  return dgConfigured;
}

export async function listenWithDeepgram(handlers: DeepgramHandlers): Promise<DeepgramController | null> {
  if (typeof window === "undefined") return null;

  // Mint an ephemeral key (60s lifetime; the WS uses it once at connect).
  const tokenRes = await fetch("/api/stt/token");
  const tokenJson = await tokenRes.json();
  if (!tokenJson.key) {
    handlers.onError?.("Deepgram not configured");
    return null;
  }

  // Open the mic.
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    handlers.onError?.("Mic permission denied");
    return null;
  }

  // Open the Deepgram WS.
  const params = new URLSearchParams({
    model:           "nova-3",
    encoding:        "opus",
    sample_rate:     "48000",
    channels:        "1",
    interim_results: "true",
    smart_format:    "true",
    endpointing:     "300",      // ms of silence before treating as utterance end
    vad_events:      "true",
  });
  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params.toString()}`,
    ["token", tokenJson.key],
  );

  let recorder: MediaRecorder | null = null;
  let stopped = false;

  ws.onopen = () => {
    if (stopped) return;
    recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    recorder.ondataavailable = (e) => {
      if (ws.readyState === WebSocket.OPEN && e.data.size > 0) ws.send(e.data);
    };
    recorder.start(150);   // 150ms chunks — small enough to feel real-time
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as {
        type?: string;
        is_final?: boolean;
        speech_final?: boolean;
        channel?: { alternatives?: { transcript?: string }[] };
      };
      if (msg.type === "Results" && msg.channel?.alternatives?.[0]) {
        const t = (msg.channel.alternatives[0].transcript ?? "").trim();
        if (!t) return;
        if (msg.is_final && msg.speech_final) handlers.onFinal(t);
        else if (msg.is_final)                handlers.onFinal(t);
        else                                   handlers.onPartial(t);
      }
    } catch { /* ignore */ }
  };

  ws.onerror = () => handlers.onError?.("Deepgram socket error");
  ws.onclose = () => { stop(); handlers.onClose?.(); };

  function stop() {
    if (stopped) return;
    stopped = true;
    try { recorder?.state !== "inactive" && recorder?.stop(); } catch { /* ignore */ }
    try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "CloseStream" })); } catch { /* ignore */ }
    }
    try { ws.close(); } catch { /* ignore */ }
  }

  return { stop };
}
