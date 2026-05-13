import { createAdminClient } from "@/lib/supabase/admin";

export type PermissionKey =
  | "outbound.sms"
  | "outbound.call"
  | "outbound.email"
  | "ads.write"
  | "agents.autonomous"
  | "jarvis.actions";

const DEFAULTS: Record<PermissionKey, boolean> = {
  "outbound.sms":      false,
  "outbound.call":     false,
  "outbound.email":    false,
  "ads.write":         false,
  "agents.autonomous": false,
  "jarvis.actions":    true,
};

export async function isAllowed(key: PermissionKey): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("permissions")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    if (!data) return DEFAULTS[key];
    return Boolean(data.enabled);
  } catch {
    return DEFAULTS[key];
  }
}

export async function listPermissions() {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("permissions").select("key,enabled,updated_at");
    const map = new Map<string, { enabled: boolean; updated_at: string | null }>();
    for (const p of data ?? []) map.set(p.key, { enabled: p.enabled, updated_at: p.updated_at });
    return (Object.keys(DEFAULTS) as PermissionKey[]).map((key) => ({
      key,
      enabled: map.get(key)?.enabled ?? DEFAULTS[key],
      updated_at: map.get(key)?.updated_at ?? null,
    }));
  } catch {
    return (Object.keys(DEFAULTS) as PermissionKey[]).map((key) => ({
      key,
      enabled: DEFAULTS[key],
      updated_at: null,
    }));
  }
}

export async function setPermission(key: PermissionKey, enabled: boolean) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("permissions")
    .upsert({ key, enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}
