import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

// GET /api/jarvis/announcements?since=<ISO>
// Returns a list of short spoken-style announcements about anything that
// happened since the timestamp. Used by JarvisAutopilot to make Jarvis
// proactively interrupt the owner when stuff occurs.
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new URL(req.url).searchParams.get("since")
    ?? new Date(Date.now() - 5 * 60_000).toISOString();
  const admin = createAdminClient();
  const now = new Date();

  // New alerts (since), new leads (since), meetings starting in next 10m,
  // tasks marked done (since), inbound messages (since).
  const [{ data: alerts }, { data: leads }, { data: meetings }, { data: msgs }] = await Promise.all([
    admin.from("alerts")
      .select("id,title,severity,created_at")
      .gt("created_at", since)
      .is("resolved_at", null)
      .order("created_at", { ascending: true }),
    admin.from("leads")
      .select("id,name,source,created_at")
      .gt("created_at", since)
      .order("created_at", { ascending: true }),
    admin.from("meetings")
      .select("id,title,with_name,starts_at")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", new Date(now.getTime() + 10 * 60_000).toISOString())
      .order("starts_at", { ascending: true }),
    admin.from("message_log")
      .select("id,channel,body,created_at,target_kind")
      .gt("created_at", since)
      .eq("direction", "inbound")
      .order("created_at", { ascending: true }),
  ]);

  const announcements: { id: string; line: string }[] = [];
  for (const a of alerts ?? []) {
    if (a.severity === "critical") {
      announcements.push({ id: `alert-${a.id}`, line: `Critical alert. ${a.title}.` });
    } else if (a.severity === "warn") {
      announcements.push({ id: `alert-${a.id}`, line: `Heads up. ${a.title}.` });
    } else {
      announcements.push({ id: `alert-${a.id}`, line: `${a.title}.` });
    }
  }
  for (const l of leads ?? []) {
    announcements.push({ id: `lead-${l.id}`, line: `New lead: ${l.name}${l.source ? ` from ${l.source}` : ""}.` });
  }
  for (const m of meetings ?? []) {
    const mins = Math.max(0, Math.round((new Date(m.starts_at).getTime() - now.getTime()) / 60_000));
    announcements.push({ id: `meeting-${m.id}`, line: `Meeting starts in ${mins} minutes: ${m.title}${m.with_name ? ` with ${m.with_name}` : ""}.` });
  }
  for (const m of msgs ?? []) {
    announcements.push({ id: `msg-${m.id}`, line: `New ${m.channel} reply.${m.body ? ` They said: ${m.body.slice(0, 200)}` : ""}` });
  }

  return NextResponse.json({
    since,
    at: now.toISOString(),
    announcements,
  });
}
