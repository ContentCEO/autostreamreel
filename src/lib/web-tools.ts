// Web tools for Jarvis. fetch_url + web_search + open_map. All work without
// extra API keys (web_search falls back to DuckDuckGo if no key is set).

export async function fetchUrlAsText(url: string, maxBytes = 200_000): Promise<{ ok: true; text: string; status: number } | { ok: false; error: string }> {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, error: "only http(s) URLs allowed" };
    const res = await fetch(url, {
      headers: { "user-agent": "ControlCenter/1.2 (Jarvis)" },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText}` };
    const buf = await res.arrayBuffer();
    const sliced = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(sliced);
    const text = stripHtml(raw);
    return { ok: true, text, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

function stripHtml(html: string): string {
  // Remove script/style blocks then strip tags.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

interface SearchHit { title: string; url: string; snippet: string }

export async function webSearch(query: string, limit = 5): Promise<SearchHit[]> {
  // Tavily preferred if TAVILY_API_KEY is set — good ranking and JSON output.
  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: limit,
          search_depth: "basic",
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
        return (j.results ?? []).slice(0, limit).map((r) => ({
          title: r.title, url: r.url, snippet: r.content,
        }));
      }
    } catch { /* fall through to DDG */ }
  }

  // Fallback: DuckDuckGo HTML, no key required. Best-effort parsing.
  try {
    const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ControlCenter/1.2)" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const hits: SearchHit[] = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null && hits.length < limit) {
      const url   = decodeURIComponent(m[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "").split("&rut=")[0]);
      const title = stripHtml(m[2]).slice(0, 200);
      const snippet = stripHtml(m[3]).slice(0, 400);
      hits.push({ title, url, snippet });
    }
    return hits;
  } catch { return []; }
}

export function buildMapsUrl(query: string, origin?: string): string {
  const q = encodeURIComponent(query);
  if (origin) return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
