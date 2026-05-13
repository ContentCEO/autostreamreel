import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { TaskRowActions } from "@/components/TaskRowActions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,details,status,priority,due_at,agent_id,created_at")
    .order("priority")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No tasks. Ask Jarvis to assign something to an agent.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((t) => (
            <li key={t.id} className="card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.title}</div>
                {t.details && <div className="text-xs text-ink-500 truncate">{t.details}</div>}
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="badge bg-ink-800 text-ink-300">P{t.priority}</span>
                <span className="badge bg-ink-800 text-ink-300">{t.status}</span>
                {t.due_at && <span className="text-ink-500">{relativeTime(t.due_at)}</span>}
                <TaskRowActions id={t.id} status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
