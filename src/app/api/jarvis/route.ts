import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { getAnthropic, FAST_MODEL } from "@/lib/ai";
import { JARVIS_TOOLS, runJarvisTool } from "@/lib/jarvis-tools";

type ChatMsg = { role: "user" | "assistant"; content: unknown };

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };

  const anthropic = getAnthropic();
  const admin = createAdminClient();

  const system =
    "You are Jarvis, the operating brain of the owner's personal Control Center. " +
    "You see only the owner's data across every business they run. " +
    "VOICE MODE: every reply is spoken aloud. Keep it to 1-3 short sentences. " +
    "Be direct, conversational, and quick — like a person, not a chatbot. " +
    "Use tools only when the owner clearly needs a lookup or an action. " +
    "Never invent numbers; if you don't have data, say so in one sentence and stop.";

  // Persist the user's last turn for history.
  const lastUser = messages.filter((m) => m.role === "user").pop();
  if (lastUser) {
    await admin.from("jarvis_messages").insert({ role: "user", content: lastUser.content });
  }

  let convo: ChatMsg[] = messages.map((m) => ({ role: m.role, content: m.content }));

  // Hard cap on the tool-use loop. Two iterations is enough for "look one
  // thing up, then answer" — anything more is the wrong instinct for a fast
  // voice reply and we'd rather just answer.
  for (let i = 0; i < 2; i++) {
    const res = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 300,
      system,
      tools: JARVIS_TOOLS as unknown as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages: convo as unknown as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    if (res.stop_reason !== "tool_use") {
      const text = res.content.find((b) => b.type === "text");
      const reply = text && text.type === "text" ? text.text : "";
      await admin.from("jarvis_messages").insert({ role: "assistant", content: reply });
      return NextResponse.json({ reply });
    }

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    const toolResults: unknown[] = [];
    for (const tu of toolUses) {
      const t = tu as { id: string; name: string; input: Record<string, unknown> };
      const result = await runJarvisTool(t.name, t.input, admin);
      toolResults.push({
        type: "tool_result",
        tool_use_id: t.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
      });
    }
    convo = [
      ...convo,
      { role: "assistant", content: res.content as unknown as ChatMsg["content"] },
      { role: "user",      content: toolResults },
    ];
  }

  return NextResponse.json({ reply: "I'm still working on that — give me a second." });
}
