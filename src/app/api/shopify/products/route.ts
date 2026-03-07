import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { shopifyGraphQL } from "@/lib/shopify/client";

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  let email: string | undefined;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role, email: users.email })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
    email = dbUser?.email ?? undefined;
  }

  if (role !== "admin") {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const publicRole = (clerkUser.publicMetadata as { role?: string } | null)?.role;
      const privateRole = (clerkUser.privateMetadata as { role?: string } | null)?.role;
      role = publicRole ?? privateRole ?? role;
      email =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        email;
    } catch {
      // no-op
    }
  }

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const isAllowlisted = email ? allowlist.includes(email.toLowerCase()) : false;

  if (role !== "admin" && !isAllowlisted) return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

type ShopifyProductsQuery = {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        featuredImage: { url: string } | null;
        variants: {
          edges: Array<{ node: { id: string; title: string } }>;
        };
      };
    }>;
  };
};

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const queryFilter = q ? `title:*${q.replaceAll('"', "")}*` : "";

    const data = await shopifyGraphQL<ShopifyProductsQuery>(
      `
        query SearchProducts($first: Int!, $query: String) {
          products(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
            edges {
              node {
                id
                title
                handle
                featuredImage {
                  url
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { first: 20, query: queryFilter || undefined }
    );

    const products = data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      imageUrl: node.featuredImage?.url ?? null,
      variantId: node.variants.edges[0]?.node.id ?? null,
    }));

    return NextResponse.json(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Shopify products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

