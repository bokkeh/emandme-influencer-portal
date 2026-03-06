import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { exchangeShopifyOAuthCode } from "@/lib/shopify/client";

function normalizeShop(raw?: string | null): string | null {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return null;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) return null;
  return value;
}

function computeHmac(url: URL, secret: string): string {
  const pairs: string[] = [];
  const entries = Array.from(url.searchParams.entries()).filter(([key]) => key !== "hmac" && key !== "signature");
  entries.sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    pairs.push(`${key}=${value}`);
  }
  const message = pairs.join("&");
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: NextRequest) {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientSecret) return new NextResponse("SHOPIFY_CLIENT_SECRET not configured", { status: 500 });

  const url = new URL(req.url);
  const shop = normalizeShop(url.searchParams.get("shop"));
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const hmac = url.searchParams.get("hmac")?.trim();
  const cookieState = req.cookies.get("shopify_oauth_state")?.value;

  if (!shop || !code || !state || !hmac) {
    return new NextResponse("Missing required Shopify OAuth parameters", { status: 400 });
  }
  if (!cookieState || cookieState !== state) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  const expectedHmac = computeHmac(url, clientSecret);
  if (!safeEqualHex(hmac, expectedHmac)) {
    return new NextResponse("Invalid OAuth HMAC", { status: 400 });
  }

  try {
    const accessToken = await exchangeShopifyOAuthCode({ shop, code });
    const body = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shopify Connected</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; line-height: 1.5; }
      .ok { color: #166534; font-weight: 700; }
      code, pre { background: #f3f4f6; padding: .2rem .4rem; border-radius: .25rem; }
      pre { padding: 1rem; overflow: auto; }
    </style>
  </head>
  <body>
    <h1 class="ok">Shopify OAuth connected</h1>
    <p>Copy this token into your Vercel Production environment variable <code>SHOPIFY_ADMIN_ACCESS_TOKEN</code> and redeploy:</p>
    <pre>${htmlEscape(accessToken)}</pre>
    <p>Shop: <code>${htmlEscape(shop)}</code></p>
    <p>You can close this window after saving the env var.</p>
  </body>
</html>`;
    const res = new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    res.cookies.delete("shopify_oauth_state");
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to exchange Shopify OAuth code";
    return new NextResponse(message, { status: 500 });
  }
}
