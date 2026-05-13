import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSMS, placeCall, isTwilioConfigured } from "@/lib/twilio";
import { sendEmail, isResendConfigured } from "@/lib/resend";
import { isAllowed } from "@/lib/permissions";
import { generateText } from "@/lib/ai";

export interface OutboundRow {
  id: string;
  business_id: string | null;
  agent_id: string | null;
  target_kind: "client" | "customer" | "lead";
  target_id: string;
  channel: "call" | "sms" | "email";
  script: string | null;
  scheduled_at: string;
  status: string;
}

// Look up the target's contact info from the right table.
async function lookupTarget(
  admin: SupabaseClient,
  kind: OutboundRow["target_kind"],
  id: string,
): Promise<{ name: string; email: string | null; phone: string | null } | null> {
  const table = kind === "client" ? "clients" : kind === "customer" ? "customers" : "leads";
  const { data } = await admin
    .from(table)
    .select("name,email,phone")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { name: data.name, email: data.email, phone: data.phone };
}

async function draftScript(args: {
  channel: OutboundRow["channel"];
  targetName: string;
  agentName: string | null;
  businessName: string | null;
}): Promise<string> {
  const persona = args.agentName
    ? `You are ${args.agentName}, on the team for ${args.businessName ?? "the business"}.`
    : "You are a Customer Success rep.";
  const audience =
    args.channel === "sms"
      ? `Send a 1-2 sentence friendly check-in text to ${args.targetName}. No links. End with an open question.`
      : args.channel === "call"
        ? `Open a friendly check-in call with ${args.targetName}. Two sentences max, then an open question. This is a phone script — say it out loud.`
        : `Write a warm 80-word check-in email to ${args.targetName}. Subject is set separately; just give the body. End with one open question.`;
  return await generateText({
    system: `${persona} Keep it human, specific, and never pushy.`,
    user:   audience,
    maxTokens: 250,
  });
}

export async function sendOutboundRow(
  admin: SupabaseClient,
  row: OutboundRow,
  publicOriginForTwiml?: string,
): Promise<{ ok: boolean; detail: string }> {
  // Permission gate.
  const permKey =
    row.channel === "sms"  ? "outbound.sms"
  : row.channel === "call" ? "outbound.call"
  : "outbound.email";
  if (!(await isAllowed(permKey))) {
    await admin.from("outbound_schedule").update({
      status: "failed",
      result: { error: `${permKey} disabled by owner` },
    }).eq("id", row.id);
    return { ok: false, detail: `${permKey} disabled` };
  }

  const target = await lookupTarget(admin, row.target_kind, row.target_id);
  if (!target) {
    await admin.from("outbound_schedule").update({
      status: "failed",
      result: { error: "target not found" },
    }).eq("id", row.id);
    return { ok: false, detail: "target not found" };
  }

  // Look up business + agent name for nicer drafted scripts.
  const [{ data: biz }, { data: ag }] = await Promise.all([
    row.business_id
      ? admin.from("businesses").select("name").eq("id", row.business_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    row.agent_id
      ? admin.from("agents").select("name").eq("id", row.agent_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  let script = row.script;
  if (!script) {
    script = await draftScript({
      channel: row.channel,
      targetName: target.name,
      agentName: ag?.name ?? null,
      businessName: biz?.name ?? null,
    });
  }

  // Dispatch.
  let result: { ok: boolean; detail: string };
  if (row.channel === "sms") {
    if (!target.phone)             result = { ok: false, detail: "no phone on target" };
    else if (!isTwilioConfigured()) result = { ok: false, detail: "twilio not configured" };
    else {
      const r = await sendSMS({ to: target.phone, body: script });
      result = r.ok ? { ok: true, detail: `sms ${r.sid}` } : { ok: false, detail: r.error };
    }
  } else if (row.channel === "call") {
    if (!target.phone)             result = { ok: false, detail: "no phone on target" };
    else if (!isTwilioConfigured()) result = { ok: false, detail: "twilio not configured" };
    else {
      const origin = publicOriginForTwiml ?? process.env.PUBLIC_APP_ORIGIN ?? "";
      if (!origin) result = { ok: false, detail: "PUBLIC_APP_ORIGIN required for calls" };
      else {
        const url = `${origin.replace(/\/$/, "")}/api/outbound/twiml/${row.id}`;
        const r = await placeCall({ to: target.phone, twimlUrl: url });
        result = r.ok ? { ok: true, detail: `call ${r.sid}` } : { ok: false, detail: r.error };
      }
    }
  } else {
    if (!target.email)             result = { ok: false, detail: "no email on target" };
    else if (!isResendConfigured()) result = { ok: false, detail: "resend not configured" };
    else {
      const r = await sendEmail({
        to: target.email,
        subject: `Quick check-in from ${biz?.name ?? "the team"}`,
        text: script,
      });
      result = r.ok ? { ok: true, detail: `email ${r.id}` } : { ok: false, detail: r.error };
    }
  }

  await admin.from("outbound_schedule").update({
    status: result.ok ? "sent" : "failed",
    script,
    result: { detail: result.detail },
  }).eq("id", row.id);

  await admin.from("message_log").insert({
    business_id: row.business_id,
    agent_id:    row.agent_id,
    target_kind: row.target_kind,
    target_id:   row.target_id,
    channel:     row.channel,
    direction:   "outbound",
    body:        script,
    external_id: result.ok ? result.detail : null,
  });

  return result;
}

// Schedule a daily/weekly check-in cadence for every client of a business.
export async function scheduleCheckIns(
  admin: SupabaseClient,
  args: {
    business_id: string;
    channel: "sms" | "email" | "call";
    starts_at?: string;     // ISO; default now+5m
    cadence_days?: number;  // default 7
    count?: number;         // default 4 occurrences per client
  },
): Promise<number> {
  const { data: clients } = await admin
    .from("clients")
    .select("id,name,email,phone")
    .eq("business_id", args.business_id)
    .eq("status", "active");

  const { data: csAgent } = await admin
    .from("agents")
    .select("id")
    .eq("business_id", args.business_id)
    .eq("role", "CS Caller")
    .maybeSingle();

  const cadenceDays = args.cadence_days ?? 7;
  const count       = args.count ?? 4;
  const start       = args.starts_at ? new Date(args.starts_at).getTime() : Date.now() + 5 * 60_000;

  const rows: Record<string, unknown>[] = [];
  for (const c of clients ?? []) {
    for (let i = 0; i < count; i++) {
      rows.push({
        business_id: args.business_id,
        agent_id:    csAgent?.id ?? null,
        target_kind: "client",
        target_id:   c.id,
        channel:     args.channel,
        script:      null,
        scheduled_at: new Date(start + i * cadenceDays * 86_400_000).toISOString(),
        status:      "scheduled",
      });
    }
  }
  if (!rows.length) return 0;
  const { error } = await admin.from("outbound_schedule").insert(rows);
  if (error) throw error;
  return rows.length;
}
