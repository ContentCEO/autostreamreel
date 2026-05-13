import { createClient as createSupabase } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS. Server-only.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role env not configured");
  }
  return createSupabase(url, key, { auth: { persistSession: false } });
}
