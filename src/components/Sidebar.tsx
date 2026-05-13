"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PhoneOutgoing,
  Search,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface LiveCounts {
  open_alerts: number;
  active_tasks: number;
  scheduled_outbound_next_24h: number;
}

type CountKey = "open_alerts" | "active_tasks" | "scheduled_outbound_next_24h";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  countKey?: CountKey;
  dotKey?: CountKey;   // shows a red dot when > 0 instead of a number
}
interface NavSection {
  label: string | null;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/cc",            label: "Dashboard",  icon: LayoutDashboard },
      { href: "/cc/alerts",     label: "Alerts",     icon: AlertTriangle, countKey: "open_alerts" },
    ],
  },
  {
    label: "Businesses",
    items: [
      { href: "/cc/businesses", label: "Businesses", icon: Building2 },
      { href: "/cc/meetings",   label: "Meetings",   icon: Calendar },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/cc/leads",      label: "Leads",      icon: Target },
      { href: "/cc/clients",    label: "Clients",    icon: Briefcase },
      { href: "/cc/customers",  label: "Customers",  icon: Users },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/cc/agents",     label: "Agents",     icon: Sparkles },
      { href: "/cc/tasks",      label: "Tasks",      icon: Workflow, countKey: "active_tasks" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/cc/ad-accounts",label: "Ad accounts",icon: Megaphone },
      { href: "/cc/outbound",   label: "Outbound",   icon: PhoneOutgoing, countKey: "scheduled_outbound_next_24h" },
    ],
  },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<LiveCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/status");
        if (!r.ok) return;
        const j = (await r.json()) as LiveCounts;
        if (!cancelled) setCounts(j);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <aside className="w-60 shrink-0 border-r border-ink-800 bg-ink-900/40 flex flex-col">
      <div className="px-4 py-5 border-b border-ink-800">
        <div className="text-sm uppercase tracking-widest text-ink-400">Control Center</div>
        <div className="text-lg font-semibold mt-0.5 text-ink-50">Command</div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="mt-3 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-ink-800 text-xs text-ink-400 hover:text-ink-200 hover:border-ink-700"
        >
          <Search size={12} /> Search
          <span className="ml-auto text-[10px] text-ink-500 border border-ink-800 rounded px-1">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {SECTIONS.map((s, i) => (
          <div key={i}>
            {s.label && (
              <div className="px-3 mb-1 text-[10px] uppercase tracking-widest text-ink-500">
                {s.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {s.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const count = item.countKey && counts ? counts[item.countKey] : undefined;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        active
                          ? "bg-ink-800 text-ink-50"
                          : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-100",
                      )}
                    >
                      <Icon size={16} className={active ? "text-accent-400" : "text-ink-400"} />
                      <span className="flex-1">{item.label}</span>
                      {typeof count === "number" && count > 0 && (
                        <span className={cn(
                          "text-[10px] tabular-nums rounded-full px-1.5 py-0.5",
                          item.countKey === "open_alerts"
                            ? "bg-danger-500/20 text-danger-400"
                            : "bg-ink-800 text-ink-300",
                        )}>
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3 text-xs text-ink-400">
        <div className="truncate mb-2">{email}</div>
        <form action="/auth/signout" method="post">
          <button className="flex items-center gap-2 hover:text-ink-200">
            <LogOut size={14} /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
