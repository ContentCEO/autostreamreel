import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { sendOutboundRow, type OutboundRow } from "@/lib/outbound";

// POST /api/outbound/run — manual drain ({ id?, limit? } in body) or single-row.
// GET  /api/outbound/run — Vercel cron drain (Authorization: Bearer <CRON_SECRET>).
async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isOwnerEmail(user.email));
}

async function drainDue(limit: number, id?: string) {
  const admin = createAdminClient();
  let rows: OutboundRow[] = [];
  if (id) {
    const { data } = await admin
      .from("outbound_schedule")
      .select("id,business_id,agent_id,target_kind,target_id,channel,script,scheduled_at,status")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { error: "not found" as const };
    rows = [data as OutboundRow];
  } else {
    const { data } = await admin
      .from("outbound_schedule")
      .select("id,business_id,agent_id,target_kind,target_id,channel,script,scheduled_at,status")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(Math.min(Math.max(limit, 1), 100));
    rows = (data ?? []) as OutboundRow[];
  }
  const results: { id: string; ok: boolean; detail: string }[] = [];
  for (const r of rows) {
    const res = await sendOutboundRow(admin, r);
    results.push({ id: r.id, ...res });
  }
  return { ran: results.length, results };
}

export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; limit?: number };
  const r = await drainDue(body.limit ?? 20, body.id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 404 });
  return NextResponse.json(r);
}

export async function GET(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await drainDue(20);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 404 });
  return NextResponse.json(r);
}
