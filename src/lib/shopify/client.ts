const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
// Legacy static token (pre-Jan 2026 custom apps) — still supported if set
const STATIC_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = "2025-01";

// Token cache (server-side, reused across requests within the same process)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  // Use static token if provided (legacy custom app)
  if (STATIC_TOKEN && !STATIC_TOKEN.includes("REPLACE_ME")) return STATIC_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !SHOP) {
    throw new Error("Shopify credentials not configured");
  }

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  // Fetch new token via client credentials grant
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function shopifyGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SHOP) throw new Error("SHOPIFY_SHOP_DOMAIN not set");
  const token = await getAccessToken();
  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = (await res.json()) as { data?: T; errors?: unknown[] };
  if (json.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}
