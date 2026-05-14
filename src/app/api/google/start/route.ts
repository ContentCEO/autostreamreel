import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/google";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID/SECRET not set" }, { status: 400 });
  }
  const origin = process.env.PUBLIC_APP_ORIGIN ?? new URL(req.url).origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/google/callback`;
  const state = Buffer.from(JSON.stringify({ t: Date.now() })).toString("base64url");
  return NextResponse.redirect(googleAuthUrl(redirectUri, state));
}
