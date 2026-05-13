import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data } = await supabase
    .from("alerts")
    .select("id,title,body,created_at")
    .eq("severity", "critical")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ alert: data ?? null });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase.from("alerts").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
