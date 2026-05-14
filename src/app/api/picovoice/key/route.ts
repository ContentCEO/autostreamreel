import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

// GET /api/picovoice/key
// Picovoice runs Porcupine on-device (in the browser via WASM) and the
// access key is required to instantiate it. We don't bundle the key into
// the static JS — clients fetch it after they're already authenticated as
// the owner. The free Picovoice tier allows generous personal use.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.PICOVOICE_ACCESS_KEY ?? "";
  return NextResponse.json({ configured: Boolean(key), key });
}
