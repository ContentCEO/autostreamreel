"use client";

// Browser Speech utilities — singleton wrappers around Web Speech APIs.
// All client-side, no server cost, no API keys. Works in Chrome / Edge /
// Safari (Safari needs user gesture for first speak()).

type RecognitionInstance = {
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: new () => RecognitionInstance;
  SpeechRecognition?: new () => RecognitionInstance;
}

const VOICE_PREF_KEY = "cc_voice_enabled";

export function isVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(VOICE_PREF_KEY);
  return v === null ? true : v === "1";
}

export function setVoiceEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_PREF_KEY, on ? "1" : "0");
  if (!on) cancelSpeech();
  window.dispatchEvent(new Event("cc:voice-changed"));
}

let cachedVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer en-US neural voices when available; otherwise first English voice.
  const preferred = [
    "Google UK English Male",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Daniel",
    "Alex",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) { cachedVoice = v; return v; }
  }
  cachedVoice = voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
  return cachedVoice;
}

// Cache the configured state so we don't /api/tts ping on every utterance.
let elevenLabsAvailable: boolean | null = null;
async function probeElevenLabs(): Promise<boolean> {
  if (elevenLabsAvailable !== null) return elevenLabsAvailable;
  try {
    const r = await fetch("/api/tts", { method: "GET" });
    const j = await r.json();
    elevenLabsAvailable = Boolean(j.configured);
  } catch {
    elevenLabsAvailable = false;
  }
  return elevenLabsAvailable;
}

// Sequential audio queue. Each speakChunk() enqueues an MP3 fetch from
// /api/tts and plays clips in arrival order, so streaming sentence-by-sentence
// from a Claude reply produces smooth back-to-back natural speech.
let audioQueue: Promise<void> = Promise.resolve();
let currentAudio: HTMLAudioElement | null = null;

async function playElevenLabsClip(text: string): Promise<void> {
  const { setOrbState } = await import("@/lib/orb-state");
  const { startBargeInWatcher, stopBargeInWatcher } = await import("@/lib/barge-in");
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok || !res.body) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    setOrbState("speaking");
    // Open the barge-in mic the moment audio starts; interrupted speech
    // will set currentAudio to null + cancel the queue.
    void startBargeInWatcher();
    const cleanup = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      stopBargeInWatcher();
      setOrbState("idle");
      resolve();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.play().catch(cleanup);
  });
}

