import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { AlertRowActions } from "@/components/AlertRowActions";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("alerts")
    .select("id,title,body,severity,resolved_at,created_at")
    .order("resolved_at", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <p className="text-sm text-ink-400">Anything going wrong across your businesses bubbles here.</p>
      {!data?.length ? (
        <p className="text-ink-400 text-sm">Nothing&apos;s broken. Enjoy your day.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((a) => (
            <li key={a.id} className="card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{a.title}</div>
                  {a.body && <div className="text-xs text-ink-400 whitespace-pre-wrap">{a.body}</div>}
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className={a.severity === "critical" ? "badge bg-danger-500/20 text-danger-500" : a.severity === "warn" ? "badge bg-warn-500/20 text-warn-500" : "badge bg-ink-700 text-ink-300"}>{a.severity}</span>
                  <span className="text-ink-500">{relativeTime(a.created_at)}</span>
                  <AlertRowActions id={a.id} resolved={Boolean(a.resolved_at)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
