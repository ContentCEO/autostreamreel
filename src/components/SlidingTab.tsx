"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { BootBackground } from "@/components/BootBackground";

// Wraps the layout's children. When the user is at the /cc root the panel
// stays hidden and the orb is the entire viewport. On any other /cc/* route
// the panel slides up over the orb (orb shrinks + dims behind it). A small
// chevron at the top of the panel returns to /cc.
export function SlidingTab({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/cc";
  // Cache the last non-home children so we can keep them in the DOM as the
  // panel slides out (no flash of empty content during the transition).
  const [renderedChildren, setRenderedChildren] = useState<React.ReactNode>(children);
  useEffect(() => {
    if (!isHome) setRenderedChildren(children);
  }, [children, isHome]);

  return (
    <>
      <BootBackground dimmed={!isHome} />
      <div
        className={`fixed left-60 right-96 bottom-0 z-10 transition-all duration-500 ease-out
          ${isHome ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
        `}
        style={{ top: "32vh" }}
        aria-hidden={isHome}
      >
        <div className="h-full bg-ink-950/85 backdrop-blur-md border-t border-x border-ink-800 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-2 flex justify-center border-b border-ink-800">
            <Link
              href="/cc"
              className="inline-flex items-center gap-1 text-[10px] tracking-[0.32em] uppercase text-ink-500 hover:text-ink-300"
              aria-label="Back to home"
            >
              <ChevronDown size={12} /> dismiss
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderedChildren}
          </div>
        </div>
      </div>
    </>
  );
}
