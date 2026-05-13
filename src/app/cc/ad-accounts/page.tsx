import { createClient } from "@/lib/supabase/server";
import { AdAccountConnect } from "@/components/AdAccountConnect";
import { PermissionToggles } from "@/components/PermissionToggles";
import { listPermissions } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLATFORMS: { id: string; label: string; note: string }[] = [
  { id: "google_ads", label: "Google Ads",  note: "Search + Performance Max" },
  { id: "meta",       label: "Meta Ads",    note: "Facebook + Instagram (Business)" },
  { id: "facebook",   label: "Facebook",    note: "Page + Organic" },
  { id: "instagram",  label: "Instagram",   note: "Page + Organic" },
  { id: "tiktok",     label: "TikTok Ads",  note: "TikTok for Business" },
  { id: "linkedin",   label: "LinkedIn Ads",note: "LinkedIn Campaign Manager" },
];

export default async function AdAccountsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const supabase = createClient();
  const [{ data: accounts }, { data: businesses }, permissions] = await Promise.all([
    supabase
      .from("ad_accounts")
      .select("id,platform,account_label,status,last_synced_at,business_id"),
    supabase.from("businesses").select("id,name").order("created_at"),
    listPermissions(),
  ]);

  const adPerms = permissions.filter((p) => p.key === "ads.write");

  const byPlatform = new Map<string, typeof accounts>();
  for (const a of accounts ?? []) {
    if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, []);
    byPlatform.get(a.platform)!.push(a);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ad accounts</h1>
        <p className="text-sm text-ink-400">Connect each platform per business. Writes are gated by the kill switch below.</p>
      </div>

      {searchParams.connected && (
        <div className="card p-3 text-sm border-success-500/30 bg-success-500/10 text-success-300">
          Connected {searchParams.connected}.
        </div>
      )}
      {searchParams.error && (
        <div className="card p-3 text-sm border-danger-500/30 bg-danger-500/10 text-danger-300">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <AdAccountConnect platforms={PLATFORMS} businesses={businesses ?? []} />
      <PermissionToggles initial={adPerms} />

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
                    <li key={a!.id} className="flex items-center justify-between">
                      <span className="text-ink-300">{a!.account_label}</span>
                      <span className="text-xs text-ink-500">{relativeTime(a!.last_synced_at)}</span>
                    </li>
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
