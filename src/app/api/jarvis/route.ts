import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { getAnthropic, getModel } from "@/lib/ai";

// Jarvis chat — Claude with tool-use over the Control Center data.
// Tools deliberately read-only here; write actions go through dedicated
// endpoints with explicit confirmation. (We can flip more tools to write
// when the owner says "go autonomous".)

const TOOLS = [
  {
    name: "list_businesses",
    description: "List the owner's businesses.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "count_pipeline",
    description: "Count leads grouped by status across all businesses.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "open_alerts",
    description: "Return unresolved alerts, newest first.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "active_tasks",
    description: "Return tasks that are pending or in_progress.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "upcoming_meetings",
    description: "Return the owner's upcoming meetings.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
];

type SB = ReturnType<typeof createClient>;
type ChatMsg = { role: "user" | "assistant"; content: unknown };

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };

  const anthropic = getAnthropic();
  const system =
    "You are Jarvis, the operating brain of the owner's personal Control Center. " +
    "You see only the owner's data across all of their businesses. Be concise, decisive, and proactive. " +
    "When the owner asks a question, use the available tools to look up real data before answering. " +
    "Surface anything unusual — overdue alerts, stalled deals, a meeting that needs prep. " +
    "Never invent numbers; if you don't have data, say so.";

  let convo: ChatMsg[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 4; i++) {
    const res = await anthropic.messages.create({
      model: getModel(),
      max_tokens: 1024,
      system,
      tools: TOOLS as any,
      messages: convo as any,
    });

    if (res.stop_reason !== "tool_use") {
      const text = res.content.find((b) => b.type === "text");
      return NextResponse.json({ reply: text && text.type === "text" ? text.text : "" });
    }

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    const toolResults: unknown[] = [];
    for (const tu of toolUses) {
      const t = tu as any;
      const result = await runTool(t.name, t.input as Record<string, unknown>, supabase);
      toolResults.push({
        type: "tool_result",
        tool_use_id: t.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
      });
    }
    convo = [
      ...convo,
      { role: "assistant", content: res.content as any },
      { role: "user",      content: toolResults },
    ];
  }

  return NextResponse.json({ reply: "I hit my tool-use limit. Want me to keep digging?" });
}

async function runTool(name: string, input: Record<string, unknown>, supabase: SB) {
  switch (name) {
    case "list_businesses": {
      const { data } = await supabase.from("businesses").select("id,name,industry");
      return data ?? [];
    }
    case "count_pipeline": {
      const { data } = await supabase.from("leads").select("status");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return counts;
    }
    case "open_alerts": {
      const limit = Number(input.limit ?? 10);
      const { data } = await supabase
        .from("alerts")
        .select("title,severity,created_at,business_id")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    }
    case "active_tasks": {
      const limit = Number(input.limit ?? 10);
      const { data } = await supabase
        .from("tasks")
        .select("title,status,priority,due_at,agent_id")
        .in("status", ["pending", "in_progress"])
        .order("priority")
        .limit(limit);
      return data ?? [];
    }
    case "upcoming_meetings": {
      const limit = Number(input.limit ?? 5);
      const { data } = await supabase
        .from("meetings")
        .select("title,with_name,starts_at,agenda")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(limit);
      return data ?? [];
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}
