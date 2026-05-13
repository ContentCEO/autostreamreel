import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export interface SearchHit {
  kind: "client" | "customer" | "lead" | "agent" | "business";
  id:   string;
  title: string;
  subtitle: string | null;
  href: string;
}

// GET /api/search?q=...
// Fuzzy-ish search across the five searchable entity types. Each table runs a
// case-insensitive ILIKE on its name column; results are merged and capped.
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ hits: [] });
  const pattern = `%${q.replace(/[%_]/g, "")}%`;

  const [businesses, clients, customers, leads, agents] = await Promise.all([
    supabase.from("businesses").select("id,name,industry").ilike("name", pattern).limit(6),
    supabase.from("clients").select("id,name,status,email,phone").ilike("name", pattern).limit(6),
    supabase.from("customers").select("id,name,email,phone").ilike("name", pattern).limit(6),
    supabase.from("leads").select("id,name,status,email,phone").ilike("name", pattern).limit(6),
    supabase.from("agents").select("id,name,role,department").ilike("name", pattern).limit(6),
  ]);

  const hits: SearchHit[] = [];
  for (const b of businesses.data ?? []) {
    hits.push({ kind: "business", id: b.id, title: b.name, subtitle: b.industry, href: `/cc/businesses/${b.id}` });
  }
  for (const c of clients.data ?? []) {
    hits.push({ kind: "client", id: c.id, title: c.name, subtitle: `${c.status}${c.email ? " · " + c.email : c.phone ? " · " + c.phone : ""}`, href: `/cc/clients/${c.id}` });
  }
  for (const c of customers.data ?? []) {
    hits.push({ kind: "customer", id: c.id, title: c.name, subtitle: c.email ?? c.phone, href: `/cc/customers/${c.id}` });
  }
  for (const l of leads.data ?? []) {
    hits.push({ kind: "lead", id: l.id, title: l.name, subtitle: `${l.status}${l.email ? " · " + l.email : l.phone ? " · " + l.phone : ""}`, href: `/cc/leads/${l.id}` });
  }
  for (const a of agents.data ?? []) {
    hits.push({ kind: "agent", id: a.id, title: a.name, subtitle: `${a.role} · ${a.department}`, href: `/cc/agents/${a.id}` });
  }
  return NextResponse.json({ hits });
}
