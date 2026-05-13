import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { generateText } from "@/lib/ai";

// POST /api/outbound/draft
// Body: { target_kind, target_id, channel, note? }
// Returns: { script } — does NOT schedule or send. Used by the detail page
// to preview a check-in script before the owner commits to sending it.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json() as {
    target_kind: "client" | "customer" | "lead";
    target_id:   string;
    channel:     "sms" | "call" | "email";
    note?:       string;
  };

  const admin = createAdminClient();
  const table = body.target_kind === "client" ? "clients"
              : body.target_kind === "customer" ? "customers" : "leads";
  const { data: target } = await admin.from(table)
    .select("name,business_id")
    .eq("id", body.target_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "target not found" }, { status: 404 });

  const { data: biz } = target.business_id
    ? await admin.from("businesses").select("name").eq("id", target.business_id).maybeSingle()
    : { data: null as { name: string } | null };

  const audience = body.channel === "sms"
    ? `Send a 1-2 sentence friendly check-in text to ${target.name}. No links. End with an open question.`
    : body.channel === "call"
      ? `Open a friendly check-in call with ${target.name}. Two sentences max, then an open question. This is a phone script — say it out loud.`
      : `Write a warm 80-word check-in email to ${target.name}. Subject line will be set separately; just give the body. End with one open question.`;

  const script = await generateText({
    system: `You are a ${body.target_kind === "lead" ? "sales rep" : "CS rep"} on the team for ${biz?.name ?? "the business"}. Keep it human, specific, and never pushy.${body.note ? `\nAdditional context from the owner: ${body.note}` : ""}`,
    user:   audience,
    maxTokens: 250,
  });
  return NextResponse.json({ script });
}
