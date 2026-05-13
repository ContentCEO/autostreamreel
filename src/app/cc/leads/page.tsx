import { createClient } from "@/lib/supabase/server";
import { formatCents, relativeTime } from "@/lib/utils";
import { LEAD_STATUS_LABEL } from "@/lib/types";
import { QuickAdd } from "@/components/QuickAdd";
import { RowOutbound } from "@/components/RowOutbound";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();
  const [{ data }, { data: businesses }, perms] = await Promise.all([
    supabase
      .from("leads")
      .select("id,name,email,phone,source,status,est_value_cents,ai_score,created_at,business_id")
      .order("created_at", { ascending: false }),
    supabase.from("businesses").select("id,name").order("created_at"),
    listPermissions(),
  ]);

  const canSms   = perms.find((p) => p.key === "outbound.sms")?.enabled   ?? false;
  const canCall  = perms.find((p) => p.key === "outbound.call")?.enabled  ?? false;
  const canEmail = perms.find((p) => p.key === "outbound.email")?.enabled ?? false;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <QuickAdd
        title="Add lead"
        endpoint="/api/leads"
        businesses={businesses ?? []}
        fields={[
          { key: "name",            label: "Name", required: true, span: 2 },
          { key: "email",           label: "Email", type: "email" },
          { key: "phone",           label: "Phone", type: "tel" },
          { key: "source",          label: "Source", placeholder: "Referral, ad, cold list, …" },
          { key: "status",          label: "Status", options: [
            { value: "new",        label: "New" },
            { value: "contacted",  label: "Contacted" },
            { value: "qualified",  label: "Qualified" },
            { value: "won",        label: "Won" },
            { value: "lost",       label: "Lost" },
          ], defaultValue: "new" },
          { key: "est_value_cents", label: "Est. value ($)", type: "number", centsField: true },
          { key: "ai_score",        label: "AI score (0-100)", type: "number" },
          { key: "notes",           label: "Notes", type: "textarea", span: 2 },
        ]}
      />
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No leads yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/60 text-ink-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="px-3 py-2 text-left">Lead</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Est. value</th>
                <th className="px-3 py-2 text-right">Age</th>
                <th className="px-3 py-2 text-left">Reach out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {data.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-ink-500">{l.email ?? l.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2 text-ink-300">{l.source ?? "—"}</td>
                  <td className="px-3 py-2"><span className="badge bg-ink-800 text-ink-300">{LEAD_STATUS_LABEL[l.status as keyof typeof LEAD_STATUS_LABEL] ?? l.status}</span></td>
                  <td className="px-3 py-2 text-right">{formatCents(l.est_value_cents)}</td>
                  <td className="px-3 py-2 text-right text-ink-500">{relativeTime(l.created_at)}</td>
                  <td className="px-3 py-2">
                    <RowOutbound
                      businessId={l.business_id}
                      targetKind="lead"
                      targetId={l.id}
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
