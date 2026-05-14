import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

// GET /api/stt/token
// Returns a short-lived Deepgram API key that the client can use to open
// a direct websocket to Deepgram. Avoids round-tripping audio through our
// own server (cuts ~150ms off the latency budget).
//
// Requires DEEPGRAM_API_KEY (project-level admin key) and
// DEEPGRAM_PROJECT_ID. Set up at https://console.deepgram.com.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey    = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  // Mint a temporary key: 60s TTL, member role (can stream STT).
  const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: "ephemeral-cc-jarvis",
      scopes: ["usage:write"],
      time_to_live_in_seconds: 60,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: `deepgram ${res.status}: ${await res.text()}` }, { status: 502 });
  }
  const j = (await res.json()) as { key: string };
  return NextResponse.json({ configured: true, key: j.key });
}
