import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { authUrl, PROVIDERS, type ProviderId } from "@/lib/ad-platforms";

// GET /api/ad-accounts/:platform/start?business_id=...
// Kicks the OAuth flow. We stash business_id in `state` so the callback can
// scope the saved account row.
export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const platform = params.platform as ProviderId;
  if (!PROVIDERS[platform]) {
    return NextResponse.json({ error: "unknown platform" }, { status: 404 });
  }
  const cfg = PROVIDERS[platform];
  if (!process.env[cfg.clientIdEnv]) {
    return NextResponse.json({
      error: `${cfg.clientIdEnv} not set — add it to .env to enable ${cfg.label}.`,
    }, { status: 400 });
  }

  const url = new URL(req.url);
  const businessId = url.searchParams.get("business_id") ?? "";
  const origin = process.env.PUBLIC_APP_ORIGIN ?? url.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/ad-accounts/${platform}/callback`;
  const state = Buffer.from(JSON.stringify({ b: businessId, t: Date.now() })).toString("base64url");

  return NextResponse.redirect(authUrl(platform, redirectUri, state));
}
