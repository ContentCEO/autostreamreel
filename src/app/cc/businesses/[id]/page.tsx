import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sparkles, Briefcase, Users, Target, AlertTriangle, Calendar, PhoneOutgoing, Workflow } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCents, relativeTime } from "@/lib/utils";
import { LEAD_STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BusinessDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,industry,website,notes,created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!business) notFound();

  const [
    { data: clients },
    { data: customers },
    { data: leads },
    { data: meetings },
    { data: alerts },
    { data: tasks },
    { data: outbound },
    { data: agentSummary },
  ] = await Promise.all([
    supabase.from("clients").select("id,name,status,mrr_cents").eq("business_id", business.id),
    supabase.from("customers").select("id").eq("business_id", business.id),
    supabase.from("leads").select("id,name,status,est_value_cents,created_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("meetings").select("id,title,with_name,starts_at").eq("business_id", business.id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("alerts").select("id,title,severity,created_at,resolved_at").eq("business_id", business.id).is("resolved_at", null).order("created_at", { ascending: false }).limit(8),
    supabase.from("tasks").select("id,title,status,priority,due_at").eq("business_id", business.id).in("status", ["pending", "in_progress"]).order("priority").limit(8),
    supabase.from("outbound_schedule").select("id,channel,target_kind,scheduled_at,status").eq("business_id", business.id).order("scheduled_at").limit(5),
    supabase.from("agents").select("tier,department,is_active").eq("business_id", business.id),
  ]);

  const activeClients = (clients ?? []).filter((c) => c.status === "active");
  const mrr = activeClients.reduce((s, c) => s + (c.mrr_cents ?? 0), 0);

  const pipelineCount: Record<string, number> = {};
  let pipelineValue = 0;
  // Pull a wider pipeline count (separate from the recent-8).
  const { data: pipelineAll } = await supabase
    .from("leads").select("status,est_value_cents").eq("business_id", business.id);
  for (const l of pipelineAll ?? []) {
    pipelineCount[l.status] = (pipelineCount[l.status] ?? 0) + 1;
    pipelineValue += l.est_value_cents ?? 0;
  }

  const agentTotal  = (agentSummary ?? []).length;
  const agentActive = (agentSummary ?? []).filter((a) => a.is_active).length;

  return (
    <div className="space-y-6">
      <Link href="/cc/businesses" className="text-xs text-ink-400 hover:text-ink-200 inline-flex items-center gap-1">
        <ChevronLeft size={12} /> All businesses
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <p className="text-sm text-ink-400 mt-1">
            {business.industry ?? "—"}
            {business.website && <> · <a href={business.website} target="_blank" rel="noreferrer" className="hover:text-ink-200 underline">{business.website}</a></>}
          </p>
        </div>
        <Link href={`/cc/agents?business_id=${business.id}`} className="btn-ghost text-sm inline-flex items-center gap-1">
          <Sparkles size={12} /> View team
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Briefcase} label="Active clients" value={activeClients.length} sub={`${formatCents(mrr)} MRR`} href={`/cc/clients`} />
        <Stat icon={Users}     label="Customers"      value={(customers ?? []).length} href={`/cc/customers`} />
        <Stat icon={Target}    label="Leads"          value={(pipelineAll ?? []).length} sub={`${formatCents(pipelineValue)} pipeline`} href={`/cc/leads`} />
        <Stat icon={Sparkles}  label="Agents"         value={agentActive} sub={`${agentTotal} total`} href={`/cc/agents?business_id=${business.id}`} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Pipeline by stage" icon={Target}>
          {(["new","contacted","qualified","won","lost"] as const).map((s) => (
            <div key={s} className="flex items-center justify-between py-1 text-sm">
              <span className="text-ink-400">{LEAD_STATUS_LABEL[s]}</span>
              <span className="text-ink-200 tabular-nums">{pipelineCount[s] ?? 0}</span>
            </div>
          ))}
        </Card>

        <Card title="Open alerts" icon={AlertTriangle} href="/cc/alerts" empty={!alerts?.length} emptyText="Nothing's broken right now.">
          <ul className="divide-y divide-ink-800">
            {(alerts ?? []).map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm truncate">{a.title}</span>
                <span className={a.severity === "critical" ? "badge bg-danger-500/20 text-danger-500" : a.severity === "warn" ? "badge bg-warn-500/20 text-warn-500" : "badge bg-ink-700 text-ink-300"}>{a.severity}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Upcoming meetings" icon={Calendar} href="/cc/meetings" empty={!meetings?.length} emptyText="Nothing on the books.">
          <ul className="divide-y divide-ink-800">
            {(meetings ?? []).map((m) => (
              <li key={m.id} className="py-2">
                <div className="text-sm">{m.title}</div>
                <div className="text-xs text-ink-500">{m.with_name ?? "—"} · {relativeTime(m.starts_at)}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent leads" icon={Target} href="/cc/leads" empty={!leads?.length} emptyText="No leads yet.">
          <ul className="divide-y divide-ink-800">
            {(leads ?? []).map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <Link href={`/cc/leads/${l.id}`} className="text-sm hover:text-accent-400 truncate">{l.name}</Link>
                <span className="text-xs text-ink-500">{l.status}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Tasks in flight" icon={Workflow} href="/cc/tasks" empty={!tasks?.length} emptyText="No active tasks.">
          <ul className="divide-y divide-ink-800">
            {(tasks ?? []).map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm truncate">{t.title}</span>
                <span className="text-xs text-ink-500">P{t.priority} · {t.status}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Next outbound" icon={PhoneOutgoing} href="/cc/outbound" empty={!outbound?.length} emptyText="Nothing scheduled.">
          <ul className="divide-y divide-ink-800">
            {(outbound ?? []).map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm uppercase tracking-wide text-xs">{o.channel} · {o.target_kind}</span>
                <span className="text-xs text-ink-500">{relativeTime(o.scheduled_at)} · {o.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {business.notes && (
        <section className="card p-4">
          <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Notes</div>
          <p className="text-sm text-ink-300 whitespace-pre-wrap">{business.notes}</p>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, sub, href,
}: {
  icon: typeof Target; label: string; value: number | string; sub?: string; href: string;
}) {
  return (
    <Link href={href} className="card p-4 hover:border-ink-700 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-500">{label}</span>
        <Icon size={14} className="text-ink-500" />
      </div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </Link>
  );
}

function Card({
  title, icon: Icon, href, children, empty, emptyText,
}: {
  title: string; icon: typeof Target; href?: string;
  children: React.ReactNode; empty?: boolean; emptyText?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink-200">
          <Icon size={14} className="text-ink-500" />
          {title}
        </h2>
        {href && <Link href={href} className="text-xs text-accent-400 hover:underline">View all</Link>}
      </div>
      {empty ? <p className="text-sm text-ink-500 py-3">{emptyText}</p> : children}
    </div>
  );
}
