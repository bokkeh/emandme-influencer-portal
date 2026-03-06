import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SCOPES = [
  "read_discounts",
  "write_discounts",
  "read_orders",
  "write_orders",
  "read_products",
];

function getAppBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    if (vercel.startsWith("http://") || vercel.startsWith("https://")) {
      return vercel.replace(/\/+$/, "");
    }
    return `https://${vercel.replace(/\/+$/, "")}`;
  }
  return req.nextUrl.origin;
}

function normalizeShop(raw?: string | null): string | null {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return null;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) return null;
  return value;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const shop = normalizeShop(req.nextUrl.searchParams.get("shop") || process.env.SHOPIFY_SHOP_DOMAIN);

  if (!clientId) return new NextResponse("SHOPIFY_CLIENT_ID not configured", { status: 500 });
  if (!shop) return new NextResponse("Missing or invalid ?shop=...myshopify.com", { status: 400 });

  const appBase = getAppBaseUrl(req);
  const redirectUri = `${appBase}/api/shopify/oauth/callback`;
  const scopes = (process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl, { status: 302 });
  res.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
