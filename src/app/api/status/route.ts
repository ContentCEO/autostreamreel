import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { isAllowed } from "@/lib/permissions";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const next24 = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const [alerts, tasks, outbound, autonomous] = await Promise.all([
    supabase.from("alerts").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
    supabase
      .from("outbound_schedule")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .lte("scheduled_at", next24),
    isAllowed("agents.autonomous"),
  ]);

  return NextResponse.json({
    open_alerts:                 alerts.count ?? 0,
    active_tasks:                tasks.count  ?? 0,
    scheduled_outbound_next_24h: outbound.count ?? 0,
    autonomous_on:               autonomous,
  });
}
