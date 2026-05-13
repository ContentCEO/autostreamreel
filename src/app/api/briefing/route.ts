import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { generateBriefing } from "@/lib/briefing";

// GET  /api/briefing      -> latest briefing (or generate if older than 30m)
// POST /api/briefing      -> always regenerate
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("briefings")
    .select("id,body,created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fresh = data && Date.now() - new Date(data.created_at).getTime() < 30 * 60_000;
  if (fresh && data) return NextResponse.json({ body: data.body, created_at: data.created_at, fresh: true });

  const body = await generateBriefing(admin);
  return NextResponse.json({ body, created_at: new Date().toISOString(), fresh: false });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const body = await generateBriefing(admin);
  return NextResponse.json({ body, created_at: new Date().toISOString(), fresh: false });
}
