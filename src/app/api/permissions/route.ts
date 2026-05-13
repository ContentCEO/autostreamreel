import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { listPermissions, setPermission, type PermissionKey } from "@/lib/permissions";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ permissions: await listPermissions() });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { key, enabled } = (await req.json()) as { key: PermissionKey; enabled: boolean };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  await setPermission(key, Boolean(enabled));
  return NextResponse.json({ ok: true });
}