function browserSpeak(text: string, opts: { rate?: number; pitch?: number; volume?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate   = opts.rate   ?? 1.0;
  u.pitch  = opts.pitch  ?? 1.0;
  u.volume = opts.volume ?? 1.0;
  Promise.all([
    import("@/lib/orb-state"),
    import("@/lib/barge-in"),
  ]).then(([orb, barge]) => {
    orb.setOrbState("speaking");
    void barge.startBargeInWatcher();
    const done = () => { orb.setOrbState("idle"); barge.stopBargeInWatcher(); };
    u.onend   = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

// Drop-in replacement for the old speak(): cancels prior speech and queues
// the new text. Uses ElevenLabs when configured, else falls back to browser
// TTS. Awaits the playback so chained speak() calls don't overlap.
export function speak(text: string, opts: { rate?: number; pitch?: number; volume?: number } = {}) {
  if (typeof window === "undefined") return;
  if (!isVoiceEnabled()) return;
  if (!text || !text.trim()) return;
  // Cancel anything already speaking — preserves the "interrupt on new
  // utterance" semantics the rest of the app already relies on.
  cancelSpeech();
  audioQueue = (async () => {
    if (await probeElevenLabs()) {
      await playElevenLabsClip(text);
    } else {
      browserSpeak(text, opts);
    }
  })();
  void audioQueue;
}

// Streaming variant: enqueue a chunk to be spoken in order without cancelling
// what's already playing. Use when Claude streams in: split by sentence, call
// speakChunk(sentence) as each completes — audio plays back-to-back.
export function speakChunk(text: string) {
  if (typeof window === "undefined") return;
  if (!isVoiceEnabled()) return;
  if (!text || !text.trim()) return;
  audioQueue = audioQueue.then(async () => {
    if (await probeElevenLabs()) {
      await playElevenLabsClip(text);
    } else {
      browserSpeak(text);
    }
  });
}

export function cancelSpeech() {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.src = ""; } catch { /* ignore */ }
    currentAudio = null;
  }
  // Reset the queue so future speakChunk() calls start fresh.
  audioQueue = Promise.resolve();
}

export function isListenSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as SpeechWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// Returns a controller you can stop. onResult fires with the final transcript
// once the user pauses speaking (continuous = false, single utterance).
export function listenOnce(handlers: {
  onResult: (transcript: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}): { stop: () => void } | null {
  if (!isListenSupported()) {
    handlers.onError?.("speech recognition not supported in this browser");
    return null;
  }
  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition!;
  const rec = new Ctor();
  rec.continuous     = false;
  rec.interimResults = false;
  rec.lang           = "en-US";

  let lastTranscript = "";
  rec.onresult = (e) => {
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) lastTranscript = r[0].transcript.trim();
    }
  };
  rec.onerror = (e) => handlers.onError?.(e.error);
  rec.onend = () => {
    if (lastTranscript) handlers.onResult(lastTranscript);
    handlers.onEnd?.();
  };
  rec.start();
  return { stop: () => rec.stop() };
}

// Continuous always-listening mode. Keeps the recognizer alive across
// utterance boundaries by restarting on `onend`. Each completed utterance is
// passed to onUtterance. Caller decides whether to act on it (e.g. only when
// the utterance contains "jarvis").
export function listenContinuous(handlers: {
  onUtterance: (transcript: string) => void;
  onError?: (err: string) => void;
}): { stop: () => void } | null {
  if (!isListenSupported()) {
    handlers.onError?.("speech recognition not supported in this browser");
    return null;
  }
  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition!;
  let rec: RecognitionInstance | null = null;
  let stopped = false;

  function start() {
    if (stopped) return;
    rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) handlers.onUtterance(t);
        }
      }
    };
    rec.onerror = (e) => {
      // "no-speech" / "aborted" / "audio-capture" are routine — keep going.
      if (e.error !== "no-speech" && e.error !== "aborted") {
        handlers.onError?.(e.error);
      }
    };
    rec.onend = () => {
      // Auto-restart unless caller stopped us.
      if (!stopped) setTimeout(start, 300);
    };
    try { rec.start(); } catch { /* might already be started */ }
  }

  start();
  return {
    stop: () => {
      stopped = true;
      try { rec?.abort(); } catch { /* ignore */ }
    },
  };
}

const WAKE_WORDS = ["jarvis", "hey jarvis", "okay jarvis", "hey command", "command center"];

// Returns the utterance with the wake word stripped if it matches, or null.
export function extractWakeUtterance(transcript: string): string | null {
  const lower = transcript.toLowerCase();
  for (const w of WAKE_WORDS) {
    const idx = lower.indexOf(w);
    if (idx !== -1) {
      const after = transcript.slice(idx + w.length).trim();
      // If just "jarvis" with nothing after, still return empty -> a greeting.
      return after || "";
    }
  }
  return null;
}

const LISTEN_PREF_KEY = "cc_listen_mode";
export type ListenMode = "off" | "wake" | "always";

export function getListenMode(): ListenMode {
  if (typeof window === "undefined") return "off";
  const v = localStorage.getItem(LISTEN_PREF_KEY);
  if (v === "wake" || v === "always" || v === "off") return v;
  return "off";
}

export function setListenMode(mode: ListenMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LISTEN_PREF_KEY, mode);
  window.dispatchEvent(new Event("cc:listen-changed"));
}
