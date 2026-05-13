import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { runAutonomousTick } from "@/lib/agent-tick";

// POST /api/dispatch/tick
// Body: { force?: boolean, limit?: number, business_id?: string }
// Run the autonomous agent loop one tick. Suitable for a Vercel cron with
// x-cron-secret, or a manual "run now" button.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cron = req.headers.get("x-cron-secret");
  const cronOk = cron && cron === process.env.CRON_SECRET;
  if (!cronOk && (!user || !isOwnerEmail(user.email))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    force?: boolean; limit?: number; business_id?: string;
  };

  const admin = createAdminClient();
  const result = await runAutonomousTick(admin, body);
  return NextResponse.json(result);
}
