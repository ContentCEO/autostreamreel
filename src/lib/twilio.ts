// Twilio REST helpers. Uses fetch + Basic auth — no SDK dependency.

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const authToken  = process.env.TWILIO_AUTH_TOKEN  ?? "";
  const from       = process.env.TWILIO_FROM_NUMBER ?? "";
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function isTwilioConfigured(): boolean {
  return Boolean(getConfig());
}

export function getOwnerPhone(): string | null {
  return process.env.OWNER_PHONE && process.env.OWNER_PHONE.trim() !== ""
    ? process.env.OWNER_PHONE.trim()
    : null;
}

function authHeader(cfg: TwilioConfig): string {
  const raw = `${cfg.accountSid}:${cfg.authToken}`;
  const b64 = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${b64}`;
}

export async function sendSMS(args: {
  to: string;
  body: string;
}): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "twilio not configured" };

  const form = new URLSearchParams();
  form.set("To", args.to);
  form.set("From", cfg.from);
  form.set("Body", args.body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );
  if (!res.ok) return { ok: false, error: `twilio ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { sid: string };
  return { ok: true, sid: json.sid };
}

export async function placeCall(args: {
  to: string;
  twimlUrl: string;
}): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "twilio not configured" };

  const form = new URLSearchParams();
  form.set("To", args.to);
  form.set("From", cfg.from);
  form.set("Url", args.twimlUrl);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );
  if (!res.ok) return { ok: false, error: `twilio ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { sid: string };
  return { ok: true, sid: json.sid };
}

// Renders a tiny TwiML document. <Say> reads the script via Polly Joanna
// (Twilio's default neural voice). Production should swap to <Play> with a
// pre-generated TTS audio file.
export function twiml(script: string): string {
  const escaped = script
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="Polly.Joanna">${escaped}</Say></Response>`;
}
