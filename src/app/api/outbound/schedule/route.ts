import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { scheduleCheckIns } from "@/lib/outbound";

// POST /api/outbound/schedule
// Two modes:
//   { business_id, channel, cadence_days?, count?, starts_at? }    -> bulk check-ins
//   { single: { business_id, target_kind, target_id, channel, scheduled_at?, script? } }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  if (body.single) {
    const s = body.single;
    if (!s.business_id || !s.target_kind || !s.target_id || !s.channel) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    const { data, error } = await admin
      .from("outbound_schedule")
      .insert({
        business_id:  s.business_id,
        agent_id:     s.agent_id ?? null,
        target_kind:  s.target_kind,
        target_id:    s.target_id,
        channel:      s.channel,
        script:       s.script ?? null,
        scheduled_at: s.scheduled_at ?? new Date(Date.now() + 60_000).toISOString(),
        status:       "scheduled",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data?.id });
  }

  if (!body.business_id || !body.channel) {
    return NextResponse.json({ error: "business_id and channel required" }, { status: 400 });
  }

  const created = await scheduleCheckIns(admin, {
    business_id:  body.business_id,
    channel:      body.channel,
    starts_at:    body.starts_at,
    cadence_days: body.cadence_days,
    count:        body.count,
  });
  return NextResponse.json({ created });
}
