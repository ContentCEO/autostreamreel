import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { createCampaign, type ProviderId } from "@/lib/ad-platforms";

// POST /api/ad-accounts/:id/campaign
// Body: { name, daily_budget_cents, objective, external_account_id }
// Creates a campaign on the connected ad account. PAUSED by default — owner
// flips ON inside the platform once they've reviewed.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("ad_accounts")
    .select("id,platform,oauth_token,external_id,business_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!acct || !acct.oauth_token) {
    return NextResponse.json({ error: "account not connected" }, { status: 400 });
  }

  const body = await req.json();
  const externalAccountId = body.external_account_id ?? acct.external_id ?? "";
  if (!externalAccountId) {
    return NextResponse.json({ error: "external_account_id required" }, { status: 400 });
  }

  const result = await createCampaign({
    platform:           acct.platform as ProviderId,
    accessToken:        acct.oauth_token,
    externalAccountId,
    name:               body.name ?? "New campaign",
    dailyBudgetCents:   Number(body.daily_budget_cents ?? 5000),
    objective:          body.objective ?? "OUTCOME_LEADS",
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  await admin.from("tasks").insert({
    business_id: acct.business_id,
    title:       `Created ${acct.platform} campaign: ${body.name ?? "New campaign"}`,
    status:      "done",
    priority:    2,
    completed_at: new Date().toISOString(),
    output:      { external_id: result.external_id, platform: acct.platform },
  });

  return NextResponse.json({ external_id: result.external_id });
}
