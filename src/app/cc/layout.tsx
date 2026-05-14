import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { Sidebar } from "@/components/Sidebar";
import { TakeoverBoot } from "@/components/TakeoverBoot";
import { CriticalTakeover } from "@/components/CriticalTakeover";
import { StatusBar } from "@/components/StatusBar";
import { SearchPalette } from "@/components/SearchPalette";
import { ContinuousJarvis } from "@/components/ContinuousJarvis";
import { JarvisAutopilot } from "@/components/JarvisAutopilot";
import { SlidingTab } from "@/components/SlidingTab";
import { AuthGate } from "@/components/AuthGate";
import { BootBackground } from "@/components/BootBackground";
import { JarvisHUD } from "@/components/JarvisHUD";

export const dynamic = "force-dynamic";

// The /cc layout: persistent orb home, sidebar overlay, sliding tab panel,
// floating Jarvis HUD (mic + voice controls) in the top right corner.
// There is no permanent chat sidebar — Jarvis is voice-first now.
export default async function CCLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/enter");
  if (!isOwnerEmail(user.email)) redirect("/enter?error=not_owner");

  return (
    <div className="min-h-screen text-ink-100">
      {/* Always-on home: black background, orb, clock, date. */}
      <BootBackground />

      <AuthGate>
        <div className="min-h-screen flex relative">
          <Sidebar email={user.email ?? null} />
          <main className="flex-1 min-w-0 flex flex-col relative">
            <div className="flex-1 relative">
              <SlidingTab>{children}</SlidingTab>
            </div>
            <StatusBar />
          </main>

          {/* Floating Jarvis HUD — mic + voice + listen mode controls.
              Positioned top-right; replaces the old chat sidebar. */}
          <JarvisHUD />

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
