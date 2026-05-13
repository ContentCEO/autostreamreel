import Link from "next/link";
import { ChevronLeft, MessageSquare, PhoneOutgoing, Mail } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface MessageRow {
  id: string;
  channel: string;
  direction: string;
  body: string | null;
  created_at: string;
}
interface OutboundRow {
  id: string;
  channel: string;
  status: string;
  scheduled_at: string;
  script: string | null;
}

interface Props {
  title: string;
  backHref: string;
  backLabel: string;
  headerMeta: React.ReactNode;
  primary: React.ReactNode;       // edit + actions on the right column
  messages: MessageRow[];
  outbound: OutboundRow[];
}

export function ContactDetailLayout({
  title, backHref, backLabel, headerMeta, primary, messages, outbound,
}: Props) {
  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-xs text-ink-400 hover:text-ink-200 inline-flex items-center gap-1">
        <ChevronLeft size={12} /> {backLabel}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-1 text-sm text-ink-400">{headerMeta}</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section>
            <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Message history</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing yet — no inbound or outbound messages.</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className="card p-3">
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                        {channelIcon(m.channel)} {m.direction} · {m.channel}
                      </span>
                      <span>{relativeTime(m.created_at)}</span>
                    </div>
                    {m.body && <p className="text-sm text-ink-200 mt-1 whitespace-pre-wrap">{m.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2">Scheduled outbound</h2>
            {outbound.length === 0 ? (
              <p className="text-sm text-ink-500">No scheduled or sent outbound rows.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ink-900/60 text-ink-400 text-xs uppercase tracking-widest">
                    <tr>
                      <th className="px-3 py-2 text-left">Channel</th>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Script preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {outbound.map((o) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2 uppercase tracking-wide text-xs">{o.channel}</td>
                        <td className="px-3 py-2 text-ink-300">{relativeTime(o.scheduled_at)}</td>
                        <td className="px-3 py-2"><span className="badge bg-ink-800 text-ink-300">{o.status}</span></td>
                        <td className="px-3 py-2 text-ink-300 max-w-[20rem] truncate">{o.script ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">{primary}</aside>
      </div>
    </div>
  );
}

function channelIcon(channel: string) {
  if (channel === "sms")  return <MessageSquare size={10} />;
  if (channel === "call") return <PhoneOutgoing size={10} />;
  return <Mail size={10} />;
}
