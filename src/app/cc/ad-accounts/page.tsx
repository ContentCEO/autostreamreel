import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLATFORMS: { id: string; label: string; note: string }[] = [
  { id: "google_ads", label: "Google Ads",  note: "Search + Performance Max" },
  { id: "meta",       label: "Meta Ads",    note: "Facebook + Instagram (Business)" },
  { id: "facebook",   label: "Facebook",    note: "Page + Organic" },
  { id: "instagram",  label: "Instagram",   note: "Page + Organic" },
  { id: "tiktok",     label: "TikTok Ads",  note: "TikTok for Business" },
  { id: "linkedin",   label: "LinkedIn Ads",note: "LinkedIn Campaign Manager" },
];

export default async function AdAccountsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("ad_accounts")
    .select("id,platform,account_label,status,last_synced_at,business_id");

  const byPlatform = new Map<string, typeof data>();
  for (const a of data ?? []) {
    if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, []);
    byPlatform.get(a.platform)!.push(a);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ad accounts</h1>
      <p className="text-sm text-ink-400">Connect each platform once per business. OAuth flows land in milestone 2.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PLATFORMS.map((p) => {
          const connected = byPlatform.get(p.id) ?? [];
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-ink-500">{p.note}</div>
                </div>
                <span className={connected.length ? "badge bg-success-500/20 text-success-500" : "badge bg-ink-800 text-ink-400"}>
                  {connected.length ? `${connected.length} connected` : "Not connected"}
                </span>
              </div>
              {connected.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {connected.map((a) => (
                    <li key={a!.id} className="text-ink-300">{a!.account_label}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
