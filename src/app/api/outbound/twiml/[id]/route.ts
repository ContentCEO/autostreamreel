import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "@/lib/twilio";

// Twilio voice callback. Public endpoint — no auth, Twilio dials it.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}

async function handle(id: string): Promise<Response> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("outbound_schedule")
    .select("script")
    .eq("id", id)
    .maybeSingle();
  const script = data?.script ?? "Hi — this is your team checking in. We will follow up shortly.";
  return new Response(twiml(script), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
