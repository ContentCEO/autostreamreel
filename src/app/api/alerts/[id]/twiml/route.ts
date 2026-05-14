import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "@/lib/twilio";

// Public Twilio voice callback — Twilio dials this URL when a critical-alert
// call connects, and reads back the TwiML we return. No auth (Twilio dials
// it from their network and the alert text is short).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}

async function handle(id: string): Promise<Response> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("alerts")
    .select("title,body,severity")
    .eq("id", id)
    .maybeSingle();
  const script = data
    ? `Critical alert from your Control Center. ${data.title}. ${data.body ?? ""}. Open the app to acknowledge.`
    : "Critical alert from your Control Center. Please open the app.";
  return new Response(twiml(script), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
