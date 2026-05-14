"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

// Wraps the layout's children. When the user is at the /cc root the panel
// stays hidden and the orb is the entire viewport. On any other /cc/* route
// the panel slides up from the bottom over the dimmed orb. A small "dismiss"
// chevron at the top returns to /cc.
export function SlidingTab({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/cc";
  // Cache the last non-home children so the panel doesn't render empty
  // content during the slide-out transition.
  const [renderedChildren, setRenderedChildren] = useState<React.ReactNode>(children);
  useEffect(() => {
    if (!isHome) setRenderedChildren(children);
  }, [children, isHome]);

  return (
    <div
      className={`fixed left-60 right-0 bottom-0 transition-all duration-500 ease-out
        ${isHome ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
      `}
      style={{ top: "30vh", zIndex: 20 }}
      aria-hidden={isHome}
    >
      <div className="h-full bg-ink-950/85 backdrop-blur-md border-t border-x border-ink-800 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-2 flex justify-center border-b border-ink-800">
          <Link
            href="/cc"
            className="inline-flex items-center gap-1 text-[10px] tracking-[0.32em] uppercase text-ink-500 hover:text-ink-300"
          >
            <ChevronDown size={12} /> dismiss
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderedChildren}
        </div>
      </div>
    </div>
  );
}
