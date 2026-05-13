import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { generateText } from "@/lib/ai";

// POST /api/agents/run
// Runs a single agent against an instruction. Logs the run as a completed
// task with the agent's text output captured in `output.text`.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { agent_id, instruction } = await req.json();
  if (!agent_id || !instruction) {
    return NextResponse.json({ error: "agent_id and instruction are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: agent, error } = await admin
    .from("agents")
    .select("id,name,role,instructions,business_id")
    .eq("id", agent_id)
    .single();
  if (error || !agent) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }

  const text = await generateText({
    system: agent.instructions ?? `You are ${agent.name}, a ${agent.role}.`,
    user:   instruction,
    maxTokens: 800,
  });

  await admin.from("tasks").insert({
    business_id: agent.business_id,
    agent_id:    agent.id,
    title:       instruction.slice(0, 100),
    status:      "done",
    priority:    3,
    completed_at: new Date().toISOString(),
    output:      { text },
  });

  return NextResponse.json({ agent: agent.name, output: text });
}
