import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewBusinessForm } from "@/components/NewBusinessForm";

export const dynamic = "force-dynamic";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const supabase = createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id,name,industry,website,created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Businesses</h1>
      </header>

      <NewBusinessForm defaultOpen={searchParams.new === "1"} />

      {!businesses?.length ? (
        <p className="text-ink-400 text-sm">No businesses yet. Add one above — that will instantiate the full org chart for it.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {businesses.map((b) => (
            <li key={b.id} className="card p-4 flex items-center justify-between gap-3">
              <Link href={`/cc/businesses/${b.id}`} className="min-w-0 flex-1 hover:text-accent-400">
                <div className="font-medium truncate">{b.name}</div>
                <div className="text-xs text-ink-500">{b.industry ?? "—"}</div>
              </Link>
              <Link href={`/cc/agents?business_id=${b.id}`} className="text-sm text-ink-400 hover:text-ink-200">Team →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
