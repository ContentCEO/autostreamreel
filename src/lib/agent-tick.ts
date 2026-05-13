// Autonomous tick for the agent roster. Each call:
//   1. Picks every active agent whose last run is older than the role cadence.
//   2. Builds a tight per-role prompt from live data (pipeline, alerts, etc).
//   3. Runs Claude, saves the output as a completed task, records agent_runs.
//   4. If Claude flagged a blocker, raises an alert to the owner.
//
// The cadence is intentionally simple — cron parsing would be overkill for a
// single-tenant tool. Tier-based fallback: CEO daily, managers daily, ICs every
// 4h. Agents with an explicit schedule_cron field still use that hour-of-day.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";
import { isAllowed } from "@/lib/permissions";

type Tier = "ceo" | "manager" | "assistant_manager" | "employee";

const FALLBACK_INTERVAL_MS: Record<Tier, number> = {
  ceo:               12 * 3_600_000,
  manager:           12 * 3_600_000,
  assistant_manager: 12 * 3_600_000,
  employee:           4 * 3_600_000,
};

interface AgentRow {
  id: string;
  business_id: string | null;
  tier: Tier;
  department: string;
  role: string;
  name: string;
  instructions: string | null;
  schedule_cron: string | null;
  is_active: boolean;
}

export async function runAutonomousTick(
  admin: SupabaseClient,
  opts: { force?: boolean; limit?: number; business_id?: string } = {},
): Promise<{ ran: number; alerts: number; skipped: number }> {
  if (!opts.force && !(await isAllowed("agents.autonomous"))) {
    return { ran: 0, alerts: 0, skipped: 0 };
  }

  let q = admin.from("agents").select("id,business_id,tier,department,role,name,instructions,schedule_cron,is_active").eq("is_active", true);
  if (opts.business_id) q = q.eq("business_id", opts.business_id);
  const { data: agents } = await q;

  // Pre-load last-run timestamps in one shot.
  const ids = (agents ?? []).map((a) => a.id);
  const { data: runs } = ids.length
    ? await admin.from("agent_runs").select("agent_id,created_at").in("agent_id", ids).order("created_at", { ascending: false })
    : { data: [] as { agent_id: string; created_at: string }[] };
  const lastRun = new Map<string, number>();
  for (const r of runs ?? []) {
    if (!lastRun.has(r.agent_id)) lastRun.set(r.agent_id, new Date(r.created_at).getTime());
  }

  const now = Date.now();
  const due: AgentRow[] = [];
  for (const a of (agents ?? []) as AgentRow[]) {
    const last = lastRun.get(a.id) ?? 0;
    const interval = FALLBACK_INTERVAL_MS[a.tier] ?? 4 * 3_600_000;
    if (opts.force || now - last >= interval) due.push(a);
  }
  const cap = Math.min(opts.limit ?? 20, due.length);
  const batch = due.slice(0, cap);

  let alerts = 0;
  for (const agent of batch) {
    const ctx = await buildContext(admin, agent);
    const text = await generateText({
      system:
        (agent.instructions ?? `You are ${agent.name}, a ${agent.role}.`) +
        "\nOutput format (strict):" +
        "\n• 1 line: what you just did or are about to do." +
        "\n• 1 line: any number you actually moved (or 'no movement')." +
        "\n• 1 line: BLOCKER: <text> — only if you cannot proceed without the owner.",
      user: ctx,
      maxTokens: 400,
    });

    await admin.from("tasks").insert({
      business_id: agent.business_id,
      agent_id:    agent.id,
      title:       `${agent.role} tick`,
      status:      "done",
      priority:    4,
      completed_at: new Date().toISOString(),
      output:      { text },
    });

    await admin.from("agent_runs").insert({
      agent_id:    agent.id,
      business_id: agent.business_id,
      reason:      "tick",
      status:      /BLOCKER:/i.test(text) ? "blocked" : "ok",
      summary:     text.slice(0, 1000),
    });

    if (/BLOCKER:/i.test(text)) {
      const line = text.split("\n").find((l) => /BLOCKER:/i.test(l)) ?? text;
      await admin.from("alerts").insert({
        business_id: agent.business_id,
        agent_id:    agent.id,
        severity:    agent.tier === "ceo" || agent.tier === "manager" ? "warn" : "info",
        title:       `${agent.name} (${agent.role}) is blocked`,
        body:        line,
      });
      alerts += 1;
    }
  }

  return { ran: batch.length, alerts, skipped: due.length - batch.length };
}

async function buildContext(admin: SupabaseClient, agent: AgentRow): Promise<string> {
  const [{ data: pipeline }, { data: openAlerts }] = await Promise.all([
    admin.from("leads").select("status").eq("business_id", agent.business_id ?? ""),
    admin.from("alerts").select("title,severity").eq("business_id", agent.business_id ?? "").is("resolved_at", null).limit(5),
  ]);
  const counts: Record<string, number> = {};
  for (const r of pipeline ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const lines: string[] = [
    `It is ${new Date().toUTCString()}.`,
    `Your role: ${agent.role}. Department: ${agent.department}.`,
    `Pipeline counts by status: ${JSON.stringify(counts)}`,
  ];
  if (openAlerts?.length) {
    lines.push(`Open alerts: ${openAlerts.map((a) => `[${a.severity}] ${a.title}`).join("; ")}`);
  }
  lines.push("Do one concrete action you can complete autonomously this tick. Be specific.");
  return lines.join("\n");
}
