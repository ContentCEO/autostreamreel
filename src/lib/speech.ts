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

export function speak(text: string, opts: { rate?: number; pitch?: number; volume?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!isVoiceEnabled()) return;
  if (!text || !text.trim()) return;
  // Cancel anything currently being said so we don't pile up.
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate   = opts.rate   ?? 1.0;
  u.pitch  = opts.pitch  ?? 1.0;
  u.volume = opts.volume ?? 1.0;
  window.speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
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
