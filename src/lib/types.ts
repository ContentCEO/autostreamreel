// Control Center types. Mirrors supabase/migrations/0001_control_center.sql.

export type AgentTier = "ceo" | "manager" | "assistant_manager" | "employee";
export type AgentDepartment =
  | "sales"
  | "marketing"
  | "customer_success"
  | "ops"
  | "finance";

export type TaskStatus = "pending" | "in_progress" | "done" | "blocked";
export type AlertSeverity = "info" | "warn" | "critical";
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type ClientStatus = "active" | "paused" | "churned";

export type AdPlatform =
  | "google_ads"
  | "meta"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "linkedin";

export type OutboundChannel = "call" | "sms" | "email";
export type OutboundStatus = "scheduled" | "sent" | "failed" | "cancelled";

export interface Business {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  business_id: string | null;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  mrr_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string | null;
  client_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  ltv_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  est_value_cents: number | null;
  notes: string | null;
  ai_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  business_id: string | null;
  title: string;
  with_name: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  agenda: string | null;
  notes: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  business_id: string | null;
  parent_agent_id: string | null;
  tier: AgentTier;
  department: AgentDepartment;
  role: string;
  name: string;
  persona: string | null;
  instructions: string | null;
  schedule_cron: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  business_id: string | null;
  agent_id: string | null;
  parent_task_id: string | null;
  title: string;
  details: string | null;
  status: TaskStatus;
  priority: number;
  due_at: string | null;
  completed_at: string | null;
  output: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  business_id: string | null;
  agent_id: string | null;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  context: Record<string, unknown> | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AdAccount {
  id: string;
  business_id: string | null;
  platform: AdPlatform;
  account_label: string;
  external_id: string | null;
  status: "disconnected" | "connected" | "error";
  scopes: string[] | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface OutboundScheduleRow {
  id: string;
  business_id: string | null;
  agent_id: string | null;
  target_kind: "client" | "customer" | "lead";
  target_id: string;
  channel: OutboundChannel;
  script: string | null;
  scheduled_at: string;
  status: OutboundStatus;
  result: Record<string, unknown> | null;
  created_at: string;
}

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls: Record<string, unknown> | null;
  created_at: string;
}

export const TIER_LABEL: Record<AgentTier, string> = {
  ceo: "CEO",
  manager: "Manager",
  assistant_manager: "Assistant Manager",
  employee: "Employee",
};

export const DEPARTMENT_LABEL: Record<AgentDepartment, string> = {
  sales: "Sales",
  marketing: "Marketing",
  customer_success: "Customer Success",
  ops: "Operations",
  finance: "Finance",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};
