"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
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

        {sent ? (
          <p className="text-sm text-ink-200">
            Check <span className="font-medium text-accent-400">{email}</span> for a magic link.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-ink-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input mt-1"
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="text-sm text-danger-500">{error}</p>}
            <button type="submit" className="btn-primary w-full">Send magic link</button>
          </form>
        )}
      </div>
    </main>
  );
}
