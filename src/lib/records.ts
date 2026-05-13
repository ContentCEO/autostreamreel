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

// Updates allow the same columns as inserts.
const UPDATE_COLUMNS = INSERT_COLUMNS;

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

export function pickUpdate(kind: Kind, raw: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of UPDATE_COLUMNS[kind]) {
    if (raw[col] !== undefined) row[col] = raw[col] === "" ? null : raw[col];
  }
  return row;
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

export async function updateRecord(
  supabase: SupabaseClient,
  kind: Kind,
  id: string,
  raw: Record<string, unknown>,
): Promise<{ ok: true } | { error: string }> {
  const row = pickUpdate(kind, raw);
  if (Object.keys(row).length === 0) return { error: "no allowed fields to update" };
  const { error } = await supabase.from(kind).update(row).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteRecord(
  supabase: SupabaseClient,
  kind: Kind,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
