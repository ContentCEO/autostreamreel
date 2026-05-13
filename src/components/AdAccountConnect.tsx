"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

interface Business { id: string; name: string }

export function AdAccountConnect({
  platforms, businesses,
}: {
  platforms: { id: string; label: string }[];
  businesses: Business[];
}) {
  const [biz, setBiz] = useState(businesses[0]?.id ?? "");

  return (
    <div className="card p-4 space-y-3">
      <div className="text-sm font-medium">Connect a platform</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select className="input" value={biz} onChange={(e) => setBiz(e.target.value)}>
          {businesses.length === 0 && <option value="">Create a business first</option>}
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {platforms.map((p) => (
            <a
              key={p.id}
              href={biz ? `/api/ad-accounts/${p.id}/start?business_id=${biz}` : "#"}
              aria-disabled={!biz}
              className={`btn-ghost inline-flex items-center gap-1 ${!biz ? "opacity-40 pointer-events-none" : ""}`}
            >
              <Link2 size={12} /> {p.label}
            </a>
          ))}
        </div>
      </div>
      <div className="text-xs text-ink-500">
        OAuth redirects back here and stores the token. Writes only happen when the <code>ads.write</code> kill switch is on.
      </div>
    </div>
  );
}
