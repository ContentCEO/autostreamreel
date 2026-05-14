import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { Sidebar } from "@/components/Sidebar";
import { JarvisPanel } from "@/components/JarvisPanel";
import { TakeoverBoot } from "@/components/TakeoverBoot";
import { CriticalTakeover } from "@/components/CriticalTakeover";
import { StatusBar } from "@/components/StatusBar";
import { SearchPalette } from "@/components/SearchPalette";
import { ContinuousJarvis } from "@/components/ContinuousJarvis";
import { JarvisAutopilot } from "@/components/JarvisAutopilot";
import { SlidingTab } from "@/components/SlidingTab";
import { AuthGate } from "@/components/AuthGate";

export const dynamic = "force-dynamic";

export default async function CCLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/login?error=not_owner");

  return (
    <div className="min-h-screen text-ink-100 bg-black relative">
      {/* Auth challenge (name + code) — runs once per session if configured. */}
      <AuthGate>
        <div className="min-h-screen flex">
          <Sidebar email={user.email ?? null} />
          <main className="flex-1 min-w-0 flex flex-col relative">
            <div className="flex-1 relative">
              {/* SlidingTab renders the orb background AND the sliding
                  content panel that contains the children. */}
              <SlidingTab>{children}</SlidingTab>
            </div>
            <StatusBar />
          </main>
          <JarvisPanel />
          <TakeoverBoot />
          <CriticalTakeover />
          <SearchPalette />
          <ContinuousJarvis />
          <JarvisAutopilot />
        </div>
      </AuthGate>
    </div>
  );
}
