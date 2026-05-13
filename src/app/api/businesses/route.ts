import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/agents-seed";

// POST /api/businesses
// Creates a business and instantiates the full org chart under it (CEO ->
// managers -> assistant managers -> 48 ICs), wiring parent_agent_id pointers.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name, industry } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .insert({ name, industry: industry || null })
    .select("id,name")
    .single();
  if (bizErr || !biz) {
    return NextResponse.json({ error: bizErr?.message ?? "create failed" }, { status: 500 });
  }

  // Seed agents in two passes so parent_agent_id can resolve by role lookup.
  // Pass 1: insert every agent without parent.
  const rows = AGENT_TEMPLATES.map((t) => ({
    business_id:   biz.id,
    parent_agent_id: null,
    tier:          t.tier,
    department:    t.department,
    role:          t.role,
    name:          t.name,
    persona:       t.persona,
    instructions:  t.instructions,
    schedule_cron: t.schedule_cron ?? null,
    is_active:     true,
  }));
  const { data: inserted, error: insErr } = await admin
    .from("agents")
    .insert(rows)
    .select("id,role");
  if (insErr || !inserted) {
    return NextResponse.json({ error: insErr?.message ?? "seed failed" }, { status: 500 });
  }

  // Pass 2: set parent_agent_id from each template's reports_to_role.
  const byRole = new Map<string, string>();
  for (const a of inserted) byRole.set(a.role, a.id);

  const updates: { id: string; parent_agent_id: string | null }[] = [];
  for (const t of AGENT_TEMPLATES as AgentTemplate[]) {
    if (!t.reports_to_role) continue;
    const childId  = byRole.get(t.role);
    const parentId = byRole.get(t.reports_to_role);
    if (childId && parentId) updates.push({ id: childId, parent_agent_id: parentId });
  }
  if (updates.length > 0) {
    // upsert each; supabase-js doesn't have multi-row update by id in one call
    await Promise.all(
      updates.map((u) =>
        admin.from("agents").update({ parent_agent_id: u.parent_agent_id }).eq("id", u.id),
      ),
    );
  }

  return NextResponse.json({
    business: biz,
    agents_created: inserted.length,
  });
}
