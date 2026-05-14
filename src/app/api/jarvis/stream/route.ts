import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { getAnthropic, FAST_MODEL } from "@/lib/ai";

// POST /api/jarvis/stream
// Body: { text: string }
// Streams Claude's response back as a text/event-stream of token chunks.
// The client splits on sentence boundaries and pipes each completed
// sentence into TTS, so first-audio latency drops from "wait for the
// whole reply" to "wait for one sentence".
//
// No tool-use here — this is the fast voice path. Tool-using questions
// still go through /api/jarvis (with Haiku, max 2 iterations).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const system =
    "You are Jarvis. VOICE MODE: every reply is spoken aloud. " +
    "1-3 short sentences, conversational, like a person not a chatbot. " +
    "Be direct and quick. Never invent numbers; if you don't know, say so in one sentence and stop.";

  const anthropic = getAnthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };
      try {
        const upstream = await anthropic.messages.stream({
          model: FAST_MODEL,
          max_tokens: 300,
          system,
          messages: [{ role: "user", content: text }],
        });
        for await (const event of upstream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(JSON.stringify({ type: "text", text: event.delta.text }));
          } else if (event.type === "message_stop") {
            send(JSON.stringify({ type: "done" }));
          }
        }
      } catch (e) {
        send(JSON.stringify({ type: "error", error: e instanceof Error ? e.message : "stream failed" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
