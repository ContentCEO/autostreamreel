import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { ContactDetailLayout } from "@/components/ContactDetailLayout";
import { ContactEdit } from "@/components/ContactEdit";
import { OneOffOutbound } from "@/components/OneOffOutbound";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: client }, perms] = await Promise.all([
    supabase.from("clients").select("*").eq("id", params.id).maybeSingle(),
    listPermissions(),
  ]);
  if (!client) notFound();

  const [{ data: business }, { data: messages }, { data: outbound }] = await Promise.all([
    client.business_id
      ? supabase.from("businesses").select("name").eq("id", client.business_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("message_log")
      .select("id,channel,direction,body,created_at")
      .eq("target_kind", "client").eq("target_id", client.id)
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("outbound_schedule")
      .select("id,channel,status,scheduled_at,script")
      .eq("target_kind", "client").eq("target_id", client.id)
      .order("scheduled_at", { ascending: false }).limit(20),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <ContactDetailLayout
      title={client.name}
      backHref="/cc/clients"
      backLabel="All clients"
      headerMeta={
        <span>
          {business?.name ?? "—"} · {client.status} · MRR {formatCents(client.mrr_cents)}
          {client.email && <> · {client.email}</>}
          {client.phone && <> · {client.phone}</>}
        </span>
      }
      messages={messages ?? []}
      outbound={outbound ?? []}
      primary={
        <>
          <div className="card p-4 space-y-1 text-sm">
            <Row label="Contact" value={client.contact_name ?? "—"} />
            <Row label="Email"   value={client.email ?? "—"} />
            <Row label="Phone"   value={client.phone ?? "—"} />
            <Row label="Status"  value={client.status} />
            <Row label="MRR"     value={formatCents(client.mrr_cents)} />
            {client.notes && (
              <div className="pt-2 mt-2 border-t border-ink-800">
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Notes</div>
                <p className="text-xs text-ink-300 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            <div className="pt-3">
              <ContactEdit
                id={client.id}
                endpoint={`/api/clients/${client.id}`}
                listHref="/cc/clients"
                initial={{
                  name: client.name, contact_name: client.contact_name,
                  email: client.email, phone: client.phone,
                  status: client.status, mrr_cents: client.mrr_cents, notes: client.notes,
                }}
                fields={[
                  { key: "name",         label: "Name" },
                  { key: "contact_name", label: "Contact name" },
                  { key: "email",        label: "Email", type: "email" },
                  { key: "phone",        label: "Phone", type: "tel" },
                  { key: "status",       label: "Status", options: [
                    { value: "active",  label: "Active" },
                    { value: "paused",  label: "Paused" },
                    { value: "churned", label: "Churned" },
                  ] },
                  { key: "mrr_cents",    label: "MRR ($)", type: "number", centsField: true },
                  { key: "notes",        label: "Notes", type: "textarea" },
                ]}
              />
            </div>
          </div>
          <OneOffOutbound
            businessId={client.business_id}
            targetKind="client"
            targetId={client.id}
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
