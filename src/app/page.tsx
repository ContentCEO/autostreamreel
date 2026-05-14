import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export default async function Index() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/enter");
  if (!isOwnerEmail(user.email)) redirect("/enter?error=not_owner");
  redirect("/cc");
}
