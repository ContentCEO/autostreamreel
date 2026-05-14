import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// /cc home is intentionally bare — the orb + clock from BootBackground IS
// the home view. Tabs slide over it. When the owner has zero businesses,
// we redirect into the businesses tab with the "new business" form open
// so first-run onboarding still has a clear path.
export default async function Dashboard() {
  const supabase = createClient();
  const { count } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true });

  if (!count) {
    redirect("/cc/businesses?new=1");
  }
  return null;
}
