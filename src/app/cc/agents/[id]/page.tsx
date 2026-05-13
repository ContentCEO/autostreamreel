import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sparkles, User2, AlertTriangle, Workflow } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import {
  DEPARTMENT_LABEL, TIER_LABEL,
  type AgentDepartment, type AgentTier,
} from "@/lib/types";
import { AgentDispatchBox } from "@/components/AgentDispatchBox";
import { ContactEdit } from "@/components/ContactEdit";

export const dynamic = "force-dynamic";

export default async function AgentDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id,name,role,tier,department,persona,instructions,schedule_cron,is_active,business_id,parent_agent_id,created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!agent) notFound();

  const [
    { data: business },
    { data: parent },
    { data: reports },
    { data: recentRuns },
    { data: recentTasks },
    { data: recentAlerts },
  ] = await Promise.all([
    agent.business_id
      ? supabase.from("businesses").select("id,name").eq("id", agent.business_id).maybeSingle()
      : Promise.resolve({ data: null as { id: string; name: string } | null }),
    agent.parent_agent_id
      ? supabase.from("agents").select("id,name,role").eq("id", agent.parent_agent_id).maybeSingle()
      : Promise.resolve({ data: null as { id: string; name: string; role: string } | null }),
    supabase.from("agents")
      .select("id,name,role,tier")
      .eq("parent_agent_id", agent.id)
      .order("name"),
    supabase.from("agent_runs")
      .select("id,reason,status,summary,created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("tasks")
      .select("id,title,status,priority,output,created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("alerts")
      .select("id,title,severity,resolved_at,created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/cc/agents${business?.id ? `?business_id=${business.id}` : ""}`}
            className="text-xs text-ink-400 hover:text-ink-200 inline-flex items-center gap-1">
        <ChevronLeft size={12} /> All agents
      </Link>

      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          <span className={tierBadge(agent.tier as AgentTier)}>{TIER_LABEL[agent.tier as AgentTier]}</span>
          <span className="badge bg-ink-800 text-ink-300">{DEPARTMENT_LABEL[agent.department as AgentDepartment] ?? agent.department}</span>
          {!agent.is_active && <span className="badge bg-danger-500/20 text-danger-500">inactive</span>}
        </div>
        <p className="text-sm text-ink-400 mt-1">{agent.role}</p>
        <p className="text-xs text-ink-500 mt-1">
          {business ? <>at <Link href={`/cc/agents?business_id=${business.id}`} className="hover:text-ink-300">{business.name}</Link></> : "—"}
          {parent && <> · reports to <Link href={`/cc/agents/${parent.id}`} className="hover:text-ink-300">{parent.name}</Link> ({parent.role})</>}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section>
            <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Recent ticks</h2>
            {!recentRuns?.length ? (
              <p className="text-sm text-ink-500">This agent hasn&apos;t run yet. Dispatch them on the right.</p>
            ) : (
              <ul className="space-y-2">
                {recentRuns.map((r) => (
                  <li key={r.id} className="card p-3">
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                        <Sparkles size={10} /> {r.reason ?? "tick"} · {r.status}
                      </span>
                      <span>{relativeTime(r.created_at)}</span>
                    </div>
                    {r.summary && <p className="text-sm text-ink-200 mt-1 whitespace-pre-wrap">{r.summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Recent tasks</h2>
            {!recentTasks?.length ? (
              <p className="text-sm text-ink-500">No tasks recorded.</p>
            ) : (
              <ul className="space-y-2">
                {recentTasks.map((t) => {
                  const out = (t.output && typeof t.output === "object" && "text" in (t.output as Record<string, unknown>))
                    ? String((t.output as Record<string, unknown>).text)
                    : null;
                  return (
                    <li key={t.id} className="card p-3">
                      <div className="flex items-center justify-between text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                          <Workflow size={10} /> P{t.priority} · {t.status}
                        </span>
                        <span>{relativeTime(t.created_at)}</span>
                      </div>
                      <div className="text-sm text-ink-200 mt-1">{t.title}</div>
                      {out && <p className="text-xs text-ink-400 mt-1 whitespace-pre-wrap line-clamp-6">{out}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {recentAlerts && recentAlerts.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Alerts from this agent</h2>
              <ul className="space-y-2">
                {recentAlerts.map((a) => (
                  <li key={a.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.title}</div>
                      <div className="text-xs text-ink-500">{relativeTime(a.created_at)}{a.resolved_at && " · resolved"}</div>
                    </div>
                    <span className={a.severity === "critical" ? "badge bg-danger-500/20 text-danger-500" : a.severity === "warn" ? "badge bg-warn-500/20 text-warn-500" : "badge bg-ink-700 text-ink-300"}>
                      <AlertTriangle size={10} className="inline mr-1" />{a.severity}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <AgentDispatchBox agentId={agent.id} agentName={agent.name} />

          {reports && reports.length > 0 && (
            <div className="card p-4">
              <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">Direct reports</div>
              <ul className="space-y-1">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/cc/agents/${r.id}`} className="text-sm hover:text-accent-400 inline-flex items-center gap-1">
                      <User2 size={12} className="text-ink-500" /> {r.name}
                      <span className="text-xs text-ink-500"> · {r.role}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4 space-y-1 text-sm">
            <Row label="Role"      value={agent.role} />
            <Row label="Tier"      value={TIER_LABEL[agent.tier as AgentTier]} />
            <Row label="Dept"      value={DEPARTMENT_LABEL[agent.department as AgentDepartment] ?? agent.department} />
            <Row label="Active"    value={agent.is_active ? "yes" : "no"} />
            <Row label="Schedule"  value={agent.schedule_cron ?? "default cadence"} />
            {agent.persona && (
              <div className="pt-2 mt-2 border-t border-ink-800">
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Persona</div>
                <p className="text-xs text-ink-300 whitespace-pre-wrap">{agent.persona}</p>
              </div>
            )}
            {agent.instructions && (
              <div className="pt-2 mt-2 border-t border-ink-800">
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Instructions</div>
                <p className="text-xs text-ink-300 whitespace-pre-wrap">{agent.instructions}</p>
              </div>
            )}
            <div className="pt-3">
              <ContactEdit
                id={agent.id}
                endpoint={`/api/agents/${agent.id}`}
                listHref={`/cc/agents${business?.id ? `?business_id=${business.id}` : ""}`}
                canDelete={false}
                initial={{
                  name: agent.name,
                  persona: agent.persona,
                  instructions: agent.instructions,
                  schedule_cron: agent.schedule_cron,
                  is_active: agent.is_active ? "true" : "false",
                }}
                fields={[
                  { key: "name",          label: "Name" },
                  { key: "persona",       label: "Persona", type: "textarea" },
                  { key: "instructions",  label: "Instructions", type: "textarea" },
                  { key: "schedule_cron", label: "Schedule cron (optional)" },
                  { key: "is_active",     label: "Active", options: [
                    { value: "true",  label: "Active" },
                    { value: "false", label: "Inactive" },
                  ] },
                ]}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-ink-200 text-right">{value}</span>
    </div>
  );
}

function tierBadge(tier: AgentTier) {
  if (tier === "ceo")               return "badge bg-accent-500/20 text-accent-400";
  if (tier === "manager")           return "badge bg-warn-500/20 text-warn-500";
  if (tier === "assistant_manager") return "badge bg-ink-700 text-ink-200";
  return "badge bg-ink-800 text-ink-400";
}
