"use client";

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
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/cc/alerts",     label: "Alerts",     icon: AlertTriangle },
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
      { href: "/cc/tasks",      label: "Tasks",      icon: Workflow },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/cc/ad-accounts",label: "Ad accounts",icon: Megaphone },
      { href: "/cc/outbound",   label: "Outbound",   icon: PhoneOutgoing },
    ],
  },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-ink-800 bg-ink-900/40 flex flex-col">
      <div className="px-4 py-5 border-b border-ink-800">
        <div className="text-sm uppercase tracking-widest text-ink-400">Control Center</div>
        <div className="text-lg font-semibold mt-0.5 text-ink-50">Command</div>
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
                      {item.label}
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
