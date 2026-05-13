import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { ContactDetailLayout } from "@/components/ContactDetailLayout";
import { ContactEdit } from "@/components/ContactEdit";
import { OneOffOutbound } from "@/components/OneOffOutbound";
import { listPermissions } from "@/lib/permissions";
import { LEAD_STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: lead }, perms] = await Promise.all([
    supabase.from("leads").select("*").eq("id", params.id).maybeSingle(),
    listPermissions(),
  ]);
  if (!lead) notFound();

  const [{ data: business }, { data: messages }, { data: outbound }] = await Promise.all([
    lead.business_id
      ? supabase.from("businesses").select("name").eq("id", lead.business_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("message_log")
      .select("id,channel,direction,body,created_at")
      .eq("target_kind", "lead").eq("target_id", lead.id)
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("outbound_schedule")
      .select("id,channel,status,scheduled_at,script")
      .eq("target_kind", "lead").eq("target_id", lead.id)
      .order("scheduled_at", { ascending: false }).limit(20),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <ContactDetailLayout
      title={lead.name}
      backHref="/cc/leads"
      backLabel="All leads"
      headerMeta={
        <span>
          {business?.name ?? "—"} · {LEAD_STATUS_LABEL[lead.status as keyof typeof LEAD_STATUS_LABEL] ?? lead.status}
          {lead.source && <> · via {lead.source}</>}
          {typeof lead.est_value_cents === "number" && <> · {formatCents(lead.est_value_cents)} est.</>}
        </span>
      }
      messages={messages ?? []}
      outbound={outbound ?? []}
      primary={
        <>
          <div className="card p-4 space-y-1 text-sm">
            <Row label="Email"     value={lead.email ?? "—"} />
            <Row label="Phone"     value={lead.phone ?? "—"} />
            <Row label="Source"    value={lead.source ?? "—"} />
            <Row label="AI score"  value={lead.ai_score ?? "—"} />
            {lead.notes && (
              <div className="pt-2 mt-2 border-t border-ink-800">
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Notes</div>
                <p className="text-xs text-ink-300 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
            <div className="pt-3">
              <ContactEdit
                id={lead.id}
                endpoint={`/api/leads/${lead.id}`}
                listHref="/cc/leads"
                initial={{
                  name: lead.name, email: lead.email, phone: lead.phone,
                  source: lead.source, status: lead.status,
                  est_value_cents: lead.est_value_cents, ai_score: lead.ai_score, notes: lead.notes,
                }}
                fields={[
                  { key: "name",            label: "Name" },
                  { key: "email",           label: "Email", type: "email" },
                  { key: "phone",           label: "Phone", type: "tel" },
                  { key: "source",          label: "Source" },
                  { key: "status",          label: "Status", options: [
                    { value: "new",       label: "New" },
                    { value: "contacted", label: "Contacted" },
                    { value: "qualified", label: "Qualified" },
                    { value: "won",       label: "Won" },
                    { value: "lost",      label: "Lost" },
                  ] },
                  { key: "est_value_cents", label: "Est. value ($)", type: "number", centsField: true },
                  { key: "ai_score",        label: "AI score (0-100)", type: "number" },
                  { key: "notes",           label: "Notes", type: "textarea" },
                ]}
              />
            </div>
          </div>
          <OneOffOutbound
            businessId={lead.business_id}
            targetKind="lead"
            targetId={lead.id}
            canSms={canSms} canCall={canCall} canEmail={canEmail}
          />
        </>
      }
    />
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
