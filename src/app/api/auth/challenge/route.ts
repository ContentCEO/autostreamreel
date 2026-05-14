import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

// POST /api/auth/challenge
// Body: { name: string, code: string }
// Compares against OWNER_NAME / OWNER_CODE on the server (so secrets stay
// off the client). Returns { ok: true } only when both match — case- and
// whitespace-insensitive on name, strict on code.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name, code } = (await req.json()) as { name?: string; code?: string };
  const expectedName = (process.env.OWNER_NAME ?? "").trim().toLowerCase();
  const expectedCode = (process.env.OWNER_CODE ?? "").trim();
  if (!expectedName || !expectedCode) {
    // If owner hasn't set them, treat as already-passed so existing users
    // aren't locked out. We surface this state to the client below.
    return NextResponse.json({ ok: true, unconfigured: true });
  }

  const heardName = (name ?? "").trim().toLowerCase().replace(/[.,!?]/g, "");
  const heardCode = (code ?? "").trim().replace(/\D/g, "");

  const nameOk = heardName.includes(expectedName);
  const codeOk = heardCode === expectedCode;

  if (!nameOk || !codeOk) {
    return NextResponse.json({
      ok: false,
      nameOk,
      codeOk,
    });
  }
  return NextResponse.json({ ok: true });
}

// GET — quick "is auth required?" probe so the client can skip the
// challenge entirely when the owner hasn't configured one.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    required: Boolean(process.env.OWNER_NAME && process.env.OWNER_CODE),
  });
}
