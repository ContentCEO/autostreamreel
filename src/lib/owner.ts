// Owner gate. Only the single email in OWNER_EMAIL can use the Control Center.
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  const configured = (process.env.OWNER_EMAIL ?? "").toLowerCase().trim();
  return Boolean(configured) && e === configured;
}
