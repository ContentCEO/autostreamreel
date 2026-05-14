import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { getAnthropic } from "@/lib/ai";

// POST /api/jarvis/computer
// Body: { messages: <Anthropic message list>, screen: { width, height } }
//
// Calls Claude with the computer-use beta tool. Returns the model's response
// (text + tool_use blocks). The client is responsible for executing the tool
// actions via Tauri commands and POSTing back with the screenshot result.
//
// Stateless: the client maintains the message history.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    messages: unknown[];
    screen?: { width: number; height: number };
    system?: string;
  };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const width  = body.screen?.width  ?? 1920;
  const height = body.screen?.height ?? 1080;

  const anthropic = getAnthropic();
  const res = await anthropic.beta.messages.create({
    model: "claude-sonnet-4-5",  // computer-use 20250124 lives on sonnet 4.5+
    max_tokens: 1024,
    betas: ["computer-use-2025-01-24"],
    system: body.system ?? "You are Jarvis, controlling the owner's desktop on their behalf. Use the computer tool to complete the task. After each action, take a fresh screenshot. Be careful and confirm progress.",
    tools: [
      {
        type: "computer_20250124",
        name: "computer",
        display_width_px:  width,
        display_height_px: height,
        display_number: 1,
      } as unknown as Parameters<typeof anthropic.beta.messages.create>[0]["tools"] extends (infer T)[] ? T : never,
    ],
    messages: body.messages as unknown as Parameters<typeof anthropic.beta.messages.create>[0]["messages"],
  });

  return NextResponse.json({
    stop_reason: res.stop_reason,
    content: res.content,
    id: res.id,
  });
}
