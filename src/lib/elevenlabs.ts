// ElevenLabs streaming TTS. Server-side — keeps the API key off the client.
// Returns MPEG audio chunks the client can play directly with Audio() or
// MediaSource. Falls back to null when unconfigured so callers can decide
// (e.g. browser SpeechSynthesis fallback).

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID
  ?? "EXAVITQu4vr4xnSDxMaL";    // "Sarah" — clean, natural default. Override via env.

const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_turbo_v2_5";

export async function streamElevenLabsTTS(text: string, opts: { voiceId?: string } = {}): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "elevenlabs not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const voice = opts.voiceId ?? DEFAULT_VOICE_ID;
  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: `elevenlabs ${upstream.status}: ${errText}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Pipe the upstream audio stream straight to the client.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
