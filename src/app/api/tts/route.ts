import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { streamElevenLabsTTS, isElevenLabsConfigured } from "@/lib/elevenlabs";

// POST /api/tts
// Body: { text: string, voiceId?: string }
// Streams MP3 audio bytes back. Used by the client speech layer to play
// natural-sounding Jarvis replies in place of browser SpeechSynthesis.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isElevenLabsConfigured()) {
    return NextResponse.json({ error: "elevenlabs not configured" }, { status: 503 });
  }
  const { text, voiceId } = (await req.json()) as { text: string; voiceId?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  return streamElevenLabsTTS(text.trim(), { voiceId });
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ configured: isElevenLabsConfigured() });
}
