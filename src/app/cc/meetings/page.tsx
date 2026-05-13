import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("meetings")
    .select("id,title,with_name,starts_at,ends_at,location,agenda")
    .order("starts_at");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Meetings</h1>
      <p className="text-sm text-ink-400">When a meeting starts, the desktop app focuses and Jarvis prepares notes.</p>
      {!data?.length ? (
        <p className="text-ink-400 text-sm">No meetings scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-ink-500">{m.with_name ?? "—"}{m.location ? ` · ${m.location}` : ""}</div>
                </div>
                <div className="text-xs text-ink-400">{new Date(m.starts_at).toLocaleString()}</div>
              </div>
              {m.agenda && <p className="text-sm text-ink-300 mt-2 whitespace-pre-wrap">{m.agenda}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
