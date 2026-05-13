// Ad-platform OAuth + light write surface. Generic provider config so we can
// add new platforms by extending PROVIDERS — the API routes don't change.

import { isAllowed } from "@/lib/permissions";

export type ProviderId =
  | "google_ads"
  | "meta"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "linkedin";

interface ProviderConfig {
  id: ProviderId;
  label: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  // For Meta/FB/IG we share creds — same Graph API.
  graphBase?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google_ads: {
    id: "google_ads",
    label: "Google Ads",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    clientIdEnv: "GOOGLE_ADS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ADS_CLIENT_SECRET",
  },
  meta: {
    id: "meta",
    label: "Meta Ads",
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    scopes: ["ads_management", "ads_read", "business_management", "pages_manage_ads"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    graphBase: "https://graph.facebook.com/v20.0",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    graphBase: "https://graph.facebook.com/v20.0",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    graphBase: "https://graph.facebook.com/v20.0",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Ads",
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    scopes: ["ads.read", "ads.management"],
    clientIdEnv: "TIKTOK_APP_ID",
    clientSecretEnv: "TIKTOK_APP_SECRET",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn Ads",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_ads", "rw_ads", "r_organization_social", "w_organization_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
};

export function authUrl(p: ProviderId, redirectUri: string, state: string): string {
  const cfg = PROVIDERS[p];
  const clientId = process.env[cfg.clientIdEnv] ?? "";
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         cfg.scopes.join(" "),
    state,
    access_type:   "offline",
    prompt:        "consent",
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

export async function exchangeCode(
  p: ProviderId,
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const cfg = PROVIDERS[p];
  const body = new URLSearchParams({
    code,
    client_id:     process.env[cfg.clientIdEnv]     ?? "",
    client_secret: process.env[cfg.clientSecretEnv] ?? "",
    redirect_uri:  redirectUri,
    grant_type:    "authorization_code",
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`${p} token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
}

// Light "do something" surface. The provider-specific endpoints are real
// production URLs — turning on `ads.write` actually hits them.
export async function createCampaign(args: {
  platform: ProviderId;
  accessToken: string;
  externalAccountId: string;
  name: string;
  dailyBudgetCents: number;
  objective: string;
}): Promise<{ ok: true; external_id: string } | { ok: false; error: string }> {
  if (!(await isAllowed("ads.write"))) return { ok: false, error: "ads.write disabled by owner" };

  if (args.platform === "meta" || args.platform === "facebook" || args.platform === "instagram") {
    const cfg = PROVIDERS[args.platform];
    const res = await fetch(
      `${cfg.graphBase}/act_${args.externalAccountId.replace(/^act_/, "")}/campaigns`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name:          args.name,
          objective:     args.objective || "OUTCOME_LEADS",
          status:        "PAUSED",
          special_ad_categories: "[]",
          daily_budget:  String(args.dailyBudgetCents),
        }).toString(),
      },
    );
    if (!res.ok) return { ok: false, error: `meta ${res.status}: ${await res.text()}` };
    const json = (await res.json()) as { id: string };
    return { ok: true, external_id: json.id };
  }

  // Other platforms: stubbed; would route to their SDKs.
  return { ok: false, error: `${args.platform} write not implemented yet` };
}
