-- Phase 2 additions for Control Center.
--   * agent_runs    — last-tick bookkeeping for the autonomous dispatcher.
--   * briefings     — generated daily briefings ready on app open.
--   * permissions   — owner-controlled kill switches per autonomous capability.
--   * helper triggers for updated_at across tables.

create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  reason      text,
  status      text not null default 'ok',
  summary     text,
  created_at  timestamptz not null default now()
);
create index if not exists agent_runs_recent_idx on public.agent_runs (agent_id, created_at desc);

create table if not exists public.briefings (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null default 'global',
  business_id uuid references public.businesses(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists briefings_recent_idx on public.briefings (created_at desc);

-- Owner-controlled switches. Defaults to OFF for outbound + ads writes so
-- nothing fires until the owner flips it on from the UI.
create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  enabled     boolean not null default false,
  updated_at  timestamptz not null default now()
);

insert into public.permissions (key, enabled) values
  ('outbound.sms',          false),
  ('outbound.call',         false),
  ('outbound.email',        false),
  ('ads.write',             false),
  ('agents.autonomous',     false),
  ('jarvis.actions',        true)
on conflict (key) do nothing;

-- Lock down phase-2 tables to the owner too.
do $$
declare
  t text;
  tables text[] := array['agent_runs','briefings','permissions'];
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
