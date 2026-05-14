import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Read-only client connected to the ContractorFlow Supabase project. Used to
// pull leads / customers / jobs into the Control Center. Both projects use
// Supabase + RLS, so the integration is just a second connection with a
// service-role key — no public API needed.

export function isContractorFlowConfigured(): boolean {
  return Boolean(
    process.env.CONTRACTORFLOW_SUPABASE_URL &&
    process.env.CONTRACTORFLOW_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getContractorFlowClient() {
  const url = process.env.CONTRACTORFLOW_SUPABASE_URL;
  const key = process.env.CONTRACTORFLOW_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ContractorFlow Supabase env not configured");
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

interface CFLead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  service_type?: string | null;
  estimated_value?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

// Pull leads from ContractorFlow and mirror them into Control Center's leads
// table. De-duplication is by (email, phone) — if a lead with the same email
// or phone already exists in CC, we skip it. Returns counts.
export async function syncLeadsFromContractorFlow(args: {
  cc: ReturnType<typeof getContractorFlowClient>;
  controlCenterAdmin: ReturnType<typeof getContractorFlowClient>;
  business_id?: string | null;
  limit?: number;
}): Promise<{ pulled: number; inserted: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  const { data: cfLeads, error } = await args.cc
    .from("leads")
    .select("id,name,email,phone,service_type,estimated_value,status,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(args.limit ?? 200);
  if (error) {
    errors.push(`pull failed: ${error.message}`);
    return { pulled: 0, inserted: 0, skipped: 0, errors };
  }

  let inserted = 0, skipped = 0;
  for (const lead of (cfLeads ?? []) as CFLead[]) {
    if (!lead.name) { skipped += 1; continue; }
    // Dedup by email or phone within the target business scope.
    let existsQ = args.controlCenterAdmin.from("leads").select("id");
    if (args.business_id) existsQ = existsQ.eq("business_id", args.business_id);
    if (lead.email) existsQ = existsQ.eq("email", lead.email);
    else if (lead.phone) existsQ = existsQ.eq("phone", lead.phone);
    else { /* no key to dedup on, rely on name+source */ existsQ = existsQ.eq("name", lead.name).eq("source", "ContractorFlow"); }
    const { data: existing } = await existsQ.maybeSingle();
    if (existing) { skipped += 1; continue; }

    const { error: insErr } = await args.controlCenterAdmin.from("leads").insert({
      business_id:     args.business_id ?? null,
      name:            lead.name,
      email:           lead.email ?? null,
      phone:           lead.phone ?? null,
      source:          "ContractorFlow" + (lead.service_type ? ` · ${lead.service_type}` : ""),
      status:          mapStatus(lead.status),
      est_value_cents: typeof lead.estimated_value === "number" ? Math.round(lead.estimated_value * 100) : null,
      notes:           lead.notes ?? null,
    });
    if (insErr) errors.push(`insert ${lead.name}: ${insErr.message}`);
    else inserted += 1;
  }

  return { pulled: (cfLeads ?? []).length, inserted, skipped, errors };
}

function mapStatus(cfStatus: string | null | undefined): "new" | "contacted" | "qualified" | "won" | "lost" {
  switch ((cfStatus ?? "").toLowerCase()) {
    case "new":
    case "open":
      return "new";
    case "contacted":
    case "in_progress":
      return "contacted";
    case "qualified":
    case "quoted":
      return "qualified";
    case "won":
    case "closed_won":
    case "converted":
      return "won";
    case "lost":
    case "closed_lost":
      return "lost";
    default:
      return "new";
  }
}
