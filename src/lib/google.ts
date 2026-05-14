// Google OAuth + Gmail + Calendar helpers. Owner clicks "Connect Google",
// gets bounced to Google's consent screen, lands back on /api/google/callback
// which exchanges the code for tokens and stores them.
//
// Tokens are stored in a tiny single-row `google_tokens` table (only the
// owner uses it). Refresh handled inline before each call.

import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const scopes = (process.env.GOOGLE_SCOPES ?? "https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/calendar")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         scopes.join(" "),
    state,
    access_type:   "offline",
    prompt:        "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenSet {
  access_token:  string;
  refresh_token?: string;
  expires_in:    number;
  scope?:        string;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }).toString(),
  });
  if (!res.ok) throw new Error(`google token exchange failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenSet;
}

async function refreshGoogleToken(refresh_token: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type:    "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new Error(`google refresh failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenSet;
}

// Get a usable access token. Loads from google_tokens; refreshes if stale.
export async function getGoogleAccessToken(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("google_tokens").select("*").maybeSingle();
  if (!data) return null;
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return data.access_token as string;
  if (!data.refresh_token) return data.access_token as string;
  const fresh = await refreshGoogleToken(data.refresh_token as string);
  const newExpires = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
  await admin.from("google_tokens").update({
    access_token: fresh.access_token,
    expires_at:   newExpires,
  }).eq("id", data.id);
  return fresh.access_token;
}

// ---- Gmail ----

export async function listRecentEmails(limit = 10): Promise<{ id: string; subject: string; from: string; snippet: string; date: string }[]> {
  const token = await getGoogleAccessToken();
  if (!token) return [];
  const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=in:inbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) return [];
  const list = (await listRes.json()) as { messages?: { id: string }[] };
  const out: Awaited<ReturnType<typeof listRecentEmails>> = [];
  for (const m of list.messages ?? []) {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) continue;
    const j = (await r.json()) as { id: string; snippet: string; payload: { headers: { name: string; value: string }[] } };
    const h = (n: string) => j.payload.headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    out.push({ id: j.id, subject: h("Subject"), from: h("From"), snippet: j.snippet, date: h("Date") });
  }
  return out;
}

export async function sendEmail(args: { to: string; subject: string; body: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const token = await getGoogleAccessToken();
  if (!token) return { ok: false, error: "google not connected" };
  const raw = Buffer.from(
    `From: me\r\nTo: ${args.to}\r\nSubject: ${args.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${args.body}`,
    "utf8",
  ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) return { ok: false, error: `gmail ${res.status}: ${await res.text()}` };
  const j = (await res.json()) as { id: string };
  return { ok: true, id: j.id };
}

// ---- Calendar ----

export async function listUpcomingEvents(limit = 10): Promise<{ id: string; summary: string; start: string; end: string; location?: string }[]> {
  const token = await getGoogleAccessToken();
  if (!token) return [];
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    timeMin: now,
    maxResults: String(limit),
    singleEvents: "true",
    orderBy: "startTime",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { items?: { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; location?: string }[] };
  return (j.items ?? []).map((e) => ({
    id: e.id,
    summary: e.summary ?? "(no title)",
    start: e.start.dateTime ?? e.start.date ?? "",
    end:   e.end.dateTime   ?? e.end.date   ?? "",
    location: e.location,
  }));
}

export async function createCalendarEvent(args: { summary: string; description?: string; start: string; end: string; location?: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const token = await getGoogleAccessToken();
  if (!token) return { ok: false, error: "google not connected" };
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: args.summary,
      description: args.description,
      location: args.location,
      start: { dateTime: args.start },
      end:   { dateTime: args.end },
    }),
  });
  if (!res.ok) return { ok: false, error: `calendar ${res.status}: ${await res.text()}` };
  const j = (await res.json()) as { id: string };
  return { ok: true, id: j.id };
}
