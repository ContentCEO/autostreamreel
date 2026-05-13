import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { runAutonomousTick } from "@/lib/agent-tick";

// POST /api/dispatch/tick  — manual "run now" from the UI.
// GET  /api/dispatch/tick  — Vercel cron entry point (Authorization: Bearer <CRON_SECRET>).
async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isOwnerEmail(user.email));
}

export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    force?: boolean; limit?: number; business_id?: string;
  };
  const admin = createAdminClient();
  return NextResponse.json(await runAutonomousTick(admin, body));
}

export async function GET(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  return NextResponse.json(await runAutonomousTick(admin, { limit: 30 }));
}
