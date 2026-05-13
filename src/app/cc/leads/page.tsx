import { createClient } from "@/lib/supabase/server";
import { formatCents, relativeTime } from "@/lib/utils";
import { LEAD_STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("id,name,email,phone,source,status,est_value_cents,ai_score,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Leads</h1>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
