import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { isContractorFlowConfigured, getContractorFlowClient, syncLeadsFromContractorFlow } from "@/lib/contractorflow";

// POST /api/integrations/contractorflow/sync
// Body: { business_id?: string, limit?: number }
// Pulls leads from ContractorFlow's Supabase and mirrors new ones into CC.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Allow cron invocations.
  const cron = req.headers.get("authorization");
  const cronOk = cron && process.env.CRON_SECRET && cron === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && (!user || !isOwnerEmail(user.email))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isContractorFlowConfigured()) {
    return NextResponse.json({
      error: "ContractorFlow integration not configured. Set CONTRACTORFLOW_SUPABASE_URL and CONTRACTORFLOW_SUPABASE_SERVICE_ROLE_KEY.",
    }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { business_id?: string; limit?: number };
  const cf = getContractorFlowClient();
  const admin = createAdminClient();
  const result = await syncLeadsFromContractorFlow({
    cc: cf,
    controlCenterAdmin: admin,
    business_id: body.business_id ?? null,
    limit: body.limit,
  });

  return NextResponse.json(result);
}

// GET — quick status + config check
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    configured: isContractorFlowConfigured(),
    url:        process.env.CONTRACTORFLOW_SUPABASE_URL ? "set" : "missing",
    key:        process.env.CONTRACTORFLOW_SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
  });
}
