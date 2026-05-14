import Anthropic from "@anthropic-ai/sdk";

// Control Center brain. Default to Claude Sonnet 4.6 — balanced for chat +
// tool-use. Override with ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// Faster model for the Jarvis voice loop. Haiku responds noticeably quicker,
// which matters more than depth when you're literally waiting for the next
// sentence to be spoken aloud. Override with ANTHROPIC_FAST_MODEL.
export const FAST_MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function generateText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 800,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export function getAnthropic() {
  return getClient();
}

export function getModel() {
  return MODEL;
}
