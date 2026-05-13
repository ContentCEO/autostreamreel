import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { RowOutbound } from "@/components/RowOutbound";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const [{ data }, { data: businesses }, perms] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,email,phone,ltv_cents,created_at,business_id")
      .order("created_at", { ascending: false }),
    supabase.from("businesses").select("id,name").order("created_at"),
    listPermissions(),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <QuickAdd
        title="Add customer"
        endpoint="/api/customers"
        businesses={businesses ?? []}
        fields={[
          { key: "name",      label: "Name", required: true, span: 2 },
          { key: "email",     label: "Email", type: "email" },
          { key: "phone",     label: "Phone", type: "tel" },
          { key: "ltv_cents", label: "LTV ($)", type: "number", centsField: true },
          { key: "notes",     label: "Notes", type: "textarea", span: 2 },
        ]}
      />
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No customers yet.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((c) => (
            <li key={c.id} className="card p-4 space-y-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-ink-500">{c.email ?? c.phone ?? "—"}</div>
                <div className="text-xs text-ink-400 mt-2">LTV: {formatCents(c.ltv_cents)}</div>
              </div>
              <RowOutbound
                businessId={c.business_id}
                targetKind="customer"
                targetId={c.id}
                canSms={canSms} canCall={canCall} canEmail={canEmail}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
