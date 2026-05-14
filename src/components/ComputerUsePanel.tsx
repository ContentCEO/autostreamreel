"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Play, X, Loader2 } from "lucide-react";
import { isDesktop, desktop } from "@/lib/desktop";
import { speak } from "@/lib/speech";

// Anthropic Computer Use block shapes (loose typing — the API is in beta).
type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: unknown };
type Msg = { role: "user" | "assistant"; content: Block[] };

export function ComputerUsePanel({ onClose }: { onClose: () => void }) {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [available] = useState(isDesktop());
  const cancelRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  function append(line: string) { setLog((l) => [...l, line]); }

  async function executeAction(input: Record<string, unknown>): Promise<Block["type"] extends never ? never : { type: "image" | "text"; text?: string; source?: { type: "base64"; media_type: string; data: string } }[]> {
    const action = String(input.action ?? "");
    append(`▶ ${action}${input.text ? ` "${input.text}"` : ""}${input.coordinate ? ` ${JSON.stringify(input.coordinate)}` : ""}`);

    switch (action) {
      case "screenshot": {
        const s = await desktop.takeScreenshot();
        return [{
          type: "image",
          source: { type: "base64", media_type: "image/png", data: s.png_base64 },
        }];
      }
      case "left_click":
      case "right_click":
      case "middle_click":
      case "double_click":
      case "triple_click": {
        const [x, y] = (input.coordinate as [number, number]) ?? [0, 0];
        await desktop.mouseMove(x, y);
        const button = action.startsWith("right") ? "right" : action.startsWith("middle") ? "middle" : "left";
        await desktop.mouseClick(button as "left" | "right" | "middle", action === "double_click");
        if (action === "triple_click") {
          await desktop.mouseClick(button as "left" | "right" | "middle");
          await desktop.mouseClick(button as "left" | "right" | "middle");
        }
        return [{ type: "text", text: "ok" }];
      }
      case "mouse_move": {
        const [x, y] = (input.coordinate as [number, number]) ?? [0, 0];
        await desktop.mouseMove(x, y);
        return [{ type: "text", text: "ok" }];
      }
      case "type": {
        await desktop.typeText(String(input.text ?? ""));
        return [{ type: "text", text: "ok" }];
      }
      case "key": {
        await desktop.keyPress(String(input.text ?? ""));
        return [{ type: "text", text: "ok" }];
      }
      case "wait": {
        const ms = Number(input.duration ?? 1) * 1000;
        await new Promise((r) => setTimeout(r, Math.min(ms, 5000)));
        return [{ type: "text", text: "ok" }];
      }
      default:
        return [{ type: "text", text: `unknown action ${action}` }];
    }
  }

  async function run() {
    if (!goal.trim() || running) return;
    if (!available) { append("Computer Use only works in the desktop app."); return; }
    setRunning(true); setLog([]); cancelRef.current = false;
    append(`Goal: ${goal.trim()}`);
    speak("On it.");

    const first = await desktop.takeScreenshot();

    let messages: Msg[] = [{
      role: "user",
      content: [
        { type: "text", text: goal.trim() },
        { type: "image", source: { type: "base64", media_type: "image/png", data: first.png_base64 } },
      ],
    }];

    for (let turn = 0; turn < 20; turn++) {
      if (cancelRef.current) { append("Cancelled."); break; }
      const res = await fetch("/api/jarvis/computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          screen: { width: first.width, height: first.height },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        append(`Error: ${j.error ?? res.statusText}`); break;
      }
      const j = (await res.json()) as { stop_reason: string; content: Block[] };

      for (const block of j.content) {
        if (block.type === "text" && block.text) {
          append(`Jarvis: ${block.text}`);
          speak(block.text);
        }
      }

      messages = [...messages, { role: "assistant", content: j.content }];

      if (j.stop_reason !== "tool_use") {
        append("Done.");
        speak("Done.");
        break;
      }

      const toolResults: Block[] = [];
      for (const block of j.content) {
        if (block.type !== "tool_use") continue;
        const output = await executeAction(block.input ?? {});
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        });
      }
      messages = [...messages, { role: "user", content: toolResults }];
    }

    setRunning(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-5 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-accent-400" />
            <h2 className="text-lg font-semibold">Jarvis on the desktop</h2>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs"><X size={12} /></button>
        </div>
        {!available && (
          <div className="text-xs text-warn-500 border border-warn-500/30 bg-warn-500/10 rounded-md px-3 py-2">
            Computer Use only runs inside the desktop app (Tauri). Open Control Center as the installed app.
          </div>
        )}
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder='Tell Jarvis what to do on this computer. e.g. "Open Notes and write a one-paragraph summary of today’s alerts."'
          className="input min-h-[80px]"
          disabled={running}
        />
        <div className="flex items-center gap-2">
          <button onClick={run} disabled={running || !goal.trim() || !available} className="btn-primary inline-flex items-center gap-1">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? "Working…" : "Run"}
          </button>
          {running && <button onClick={() => (cancelRef.current = true)} className="btn-ghost text-xs">Cancel</button>}
        </div>
        <div ref={logRef} className="max-h-64 overflow-y-auto bg-ink-950/50 rounded-md border border-ink-800 p-2 font-mono text-xs space-y-1">
          {log.length === 0 ? (
            <p className="text-ink-500">No actions yet.</p>
          ) : (
            log.map((l, i) => <div key={i} className="text-ink-300 whitespace-pre-wrap">{l}</div>)
          )}
        </div>
        <p className="text-[10px] text-ink-500">
          Anthropic Computer Use (beta). First run prompts macOS for Screen Recording + Accessibility permission.
        </p>
      </div>
    </div>
  );
}
