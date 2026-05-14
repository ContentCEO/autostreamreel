// Tool catalog for Jarvis. Two kinds:
//   * read tools  — always allowed.
//   * write tools — only fire when jarvis.actions permission is on.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowed } from "@/lib/permissions";
import { sendOutboundRow } from "@/lib/outbound";
import { createAlert as createAlertHelper } from "@/lib/alerts";
import { fetchUrlAsText, webSearch, buildMapsUrl } from "@/lib/web-tools";
import { listRecentEmails, sendEmail, listUpcomingEvents, createCalendarEvent } from "@/lib/google";

export const JARVIS_TOOLS = [
  // ---- read ----
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
  {
    name: "find_clients",
    description: "Search clients across all businesses by name or status.",
    input_schema: {
      type: "object",
      properties: { q: { type: "string" }, status: { type: "string" }, limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "list_agents",
    description: "List agents on a business, optionally filtered by department.",
    input_schema: {
      type: "object",
      properties: {
        business_id: { type: "string" },
        department:  { type: "string" },
        limit:       { type: "number" },
      },
      additionalProperties: false,
    },
  },
  // ---- write ----
  {
    name: "create_task",
    description: "Create a new task, optionally assigned to an agent. Use to dispatch work.",
    input_schema: {
      type: "object",
      properties: {
        title:       { type: "string" },
        details:     { type: "string" },
        business_id: { type: "string" },
        agent_id:    { type: "string" },
        priority:    { type: "number" },
        due_at:      { type: "string", description: "ISO 8601 timestamp" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "dispatch_agent",
    description: "Run an agent against an instruction immediately and return its output.",
    input_schema: {
      type: "object",
      properties: {
        agent_id:    { type: "string" },
        instruction: { type: "string" },
      },
      required: ["agent_id", "instruction"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_outbound",
    description: "Schedule a single outbound call/sms/email to a client, customer, or lead.",
    input_schema: {
      type: "object",
      properties: {
        business_id:  { type: "string" },
        target_kind:  { type: "string", enum: ["client", "customer", "lead"] },
        target_id:    { type: "string" },
        channel:      { type: "string", enum: ["call", "sms", "email"] },
        scheduled_at: { type: "string", description: "ISO 8601; default = now" },
        script:       { type: "string" },
      },
      required: ["target_kind", "target_id", "channel"],
      additionalProperties: false,
    },
  },
  {
    name: "send_outbound_now",
    description: "Immediately send one scheduled outbound row by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_alert",
    description: "Raise an alert to the owner.",
    input_schema: {
      type: "object",
      properties: {
        title:       { type: "string" },
        body:        { type: "string" },
        severity:    { type: "string", enum: ["info", "warn", "critical"] },
        business_id: { type: "string" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "resolve_alert",
    description: "Mark an alert resolved.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "log_meeting",
    description: "Add a meeting to the calendar.",
    input_schema: {
      type: "object",
      properties: {
        title:       { type: "string" },
        with_name:   { type: "string" },
        starts_at:   { type: "string" },
        ends_at:     { type: "string" },
        location:    { type: "string" },
        agenda:      { type: "string" },
        business_id: { type: "string" },
      },
      required: ["title", "starts_at"],
      additionalProperties: false,
    },
  },
  {
    name: "add_lead",
    description: "Record a new lead.",
    input_schema: {
      type: "object",
      properties: {
        name:        { type: "string" },
        email:       { type: "string" },
        phone:       { type: "string" },
        source:      { type: "string" },
        business_id: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_lead",
    description: "Update a lead's status, notes, or AI score.",
    input_schema: {
      type: "object",
      properties: {
        id:      { type: "string" },
        status:  { type: "string", enum: ["new", "contacted", "qualified", "won", "lost"] },
        notes:   { type: "string" },
        ai_score:{ type: "number" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  // ---- web ----
  {
    name: "web_search",
    description: "Search the web for up-to-date information. Returns title/url/snippet for top results.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "fetch_url",
    description: "Fetch a webpage and return its text content (HTML stripped). Useful for reading articles, docs, or specific pages found via web_search.",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "open_map",
    description: "Build a Google Maps URL for a place or directions and instruct the owner's client to open it. The client will open the map in a new tab.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" }, origin: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  // ---- email + calendar (Google) ----
  {
    name: "list_recent_emails",
    description: "List the owner's most recent inbox emails (subject, from, snippet, date).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "send_email",
    description: "Send an email from the owner's Gmail account.",
    input_schema: {
      type: "object",
      properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
      required: ["to", "subject", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "list_calendar_events",
    description: "List the owner's upcoming Google Calendar events.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "create_calendar_event",
    description: "Add an event to the owner's primary Google Calendar.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        description: { type: "string" },
        start: { type: "string", description: "ISO 8601 start datetime" },
        end:   { type: "string", description: "ISO 8601 end datetime" },
        location: { type: "string" },
      },
      required: ["summary", "start", "end"],
      additionalProperties: false,
    },
  },
];

const WRITE_TOOLS = new Set([
  "create_task", "dispatch_agent", "schedule_outbound", "send_outbound_now",
  "create_alert", "resolve_alert", "log_meeting", "add_lead", "update_lead",
]);

export async function runJarvisTool(
  name: string,
  input: Record<string, unknown>,
  admin: SupabaseClient,
): Promise<unknown> {
  if (WRITE_TOOLS.has(name) && !(await isAllowed("jarvis.actions"))) {
    return { error: "Jarvis write actions are disabled by the owner." };
  }

  switch (name) {
    case "list_businesses": {
      const { data } = await admin.from("businesses").select("id,name,industry");
      return data ?? [];
    }
    case "count_pipeline": {
      const { data } = await admin.from("leads").select("status");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return counts;
    }
    case "open_alerts": {
      const limit = Number(input.limit ?? 10);
      const { data } = await admin
        .from("alerts")
        .select("id,title,severity,created_at,business_id,body")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    }
    case "active_tasks": {
      const limit = Number(input.limit ?? 10);
      const { data } = await admin
        .from("tasks")
        .select("id,title,status,priority,due_at,agent_id,business_id")
        .in("status", ["pending", "in_progress"])
        .order("priority")
        .limit(limit);
      return data ?? [];
    }
    case "upcoming_meetings": {
      const limit = Number(input.limit ?? 5);
      const { data } = await admin
        .from("meetings")
        .select("id,title,with_name,starts_at,agenda")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(limit);
      return data ?? [];
    }
    case "find_clients": {
      const limit = Number(input.limit ?? 20);
      let q = admin.from("clients").select("id,name,status,mrr_cents,business_id").limit(limit);
      if (typeof input.q === "string" && input.q) q = q.ilike("name", `%${input.q}%`);
      if (typeof input.status === "string" && input.status) q = q.eq("status", input.status);
      const { data } = await q;
      return data ?? [];
    }
    case "list_agents": {
      const limit = Number(input.limit ?? 100);
      let q = admin.from("agents").select("id,name,role,department,tier,business_id").limit(limit);
      if (typeof input.business_id === "string") q = q.eq("business_id", input.business_id);
      if (typeof input.department === "string")  q = q.eq("department", input.department);
      const { data } = await q;
      return data ?? [];
    }

    case "create_task": {
      const { data, error } = await admin.from("tasks").insert({
        title:       String(input.title),
        details:     input.details ?? null,
        business_id: input.business_id ?? null,
        agent_id:    input.agent_id ?? null,
        priority:    typeof input.priority === "number" ? input.priority : 3,
        due_at:      input.due_at ?? null,
        status:      "pending",
      }).select("id").single();
      return error ? { error: error.message } : { id: data?.id };
    }
    case "dispatch_agent": {
      const { data: agent } = await admin
        .from("agents")
        .select("id,name,role,instructions,business_id")
        .eq("id", input.agent_id as string)
        .maybeSingle();
      if (!agent) return { error: "agent not found" };
      const { generateText } = await import("@/lib/ai");
      const text = await generateText({
        system: agent.instructions ?? `You are ${agent.name}, a ${agent.role}.`,
        user:   String(input.instruction),
        maxTokens: 600,
      });
      await admin.from("tasks").insert({
        business_id: agent.business_id,
        agent_id:    agent.id,
        title:       String(input.instruction).slice(0, 100),
        status:      "done",
        priority:    3,
        completed_at: new Date().toISOString(),
        output:      { text },
      });
      return { agent: agent.name, output: text };
    }
    case "schedule_outbound": {
      const { data, error } = await admin.from("outbound_schedule").insert({
        business_id:  input.business_id ?? null,
        target_kind:  input.target_kind,
        target_id:    input.target_id,
        channel:      input.channel,
        script:       input.script ?? null,
        scheduled_at: input.scheduled_at ?? new Date(Date.now() + 60_000).toISOString(),
        status:       "scheduled",
      }).select("id").single();
      return error ? { error: error.message } : { id: data?.id };
    }
    case "send_outbound_now": {
      const { data: row } = await admin
        .from("outbound_schedule")
        .select("id,business_id,agent_id,target_kind,target_id,channel,script,scheduled_at,status")
        .eq("id", input.id as string)
        .maybeSingle();
      if (!row) return { error: "row not found" };
      const result = await sendOutboundRow(admin, row as Parameters<typeof sendOutboundRow>[1]);
      return result;
    }
    case "create_alert": {
      const result = await createAlertHelper(admin, {
        title:       String(input.title),
        body:        input.body as string | null | undefined,
        severity:    input.severity as "info" | "warn" | "critical" | undefined,
        business_id: input.business_id as string | null | undefined,
      });
      return result;
    }
    case "resolve_alert": {
      const { error } = await admin.from("alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", input.id as string);
      return error ? { error: error.message } : { ok: true };
    }
    case "log_meeting": {
      const { data, error } = await admin.from("meetings").insert({
        title:       String(input.title),
        with_name:   input.with_name ?? null,
        starts_at:   input.starts_at,
        ends_at:     input.ends_at ?? null,
        location:    input.location ?? null,
        agenda:      input.agenda ?? null,
        business_id: input.business_id ?? null,
      }).select("id").single();
      return error ? { error: error.message } : { id: data?.id };
    }
    case "add_lead": {
      const { data, error } = await admin.from("leads").insert({
        name:        String(input.name),
        email:       input.email ?? null,
        phone:       input.phone ?? null,
        source:      input.source ?? null,
        business_id: input.business_id ?? null,
        status:      "new",
      }).select("id").single();
      return error ? { error: error.message } : { id: data?.id };
    }
    case "update_lead": {
      const patch: Record<string, unknown> = {};
      if (input.status)   patch.status   = input.status;
      if (input.notes)    patch.notes    = input.notes;
      if (input.ai_score) patch.ai_score = input.ai_score;
      const { error } = await admin.from("leads").update(patch).eq("id", input.id as string);
      return error ? { error: error.message } : { ok: true };
    }
    case "web_search": {
      const hits = await webSearch(String(input.query), Number(input.limit ?? 5));
      return hits;
    }
    case "fetch_url": {
      const result = await fetchUrlAsText(String(input.url));
      if (!result.ok) return result;
      return { ok: true, status: result.status, text: result.text.slice(0, 8000) };
    }
    case "open_map": {
      const url = buildMapsUrl(String(input.query), input.origin ? String(input.origin) : undefined);
      return { url, action: "open_in_new_tab" };
    }
    case "list_recent_emails":
      return await listRecentEmails(Number(input.limit ?? 10));
    case "send_email":
      return await sendEmail({
        to:      String(input.to),
        subject: String(input.subject),
        body:    String(input.body),
      });
    case "list_calendar_events":
      return await listUpcomingEvents(Number(input.limit ?? 10));
    case "create_calendar_event":
      return await createCalendarEvent({
        summary:     String(input.summary),
        description: input.description ? String(input.description) : undefined,
        start:       String(input.start),
        end:         String(input.end),
        location:    input.location ? String(input.location) : undefined,
      });
    default:
      return { error: `unknown tool ${name}` };
  }
}
