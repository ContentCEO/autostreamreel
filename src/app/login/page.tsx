"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push("/cc");
    router.refresh();
  }

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-1">Control Center</h1>
        <p className="text-ink-400 text-sm mb-6">Owner sign-in only.</p>

        {searchParams.error === "not_owner" && (
          <div className="mb-4 rounded-lg border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-sm text-danger-500">
            This email is not the registered owner.
          </div>
        )}

        <div className="flex gap-1 mb-4 text-xs">
          <button
            onClick={() => { setMode("password"); setSent(false); setError(null); }}
            className={`px-2 py-1 rounded-md border ${mode === "password" ? "border-accent-500 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-400"}`}
          >Password</button>
          <button
            onClick={() => { setMode("magic"); setSent(false); setError(null); }}
            className={`px-2 py-1 rounded-md border ${mode === "magic" ? "border-accent-500 text-accent-300 bg-accent-500/10" : "border-ink-800 text-ink-400"}`}
          >Magic link</button>
        </div>

        {sent && mode === "magic" ? (
          <p className="text-sm text-ink-200">
            Check <span className="font-medium text-accent-400">{email}</span> for a magic link.
          </p>
        ) : (
          <form onSubmit={mode === "password" ? submitPassword : submitMagic} className="space-y-4">
            <label className="block">
              <span className="text-sm text-ink-300">Email</span>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
                placeholder="you@example.com"
              />
            </label>
            {mode === "password" && (
              <label className="block">
                <span className="text-sm text-ink-300">Password</span>
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input mt-1"
                />
              </label>
            )}
            {error && <p className="text-sm text-danger-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "…" : mode === "password" ? "Sign in" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
