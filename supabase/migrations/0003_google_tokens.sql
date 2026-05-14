-- Google OAuth tokens for the owner. Single-row table; RLS owner-only.
create table if not exists public.google_tokens (
  id            uuid primary key default gen_random_uuid(),
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.google_tokens enable row level security;
drop policy if exists "google_tokens_owner_all" on public.google_tokens;
create policy "google_tokens_owner_all" on public.google_tokens
  for all using (public.is_owner()) with check (public.is_owner());
