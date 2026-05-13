import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { sendOutboundRow, type OutboundRow } from "@/lib/outbound";

// POST /api/outbound/run
// Body: { id?: string, limit?: number }
//   - With id: runs one specific scheduled row immediately.
//   - Without id: drains every "scheduled" row whose scheduled_at <= now (cap by limit, default 20).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    // Allow CRON-style invocations from a known secret too — handy for Vercel Cron.
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; limit?: number };
  const admin = createAdminClient();

  let rows: OutboundRow[] = [];
  if (body.id) {
    const { data } = await admin
      .from("outbound_schedule")
      .select("id,business_id,agent_id,target_kind,target_id,channel,script,scheduled_at,status")
      .eq("id", body.id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    rows = [data as OutboundRow];
  } else {
    const { data } = await admin
      .from("outbound_schedule")
      .select("id,business_id,agent_id,target_kind,target_id,channel,script,scheduled_at,status")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(Math.min(Math.max(body.limit ?? 20, 1), 100));
    rows = (data ?? []) as OutboundRow[];
  }

  const results: { id: string; ok: boolean; detail: string }[] = [];
  for (const r of rows) {
    const res = await sendOutboundRow(admin, r);
    results.push({ id: r.id, ...res });
  }
  return NextResponse.json({ ran: results.length, results });
}
