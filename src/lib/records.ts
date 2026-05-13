// Shared insert/update helpers for the four main entity tables. Keeps the API
// routes tiny and consistent and centralizes the column whitelist so we never
// accidentally accept fields off the request body.

import type { SupabaseClient } from "@supabase/supabase-js";

type Kind = "clients" | "customers" | "leads" | "meetings";

const INSERT_COLUMNS: Record<Kind, string[]> = {
  clients:   ["business_id", "name", "contact_name", "email", "phone", "status", "mrr_cents", "notes"],
  customers: ["business_id", "client_id", "name", "email", "phone", "ltv_cents", "notes"],
  leads:     ["business_id", "name", "email", "phone", "source", "status", "est_value_cents", "ai_score", "notes"],
  meetings:  ["business_id", "title", "with_name", "starts_at", "ends_at", "location", "agenda", "notes"],
};

const REQUIRED: Record<Kind, string[]> = {
  clients:   ["name"],
  customers: ["name"],
  leads:     ["name"],
  meetings:  ["title", "starts_at"],
};

export function pickInsert(kind: Kind, raw: Record<string, unknown>): {
  ok: true; row: Record<string, unknown>;
} | {
  ok: false; error: string;
} {
  for (const r of REQUIRED[kind]) {
    if (!raw[r]) return { ok: false, error: `${r} is required` };
  }
  const row: Record<string, unknown> = {};
  for (const col of INSERT_COLUMNS[kind]) {
    if (raw[col] !== undefined && raw[col] !== "") row[col] = raw[col];
  }
  return { ok: true, row };
}

export async function insertRecord(
  supabase: SupabaseClient,
  kind: Kind,
  raw: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  const picked = pickInsert(kind, raw);
  if (!picked.ok) return { error: picked.error };
  const { data, error } = await supabase.from(kind).insert(picked.row).select("id").single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}
