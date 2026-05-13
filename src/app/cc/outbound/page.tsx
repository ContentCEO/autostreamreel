import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { OutboundControls } from "@/components/OutboundControls";
import { PermissionToggles } from "@/components/PermissionToggles";
import { listPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function OutboundPage() {
  const supabase = createClient();
  const [{ data: scheduled }, { data: log }, { data: businesses }, permissions] = await Promise.all([
    supabase
      .from("outbound_schedule")
      .select("id,channel,target_kind,scheduled_at,status,script,agent_id")
      .order("scheduled_at"),
    supabase
      .from("message_log")
      .select("id,channel,direction,body,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("businesses").select("id,name").order("created_at"),
    listPermissions(),
  ]);

  const outboundPerms = permissions.filter((p) => p.key.startsWith("outbound."));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Outbound</h1>
        <p className="text-sm text-ink-400">
          The autonomous call/text squad. Every outbound row records who and when.
          Scripts are AI-drafted and you can override before they go.
        </p>
      </header>

      <OutboundControls businesses={businesses ?? []} />
      <PermissionToggles initial={outboundPerms} />

      <section>
        <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Scheduled</h2>
        {!scheduled?.length ? (
          <p className="text-sm text-ink-400">Nothing scheduled.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900/60 text-ink-400 text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2 text-left">Channel</th>
                  <th className="px-3 py-2 text-left">Target</th>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {scheduled.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 uppercase tracking-wide text-xs">{s.channel}</td>
                    <td className="px-3 py-2 text-ink-300">{s.target_kind}</td>
                    <td className="px-3 py-2 text-ink-300">{relativeTime(s.scheduled_at)}</td>
                    <td className="px-3 py-2"><span className="badge bg-ink-800 text-ink-300">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Recent activity</h2>
        {!log?.length ? (
          <p className="text-sm text-ink-400">No messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {log.map((m) => (
              <li key={m.id} className="card p-3">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span className="uppercase tracking-wide">{m.direction} · {m.channel}</span>
                  <span>{relativeTime(m.created_at)}</span>
                </div>
                {m.body && <p className="text-sm text-ink-200 mt-1 whitespace-pre-wrap">{m.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
