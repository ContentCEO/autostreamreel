import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { placeCall, isTwilioConfigured, getOwnerPhone } from "@/lib/twilio";

// POST /api/alerts/[id]/call
// Places a Twilio voice call to OWNER_PHONE that reads the alert aloud.
// Used both manually (button on /cc/alerts) and automatically when a
// critical alert is created (via the alerts trigger / a server-side hook).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Allow cron-style invocations too so we can wire automatic calls later.
  const cron = req.headers.get("authorization");
  const cronOk = cron && process.env.CRON_SECRET && cron === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && (!user || !isOwnerEmail(user.email))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: "twilio not configured" }, { status: 400 });
  }
  const phone = getOwnerPhone();
  if (!phone) {
    return NextResponse.json({ error: "OWNER_PHONE env var not set" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: alert } = await admin
    .from("alerts")
    .select("id,title,body,severity")
    .eq("id", params.id)
    .maybeSingle();
  if (!alert) return NextResponse.json({ error: "alert not found" }, { status: 404 });

  const origin = process.env.PUBLIC_APP_ORIGIN ?? new URL(req.url).origin;
  const twimlUrl = `${origin.replace(/\/$/, "")}/api/alerts/${alert.id}/twiml`;
  const r = await placeCall({ to: phone, twimlUrl });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });

  await admin.from("message_log").insert({
    channel:    "call",
    direction:  "outbound",
    body:       `Critical alert call: ${alert.title}`,
    external_id: r.sid,
  });

  return NextResponse.json({ sid: r.sid, to: phone });
}
