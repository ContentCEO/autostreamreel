import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { ContactDetailLayout } from "@/components/ContactDetailLayout";
import { ContactEdit } from "@/components/ContactEdit";
import { OneOffOutbound } from "@/components/OneOffOutbound";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: customer }, perms] = await Promise.all([
    supabase.from("customers").select("*").eq("id", params.id).maybeSingle(),
    listPermissions(),
  ]);
  if (!customer) notFound();

  const [{ data: business }, { data: messages }, { data: outbound }] = await Promise.all([
    customer.business_id
      ? supabase.from("businesses").select("name").eq("id", customer.business_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("message_log")
      .select("id,channel,direction,body,created_at")
      .eq("target_kind", "customer").eq("target_id", customer.id)
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("outbound_schedule")
      .select("id,channel,status,scheduled_at,script")
      .eq("target_kind", "customer").eq("target_id", customer.id)
      .order("scheduled_at", { ascending: false }).limit(20),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <ContactDetailLayout
      title={customer.name}
      backHref="/cc/customers"
      backLabel="All customers"
      headerMeta={
        <span>
          {business?.name ?? "—"} · LTV {formatCents(customer.ltv_cents)}
          {customer.email && <> · {customer.email}</>}
          {customer.phone && <> · {customer.phone}</>}
        </span>
      }
      messages={messages ?? []}
      outbound={outbound ?? []}
      primary={
        <>
          <div className="card p-4 space-y-1 text-sm">
            <Row label="Email" value={customer.email ?? "—"} />
            <Row label="Phone" value={customer.phone ?? "—"} />
            <Row label="LTV"   value={formatCents(customer.ltv_cents)} />
            {customer.notes && (
              <div className="pt-2 mt-2 border-t border-ink-800">
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">Notes</div>
                <p className="text-xs text-ink-300 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
            <div className="pt-3">
              <ContactEdit
                id={customer.id}
                endpoint={`/api/customers/${customer.id}`}
                listHref="/cc/customers"
                initial={{
                  name: customer.name, email: customer.email, phone: customer.phone,
                  ltv_cents: customer.ltv_cents, notes: customer.notes,
                }}
                fields={[
                  { key: "name",      label: "Name" },
                  { key: "email",     label: "Email", type: "email" },
                  { key: "phone",     label: "Phone", type: "tel" },
                  { key: "ltv_cents", label: "LTV ($)", type: "number", centsField: true },
                  { key: "notes",     label: "Notes", type: "textarea" },
                ]}
              />
            </div>
          </div>
          <OneOffOutbound
            businessId={customer.business_id}
            targetKind="customer"
            targetId={customer.id}
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
