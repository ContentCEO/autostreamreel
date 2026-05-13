# Control Center

Personal command center — your own Jarvis for running multiple businesses.

This is a **single-user** desktop app (Tauri + Next.js). It is *not* a SaaS.
Only the email in `OWNER_EMAIL` can sign in, and every row in the database is
gated to that single owner via Row Level Security.

## What's inside

- **Businesses** — every business you run.
- **Org chart per business** — CEO → Sales / Marketing / CS managers →
  assistant managers → 40+ employee agents.
- **Clients · Customers · Leads** — the CRM core.
- **Meetings** — scheduling that the desktop app reacts to (auto-takeover when
  a meeting starts).
- **Outbound** — scheduled calls / SMS / emails (Twilio + Resend integrations).
- **Ad accounts** — Google Ads, Meta, Facebook, Instagram, TikTok, LinkedIn.
- **Tasks** — what each agent is doing right now.
- **Alerts** — anything going wrong bubbles up to you.
- **Jarvis** — a Claude-powered chat that can read your data and dispatch
  agents on your behalf.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude (Sonnet 4.6 by default) — the brain
- Tauri 2 — desktop shell, fullscreen takeover

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in Supabase, Anthropic, OWNER_EMAIL
```

Run the migration in `supabase/migrations/0001_control_center.sql` against
your Supabase project (SQL editor).

Then:

```bash
npm run dev          # web at http://localhost:3000
npm run tauri:dev    # desktop, fullscreen takeover
```

On first launch, sign in (Supabase magic-link), then visit `/api/seed/business`
to create your first business and instantiate the full org chart.

## Why "takeover" mode?

The Tauri config launches fullscreen and pins the window — when you open the
app, it owns the screen. That's the intended behavior. To exit, quit from the
menu bar or `Cmd+Q` / `Alt+F4`.

## Status

Milestone 1: shell + dashboard + data model + agent roster + Jarvis chat.
Real autonomous outbound (Twilio dialer, Meta/Google API actions) is wired
into the schema and the dispatcher, but the live integrations are stubs to
be filled in milestone 2.
