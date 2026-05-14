import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST /api/owner/enter
// Body: { code: string }
// Verifies the code against OWNER_CODE (default 08172009). On match, signs
// the configured Supabase owner account in server-side so the Supabase
// cookies are set on the response — the rest of the app keeps using the
// regular session.
//
// Required env vars to make this work end-to-end:
//   OWNER_CODE             — the PIN owner types (default "08172009")
//   OWNER_EMAIL            — Supabase user's email
//   OWNER_SUPABASE_PASSWORD — the password set on that user in Supabase
//   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — as usual
export async function POST(req: Request) {
  const { code } = (await req.json()) as { code?: string };
  const entered = (code ?? "").replace(/\D/g, "");
  const expected = (process.env.OWNER_CODE ?? "08172009").replace(/\D/g, "");
  if (!entered || entered !== expected) {
    return NextResponse.json({ error: "invalid code" }, { status: 401 });
  }

  const email    = process.env.OWNER_EMAIL ?? "";
  const password = process.env.OWNER_SUPABASE_PASSWORD ?? "";
  if (!email || !password) {
    return NextResponse.json({
      error: "Owner Supabase credentials not configured. Set OWNER_EMAIL and OWNER_SUPABASE_PASSWORD.",
    }, { status: 500 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
