import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("id,name,email,phone,ltv_cents,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No customers yet.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-ink-500">{c.email ?? c.phone ?? "—"}</div>
              <div className="text-xs text-ink-400 mt-2">LTV: {formatCents(c.ltv_cents)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
