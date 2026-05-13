import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { status?: string; priority?: number; details?: string };
  const patch: Record<string, unknown> = {};
  if (body.status) {
    patch.status = body.status;
    if (body.status === "done") patch.completed_at = new Date().toISOString();
  }
  if (typeof body.priority === "number") patch.priority = body.priority;
  if (body.details) patch.details = body.details;

  const { error } = await supabase.from("tasks").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
