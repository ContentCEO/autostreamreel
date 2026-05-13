// Daily briefing — generated paragraph the app reads to you on open.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";

export async function generateBriefing(admin: SupabaseClient): Promise<string> {
  const now = new Date();
  const [
    { data: businesses },
    { data: pipeline },
    { data: alerts },
    { data: tasks },
    { data: meetings },
    { data: dueOutbound },
  ] = await Promise.all([
    admin.from("businesses").select("id,name"),
    admin.from("leads").select("status,est_value_cents"),
    admin.from("alerts").select("title,severity,created_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(5),
    admin.from("tasks").select("title,status,priority,due_at").in("status", ["pending", "in_progress"]).order("priority").limit(8),
    admin.from("meetings").select("title,with_name,starts_at").gte("starts_at", now.toISOString()).order("starts_at").limit(3),
    admin.from("outbound_schedule").select("channel,scheduled_at").eq("status", "scheduled").lte("scheduled_at", new Date(now.getTime() + 24 * 3600_000).toISOString()),
  ]);

  const pipelineCounts: Record<string, number> = {};
  let pipelineValue = 0;
  for (const l of pipeline ?? []) {
    pipelineCounts[l.status] = (pipelineCounts[l.status] ?? 0) + 1;
    pipelineValue += l.est_value_cents ?? 0;
  }

  const facts = {
    now: now.toUTCString(),
    businesses: (businesses ?? []).map((b) => b.name),
    pipeline_counts: pipelineCounts,
    pipeline_value_cents: pipelineValue,
    open_alerts: alerts ?? [],
    active_tasks: tasks ?? [],
    upcoming_meetings: meetings ?? [],
    due_outbound_next_24h: (dueOutbound ?? []).length,
  };

  const body = await generateText({
    system:
      "You are Jarvis, briefing the owner the moment they open the Control Center. " +
      "Two short paragraphs. First paragraph: what matters right now (alerts, meetings, blockers). " +
      "Second paragraph: what you are going to do next without being asked. " +
      "No greetings, no fluff. Refer to numbers from the data only.",
    user: `Live snapshot:\n${JSON.stringify(facts, null, 2)}`,
    maxTokens: 600,
  });

  await admin.from("briefings").insert({ scope: "global", body });
  return body;
}
