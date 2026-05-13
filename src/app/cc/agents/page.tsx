import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABEL, TIER_LABEL, type AgentDepartment, type AgentTier } from "@/lib/types";
import { DispatcherControls } from "@/components/DispatcherControls";
import { PermissionToggles } from "@/components/PermissionToggles";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: { business_id?: string };
}) {
  const supabase = createClient();
  let q = supabase
    .from("agents")
    .select("id,name,role,tier,department,is_active,business_id,parent_agent_id")
    .order("tier")
    .order("department")
    .order("name");
  if (searchParams.business_id) q = q.eq("business_id", searchParams.business_id);
  const [{ data }, allPerms] = await Promise.all([q, listPermissions()]);
  const autoPerms = allPerms.filter((p) => p.key === "agents.autonomous");

  type Row = NonNullable<typeof data>[number];
  const byDept = new Map<string, Row[]>();
  for (const a of data ?? []) {
    const key = a.department;
    if (!byDept.has(key)) byDept.set(key, []);
    byDept.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-ink-400">Your org chart. Click any agent to see what they&apos;re working on.</p>
      </header>

      <DispatcherControls />
      <PermissionToggles initial={autoPerms} />

      {!data?.length && (
        <p className="text-ink-400 text-sm">No agents yet — create a business to seed the org chart.</p>
      )}

      {Array.from(byDept.entries()).map(([dept, agents]) => (
        <section key={dept} className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-ink-500">{DEPARTMENT_LABEL[dept as AgentDepartment] ?? dept}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((a) => (
              <Link key={a.id} href={`/cc/agents/${a.id}`} className="card p-3 block hover:border-ink-700 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-ink-500 truncate">{a.role}</div>
                  </div>
                  <span className={tierBadge(a.tier as AgentTier)}>{TIER_LABEL[a.tier as AgentTier]}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function tierBadge(tier: AgentTier) {
  if (tier === "ceo")               return "badge bg-accent-500/20 text-accent-400";
  if (tier === "manager")           return "badge bg-warn-500/20 text-warn-500";
  if (tier === "assistant_manager") return "badge bg-ink-700 text-ink-200";
  return "badge bg-ink-800 text-ink-400";
}
