import { redirect } from "next/navigation";

// /login is retired. The front door is /enter — a PIN-only orb screen.
export default function LoginRedirect({ searchParams }: { searchParams: { error?: string } }) {
  redirect("/enter" + (searchParams.error ? `?error=${searchParams.error}` : ""));
}
