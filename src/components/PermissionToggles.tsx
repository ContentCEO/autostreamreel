"use client";

import { useState, useTransition } from "react";

interface PermissionRow { key: string; enabled: boolean }

const LABEL: Record<string, string> = {
  "outbound.sms":      "Outbound SMS",
  "outbound.call":     "Outbound calls",
  "outbound.email":    "Outbound email",
  "ads.write":         "Ad-platform writes",
  "agents.autonomous": "48-agent autonomous tick",
  "jarvis.actions":    "Jarvis write actions",
};

export function PermissionToggles({ initial }: { initial: PermissionRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(key: string, next: boolean) {
    setRows((r) => r.map((p) => p.key === key ? { ...p, enabled: next } : p));
    start(async () => {
      await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: next }),
      });
    });
  }

  return (
    <div className="card p-4">
      <div className="text-sm font-medium mb-2">Kill switches</div>
      <div className="text-xs text-ink-500 mb-3">
        Master controls — everything stays off until you flip it on. Real money / real messages only fire under these switches.
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rows.map((p) => (
          <li key={p.key} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-ink-800/40">
            <span className="text-sm">{LABEL[p.key] ?? p.key}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={p.enabled}
                disabled={pending}
                onChange={(e) => toggle(p.key, e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-ink-700 rounded-full peer-checked:bg-accent-500 relative transition before:absolute before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:w-4 before:h-4 before:transition peer-checked:before:left-[18px]" />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
