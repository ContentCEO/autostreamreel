-- Control Center — single-owner schema.
--
-- This database is gated to ONE user (the owner). Every table enables RLS
-- and the policy checks auth.jwt() -> 'email' against the configured owner
-- email. Set the owner email with:
--
--   alter database postgres set app.owner_email = 'you@example.com';
--
-- or via the Supabase dashboard's "Database → Custom postgres config".

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = lower(coalesce(current_setting('app.owner_email', true), '')),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Businesses the owner runs.
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  website     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists businesses_name_idx on public.businesses (name);

-- Clients / customers / leads.
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  notes        text,
  status       text not null default 'active',
  mrr_cents    integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists clients_business_idx on public.clients (business_id);

create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  name         text not null,
  email        text,
  phone        text,
  notes        text,
  ltv_cents    integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists customers_business_idx on public.customers (business_id);

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references public.businesses(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  source          text,
  status          text not null default 'new',
  est_value_cents integer,
  notes           text,
  ai_score        integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists leads_business_idx on public.leads (business_id);
create index if not exists leads_status_idx   on public.leads (status);

-- Meetings — drives auto-takeover prompts.
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete set null,
  title        text not null,
  with_name    text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  agenda       text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists meetings_starts_idx on public.meetings (starts_at);

-- Agent roster. Hierarchy: CEO -> Manager -> Asst Manager -> Employee.
create table if not exists public.agents (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references public.businesses(id) on delete cascade,
  parent_agent_id uuid references public.agents(id) on delete set null,
  tier            text not null,
  department      text not null,
  role            text not null,
  name            text not null,
  persona         text,
  instructions    text,
  schedule_cron   text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists agents_business_idx on public.agents (business_id);
create index if not exists agents_parent_idx   on public.agents (parent_agent_id);
create index if not exists agents_tier_idx     on public.agents (tier);

-- Tasks each agent is working on.
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid references public.businesses(id) on delete cascade,
  agent_id       uuid references public.agents(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete set null,
  title          text not null,
  details        text,
  status         text not null default 'pending',
  priority       integer not null default 3,
  due_at         timestamptz,
  completed_at   timestamptz,
  output         jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists tasks_business_idx on public.tasks (business_id);
create index if not exists tasks_agent_idx    on public.tasks (agent_id);
create index if not exists tasks_status_idx   on public.tasks (status);

-- Alerts — things going wrong, surfaced to the owner.
create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  agent_id     uuid references public.agents(id) on delete set null,
  severity     text not null default 'info',
  title        text not null,
  body         text,
  context      jsonb,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists alerts_unresolved_idx on public.alerts (resolved_at, severity);

-- Ad accounts.
create table if not exists public.ad_accounts (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid references public.businesses(id) on delete cascade,
  platform       text not null,
  account_label  text not null,
  external_id    text,
  status         text not null default 'disconnected',
  oauth_token    text,
  oauth_refresh  text,
  scopes         text[],
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists ad_accounts_business_idx on public.ad_accounts (business_id);

-- Outbound schedule + log.
create table if not exists public.outbound_schedule (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  agent_id     uuid references public.agents(id) on delete set null,
  target_kind  text not null,
  target_id    uuid not null,
  channel      text not null,
  script       text,
  scheduled_at timestamptz not null,
  status       text not null default 'scheduled',
  result       jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists outbound_due_idx on public.outbound_schedule (status, scheduled_at);

create table if not exists public.message_log (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references public.businesses(id) on delete cascade,
  agent_id      uuid references public.agents(id) on delete set null,
  target_kind   text,
  target_id     uuid,
  channel       text not null,
  direction     text not null,
  body          text,
  external_id   text,
  created_at    timestamptz not null default now()
);
create index if not exists message_log_recent_idx on public.message_log (created_at desc);

-- Jarvis chat history.
create table if not exists public.jarvis_messages (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,
  content     text not null,
  tool_calls  jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists jarvis_recent_idx on public.jarvis_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — owner only on every table.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'businesses',
    'clients',
    'customers',
    'leads',
    'meetings',
    'agents',
    'tasks',
    'alerts',
    'ad_accounts',
    'outbound_schedule',
    'message_log',
    'jarvis_messages'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_owner_all" on public.%I', t, t);
    execute format(
      'create policy "%s_owner_all" on public.%I for all using (public.is_owner()) with check (public.is_owner())',
      t, t
    );
  end loop;
end$$;
