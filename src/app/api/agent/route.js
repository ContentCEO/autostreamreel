import Anthropic from "@anthropic-ai/sdk";
import { AGENT_PROMPTS, buildUserMessage } from "@/lib/agentPrompts";
import { AGENTS } from "@/lib/agents";
import { NextResponse } from "next/server";

// POST /api/agent
// Body: { agentId: string, values: Record<string, string> }
// Server-side proxy to Anthropic. Keeps ANTHROPIC_API_KEY off the client.
export async function POST(req) {
  const { agentId, values } = await req.json();
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: "unknown agent" }, { status: 400 });
  }
  const system = AGENT_PROMPTS[agent.id];
  if (!system) {
    return NextResponse.json({ error: "no prompt for that agent" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, { status: 500 });
  }

  const userMessage = buildUserMessage(agent, values);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return NextResponse.json({ output: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "agent call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
