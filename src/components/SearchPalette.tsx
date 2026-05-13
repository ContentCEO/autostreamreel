"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Briefcase, Users, Target, Sparkles, Building2 } from "lucide-react";

interface Hit {
  kind: "client" | "customer" | "lead" | "agent" | "business";
  id:   string;
  title: string;
  subtitle: string | null;
  href: string;
}

// Global Cmd-K (Ctrl+K) search palette. Searches clients / customers / leads
// / agents / businesses, deduplicated by kind+id. Arrow keys to navigate,
// Enter to open, Esc to close.
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(""); setHits([]); setCursor(0); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 1) { setHits([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (!cancelled) { setHits(j.hits ?? []); setCursor(0); }
      } catch { /* ignore */ }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  function go(h: Hit) {
    setOpen(false);
    router.push(h.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, Math.max(hits.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hits[cursor]) go(hits[cursor]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-ink-950/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-800">
          <Search size={14} className="text-ink-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search clients, leads, customers, agents, businesses…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-500"
          />
          <span className="text-xs text-ink-500 border border-ink-700 rounded px-1.5 py-0.5">esc</span>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {hits.length === 0 ? (
            <li className="px-3 py-4 text-sm text-ink-500">{q ? "No matches." : "Type to search."}</li>
          ) : hits.map((h, i) => (
            <li key={`${h.kind}:${h.id}`}>
              <button
                onClick={() => go(h)}
                onMouseEnter={() => setCursor(i)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm ${i === cursor ? "bg-ink-800/60" : "hover:bg-ink-800/40"}`}
              >
                {kindIcon(h.kind)}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{h.title}</div>
                  {h.subtitle && <div className="text-xs text-ink-500 truncate">{h.subtitle}</div>}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-ink-500">{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function kindIcon(kind: Hit["kind"]) {
  if (kind === "client")   return <Briefcase size={14} className="text-ink-400" />;
  if (kind === "customer") return <Users     size={14} className="text-ink-400" />;
  if (kind === "lead")     return <Target    size={14} className="text-ink-400" />;
  if (kind === "agent")    return <Sparkles  size={14} className="text-ink-400" />;
  return <Building2 size={14} className="text-ink-400" />;
}
