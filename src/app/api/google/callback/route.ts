import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { exchangeGoogleCode } from "@/lib/google";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.redirect(new URL("/enter?error=not_owner", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/cc?error=google_missing_code", req.url));

  const origin = process.env.PUBLIC_APP_ORIGIN ?? url.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/google/callback`;
  try {
    const t = await exchangeGoogleCode(code, redirectUri);
    const admin = createAdminClient();
    const expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString();
    // Single-row pattern — upsert by deleting then inserting.
    await admin.from("google_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("google_tokens").insert({
      access_token:  t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at,
      scope:         t.scope ?? null,
    });
    return NextResponse.redirect(new URL("/cc?google=connected", req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange failed";
    return NextResponse.redirect(new URL(`/cc?error=${encodeURIComponent(msg)}`, req.url));
  }
}
