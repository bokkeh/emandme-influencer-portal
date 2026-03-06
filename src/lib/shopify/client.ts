const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const STATIC_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const OAUTH_TOKEN = process.env.SHOPIFY_OAUTH_ACCESS_TOKEN;
const API_VERSION = "2025-01";

async function getAccessToken(): Promise<string> {
  const token = (STATIC_TOKEN || OAUTH_TOKEN || "").trim();
  if (!token || token.includes("REPLACE_ME")) {
    throw new Error(
      "Shopify token missing. Set SHOPIFY_ADMIN_ACCESS_TOKEN (or SHOPIFY_OAUTH_ACCESS_TOKEN) to a valid Admin API access token from the store app install."
    );
  }
  return token;
}

export async function exchangeShopifyOAuthCode(params: {
  shop: string;
  code: string;
}): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET not configured");
  }

  const res = await fetch(`https://${params.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: params.code,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify OAuth token exchange failed (${res.status}): ${raw}`);
  }

  let json: { access_token?: string };
  try {
    json = JSON.parse(raw) as { access_token?: string };
  } catch {
    throw new Error(`Shopify OAuth token exchange returned non-JSON: ${raw.slice(0, 300)}`);
  }

  if (!json.access_token) {
    throw new Error(`Shopify OAuth token exchange missing access_token: ${raw}`);
  }

  return json.access_token;
}

export async function shopifyGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SHOP) throw new Error("SHOPIFY_SHOP_DOMAIN not set");
  const token = await getAccessToken();
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify GraphQL request failed (${res.status}): ${raw}`);
  }

  let json: { data?: T; errors?: unknown[] };
  try {
    json = JSON.parse(raw) as { data?: T; errors?: unknown[] };
  } catch {
    throw new Error(`Shopify returned non-JSON response: ${raw.slice(0, 300)}`);
  }

  if (json.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}
