import { createAdminClient } from "@/lib/supabase/admin";

// Twilio inbound SMS webhook — logs replies and surfaces an alert so the
// owner sees them inside the Control Center.
export async function POST(req: Request) {
  const form = await req.formData();
  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "");
  const sid  = String(form.get("MessageSid") ?? "");

  const admin = createAdminClient();

  // Try to attribute to a known contact by phone.
  const [{ data: client }, { data: customer }, { data: lead }] = await Promise.all([
    admin.from("clients").select("id,business_id,name").eq("phone", from).maybeSingle(),
    admin.from("customers").select("id,business_id,name").eq("phone", from).maybeSingle(),
    admin.from("leads").select("id,business_id,name").eq("phone", from).maybeSingle(),
  ]);
  const hit = client
    ? { kind: "client" as const, ...client }
    : customer
      ? { kind: "customer" as const, ...customer }
      : lead
        ? { kind: "lead" as const, ...lead }
        : null;

  await admin.from("message_log").insert({
    business_id: hit?.business_id ?? null,
    target_kind: hit?.kind ?? null,
    target_id:   hit?.id ?? null,
    channel:     "sms",
    direction:   "inbound",
    body,
    external_id: sid,
  });

  if (hit) {
    await admin.from("alerts").insert({
      business_id: hit.business_id,
      severity: "info",
      title: `Reply from ${hit.name}`,
      body,
      context: { kind: hit.kind, id: hit.id, from },
    });
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml; charset=utf-8" } },
  );
}
