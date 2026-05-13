import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { RowOutbound } from "@/components/RowOutbound";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createClient();
  const [{ data }, { data: businesses }, perms] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,contact_name,email,phone,status,mrr_cents,created_at,business_id")
      .order("created_at", { ascending: false }),
    supabase.from("businesses").select("id,name").order("created_at"),
    listPermissions(),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <QuickAdd
        title="Add client"
        endpoint="/api/clients"
        businesses={businesses ?? []}
        fields={[
          { key: "name",         label: "Name",         required: true, span: 2 },
          { key: "contact_name", label: "Contact name" },
          { key: "email",        label: "Email",        type: "email" },
          { key: "phone",        label: "Phone",        type: "tel" },
          { key: "status",       label: "Status",       options: [
            { value: "active",  label: "Active" },
            { value: "paused",  label: "Paused" },
            { value: "churned", label: "Churned" },
          ], defaultValue: "active" },
          { key: "mrr_cents",    label: "MRR ($)",      type: "number", centsField: true },
          { key: "notes",        label: "Notes",        type: "textarea", span: 2 },
        ]}
      />
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No clients yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/60 text-ink-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">MRR</th>
                <th className="px-3 py-2 text-left">Reach out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-ink-300">{c.contact_name ?? "—"}<div className="text-xs text-ink-500">{c.email ?? c.phone ?? ""}</div></td>
                  <td className="px-3 py-2"><span className="badge bg-ink-800 text-ink-300">{c.status}</span></td>
                  <td className="px-3 py-2 text-right">{formatCents(c.mrr_cents)}</td>
                  <td className="px-3 py-2">
                    <RowOutbound
                      businessId={c.business_id}
                      targetKind="client"
                      targetId={c.id}
                      canSms={canSms} canCall={canCall} canEmail={canEmail}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
