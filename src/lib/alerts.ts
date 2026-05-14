import type { SupabaseClient } from "@supabase/supabase-js";
import { isTwilioConfigured, getOwnerPhone, placeCall } from "@/lib/twilio";

export type Severity = "info" | "warn" | "critical";

interface AlertInput {
  title: string;
  body?: string | null;
  severity?: Severity;
  business_id?: string | null;
  agent_id?: string | null;
  context?: Record<string, unknown> | null;
}

// Insert an alert and, if it's critical and Twilio + OWNER_PHONE are
// configured, kick off a phone call to the owner that reads the alert
// aloud. Fire-and-forget: never blocks the caller on Twilio failures.
export async function createAlert(
  admin: SupabaseClient,
  input: AlertInput,
  origin?: string,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await admin.from("alerts").insert({
    title:       input.title,
    body:        input.body ?? null,
    severity:    input.severity ?? "info",
    business_id: input.business_id ?? null,
    agent_id:    input.agent_id ?? null,
    context:     input.context ?? null,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "insert failed" };

  if ((input.severity ?? "info") === "critical") {
    const phone = getOwnerPhone();
    if (isTwilioConfigured() && phone) {
      const o = origin ?? process.env.PUBLIC_APP_ORIGIN ?? "";
      if (o) {
        const twimlUrl = `${o.replace(/\/$/, "")}/api/alerts/${data.id}/twiml`;
        // Fire-and-forget, log on failure but don't block the alert insert.
        placeCall({ to: phone, twimlUrl }).then((r) => {
          if (!r.ok) console.warn("[alerts] auto-call failed:", r.error);
        }).catch((e) => console.warn("[alerts] auto-call error:", e));
      }
    }
  }

  return { id: data.id };
}
