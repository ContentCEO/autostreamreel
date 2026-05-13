import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Briefcase, Building2, Calendar, PhoneOutgoing, Sparkles, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCents, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();

  const [
    businesses,
    leads,
    clients,
    customers,
    upcomingMeetings,
    openAlerts,
    pendingTasks,
    upcomingOutbound,
  ] = await Promise.all([
    supabase.from("businesses").select("id,name,industry").order("created_at"),
    supabase.from("leads").select("id,name,status,est_value_cents,business_id,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("clients").select("id,name,status,mrr_cents").eq("status", "active"),
    supabase.from("customers").select("id"),
    supabase.from("meetings").select("id,title,with_name,starts_at,business_id").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("alerts").select("id,title,severity,created_at,business_id").is("resolved_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id,title,status,priority,due_at,agent_id").in("status", ["pending", "in_progress"]).order("priority").limit(8),
    supabase.from("outbound_schedule").select("id,channel,scheduled_at,target_kind,status").eq("status", "scheduled").order("scheduled_at").limit(5),
  ]);

  const mrrTotal = (clients.data ?? []).reduce((s, c) => s + (c.mrr_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-sm text-ink-400">Everything across every business you run.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cc/businesses?new=1" className="btn-primary">+ New business</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Building2} label="Businesses" value={businesses.data?.length ?? 0} href="/cc/businesses" />
        <Stat icon={Briefcase} label="Active clients" value={clients.data?.length ?? 0} sub={formatCents(mrrTotal) + " MRR"} href="/cc/clients" />
        <Stat icon={Users} label="Customers" value={customers.data?.length ?? 0} href="/cc/customers" />
        <Stat icon={Target} label="New leads (recent)" value={leads.data?.length ?? 0} href="/cc/leads" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Open alerts" icon={AlertTriangle} href="/cc/alerts" empty={!openAlerts.data?.length} emptyText="Nothing's broken right now.">
          <ul className="divide-y divide-ink-800">
            {(openAlerts.data ?? []).map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">{a.title}</div>
                  <div className="text-xs text-ink-500">{relativeTime(a.created_at)}</div>
                </div>
                <span className={severityBadge(a.severity)}>{a.severity}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Upcoming meetings" icon={Calendar} href="/cc/meetings" empty={!upcomingMeetings.data?.length} emptyText="No meetings on the books.">
          <ul className="divide-y divide-ink-800">
            {(upcomingMeetings.data ?? []).map((m) => (
              <li key={m.id} className="py-2">
                <div className="text-sm">{m.title}</div>
                <div className="text-xs text-ink-500">
                  {m.with_name ?? "—"} · {relativeTime(m.starts_at)}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Tasks in flight" icon={Sparkles} href="/cc/tasks" empty={!pendingTasks.data?.length} emptyText="No active tasks. Tell Jarvis what to start.">
          <ul className="divide-y divide-ink-800">
            {(pendingTasks.data ?? []).map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">{t.title}</div>
                  <div className="text-xs text-ink-500">{t.status} · P{t.priority}</div>
                </div>
                {t.due_at && <span className="text-xs text-ink-500">{relativeTime(t.due_at)}</span>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Next outbound" icon={PhoneOutgoing} href="/cc/outbound" empty={!upcomingOutbound.data?.length} emptyText="No calls or texts scheduled.">
          <ul className="divide-y divide-ink-800">
            {(upcomingOutbound.data ?? []).map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="uppercase tracking-wide text-xs text-ink-500 mr-2">{o.channel}</span>
                  {o.target_kind}
                </div>
                <span className="text-xs text-ink-500">{relativeTime(o.scheduled_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, sub, href,
}: {
  icon: LucideIcon; label: string; value: number | string; sub?: string; href: string;
}) {
  return (
    <Link href={href} className="card p-4 hover:border-ink-700 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-500">{label}</span>
        <Icon size={16} className="text-ink-500" />
      </div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </Link>
  );
}

function Card({
  title, icon: Icon, href, children, empty, emptyText,
}: {
  title: string; icon: LucideIcon; href: string; children: React.ReactNode; empty?: boolean; emptyText?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink-200">
          <Icon size={14} className="text-ink-500" />
          {title}
        </h2>
        <Link href={href} className="text-xs text-accent-400 hover:underline">View all</Link>
      </div>
      {empty ? <p className="text-sm text-ink-500 py-4">{emptyText}</p> : children}
    </div>
  );
}

function severityBadge(sev: string) {
  if (sev === "critical") return "badge bg-danger-500/20 text-danger-500";
  if (sev === "warn")     return "badge bg-warn-500/20 text-warn-500";
  return "badge bg-ink-700 text-ink-300";
}
