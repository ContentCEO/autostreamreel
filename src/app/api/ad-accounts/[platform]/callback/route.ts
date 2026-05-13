import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { exchangeCode, PROVIDERS, type ProviderId } from "@/lib/ad-platforms";

// GET /api/ad-accounts/:platform/callback?code=...&state=...
export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.redirect(new URL("/login?error=not_owner", req.url));
  }

  const platform = params.platform as ProviderId;
  if (!PROVIDERS[platform]) {
    return NextResponse.json({ error: "unknown platform" }, { status: 404 });
  }

  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return NextResponse.redirect(new URL("/cc/ad-accounts?error=missing_code", req.url));

  let businessId: string | null = null;
  try {
    const decoded = Buffer.from(state ?? "", "base64url").toString("utf8");
    businessId = (JSON.parse(decoded) as { b?: string }).b ?? null;
  } catch { /* ignore — handle null below */ }

  const origin = process.env.PUBLIC_APP_ORIGIN ?? url.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/ad-accounts/${platform}/callback`;

  let token: { access_token: string; refresh_token?: string; expires_in?: number };
  try {
    token = await exchangeCode(platform, code, redirectUri);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange failed";
    return NextResponse.redirect(new URL(`/cc/ad-accounts?error=${encodeURIComponent(msg)}`, req.url));
  }

  const admin = createAdminClient();
  await admin.from("ad_accounts").insert({
    business_id:    businessId,
    platform,
    account_label:  `${PROVIDERS[platform].label} (just connected)`,
    status:         "connected",
    oauth_token:    token.access_token,
    oauth_refresh:  token.refresh_token ?? null,
    scopes:         PROVIDERS[platform].scopes,
    last_synced_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL(`/cc/ad-accounts?connected=${platform}`, req.url));
}
