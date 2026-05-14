import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { isGoogleConfigured } from "@/lib/google";

// GET /api/google/status — small probe used by the sidebar Connect Google
// button. Reports whether the env credentials are present AND whether
// the owner has finished the OAuth dance.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const configured = isGoogleConfigured();
  let connected = false;
  if (configured) {
    const admin = createAdminClient();
    const { data } = await admin.from("google_tokens").select("id").maybeSingle();
    connected = Boolean(data);
  }
  return NextResponse.json({ configured, connected });
}

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  await admin.from("google_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return NextResponse.json({ ok: true });
}
