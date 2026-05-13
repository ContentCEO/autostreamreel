import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id,name,contact_name,email,phone,status,mrr_cents,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Clients</h1>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-ink-300">{c.contact_name ?? "—"}<div className="text-xs text-ink-500">{c.email ?? c.phone ?? ""}</div></td>
                  <td className="px-3 py-2"><span className="badge bg-ink-800 text-ink-300">{c.status}</span></td>
                  <td className="px-3 py-2 text-right">{formatCents(c.mrr_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
