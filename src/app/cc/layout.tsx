import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { Sidebar } from "@/components/Sidebar";
import { JarvisPanel } from "@/components/JarvisPanel";
import { TakeoverBoot } from "@/components/TakeoverBoot";
import { BootSequence } from "@/components/BootSequence";
import { CriticalTakeover } from "@/components/CriticalTakeover";
import { StatusBar } from "@/components/StatusBar";
import { SearchPalette } from "@/components/SearchPalette";
import { ContinuousJarvis } from "@/components/ContinuousJarvis";
import { JarvisAutopilot } from "@/components/JarvisAutopilot";

export const dynamic = "force-dynamic";

export default async function CCLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/login?error=not_owner");

  return (
    <div className="min-h-screen flex bg-ink-950 text-ink-100">
      <Sidebar email={user.email ?? null} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <StatusBar />
      </main>
      <JarvisPanel />
      <TakeoverBoot />
      <BootSequence />
      <CriticalTakeover />
      <SearchPalette />
      <ContinuousJarvis />
      <JarvisAutopilot />
    </div>
  );
}
