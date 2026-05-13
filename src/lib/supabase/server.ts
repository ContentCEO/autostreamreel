import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server-side Supabase client. Returns a no-op stub when env vars are missing
// so previews don't crash on render.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return makeStub();

  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet: CookieToSet[]) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

type SupabaseLike = ReturnType<typeof createServerClient>;

function makeStub(): SupabaseLike {
  const message = "Supabase env not configured.";
  const throwing: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "auth") {
        return {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          signInWithOtp: async () => ({ data: null, error: { message } }),
          signOut: async () => ({ error: null }),
        };
      }
      if (prop === "from") return () => new Proxy({}, throwing);
      if (prop === "rpc") return () => Promise.reject(new Error(message));
      if (prop === "then") return undefined;
      if (typeof prop === "symbol") return undefined;
      return () => { throw new Error(message); };
    },
  };
  return new Proxy({}, throwing) as unknown as SupabaseLike;
}
