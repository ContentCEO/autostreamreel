// Lightweight Resend client. Uses fetch — no SDK needed.

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "resend not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    }),
  });
  if (!res.ok) return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { id: string };
  return { ok: true, id: json.id };
}
