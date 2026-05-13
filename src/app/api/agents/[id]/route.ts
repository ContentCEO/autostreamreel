import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

// PATCH /api/agents/:id
// Body fields (any of): name, persona, instructions, schedule_cron, is_active
const ALLOWED = ["name", "persona", "instructions", "schedule_cron", "is_active"] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (body[k] === undefined) continue;
    if (k === "is_active") {
      patch[k] = body[k] === true || body[k] === "true";
    } else {
      patch[k] = body[k] === "" ? null : body[k];
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no allowed fields" }, { status: 400 });
  }
  const { error } = await supabase.from("agents").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
