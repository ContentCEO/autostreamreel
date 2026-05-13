import Link from "next/link";
import { Building2, Sparkles, PhoneOutgoing, Megaphone } from "lucide-react";

// Shown on the dashboard when the owner has zero businesses. Replaces the wall
// of empty cards with one clear next step.
export function FirstRunWelcome() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome to Control Center</h1>
        <p className="text-sm text-ink-400 mt-1">
          Your personal Jarvis. One owner, every business, one screen.
        </p>
      </header>

      <Link href="/cc/businesses?new=1" className="card p-6 block border-accent-500/40 bg-accent-500/5 hover:bg-accent-500/10 transition">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={20} className="text-accent-400" />
          <h2 className="text-lg font-semibold">Start by adding your first business</h2>
        </div>
        <p className="text-sm text-ink-300">
          When you create a business here, the org chart spins up automatically:
          one CEO, three VPs, two assistant managers, and 48 IC agents (20 sales,
          20 marketing, 8 customer success). Everything below light up the
          moment you have one business in.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 btn-primary">+ Add my first business</div>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tip icon={Sparkles}      title="Jarvis on the right" body="Chat panel speaks live to your data. Tell it what to do and it does it." />
        <Tip icon={PhoneOutgoing} title="Real outbound"        body="Call, text, and email your clients on a cadence — gated by kill switches on /cc/outbound." />
        <Tip icon={Megaphone}     title="Real ad platforms"    body="Connect Google / Meta / Facebook / Instagram / TikTok / LinkedIn from /cc/ad-accounts." />
      </div>
    </div>
  );
}

function Tip({
  icon: Icon, title, body,
}: {
  icon: typeof Sparkles; title: string; body: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-ink-500" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-ink-400">{body}</p>
    </div>
  );
}
