import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// POST /api/owner/enter
// Body: { code: string }
// PIN-only sign-in. No password to remember.
//
// Verifies the code against OWNER_CODE (default 08172009). On match, uses
// the Supabase service role to generate a magic-link token for OWNER_EMAIL,
// then consumes that token server-side so the response carries the
// Supabase session cookies. The user never sees an email or password.
//
// Required env:
//   OWNER_CODE                   — the PIN (default "08172009")
//   OWNER_EMAIL                  — Supabase user's email
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY    — used to mint the one-time magic-link hash
export async function POST(req: Request) {
  const { code } = (await req.json()) as { code?: string };
  const entered  = (code ?? "").replace(/\D/g, "");
  const expected = (process.env.OWNER_CODE ?? "08172009").replace(/\D/g, "");
  if (!entered || entered !== expected) {
    return NextResponse.json({ error: "invalid code" }, { status: 401 });
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email      = process.env.OWNER_EMAIL;
  if (!url || !anonKey || !serviceKey || !email) {
    return NextResponse.json({
      error: "Owner credentials not configured. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL.",
    }, { status: 500 });
  }

  // Mint a fresh magic-link hash via the admin API.
  const admin = createAdminSupabase(url, serviceKey, { auth: { persistSession: false } });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type:  "magiclink",
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json({
      error: linkErr?.message ?? "Failed to mint owner session. Make sure OWNER_EMAIL exists in Supabase Authentication > Users.",
    }, { status: 500 });
  }

  // Consume the hash with the cookie-bound server client. This sets the
  // Supabase session cookies on the response so the rest of the app
  // recognizes the user.
  const cookieStore = cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type:       "email",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyErr) {
    return NextResponse.json({ error: verifyErr.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
