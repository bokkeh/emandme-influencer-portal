import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, discountCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createShopifyDiscountCode } from "@/lib/shopify/discount-codes";

async function resolveAdminUserId() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, userId: null };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }

  // Last fallback: read current Clerk metadata directly (session claims can be stale).
  if (role !== "admin") {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const metadataRole = (clerkUser.publicMetadata as { role?: string } | null)?.role;
      role = metadataRole;
    } catch {
      // no-op; keep previous role value
    }
  }

  return { ok: role === "admin", userId };
}

export async function POST(req: Request) {
  const guard = await resolveAdminUserId();
  if (!guard.userId) return new NextResponse("Unauthorized", { status: 401 });
  if (!guard.ok) return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const {
    influencerProfileId,
    campaignId,
    code,
    discountType,
    discountValue,
    usageLimit,
    expiresAt,
  } = body;

  if (!influencerProfileId || !code || !discountType || discountValue === undefined) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // Create in Shopify
  const shopifyResult = await createShopifyDiscountCode({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    usageLimit,
    endsAt: expiresAt,
  });

  // Save to DB
  const [saved] = await db
    .insert(discountCodes)
    .values({
      influencerProfileId,
      campaignId: campaignId ?? null,
      code: shopifyResult.code,
      shopifyPriceRuleId: shopifyResult.shopifyPriceRuleId,
      shopifyDiscountCodeId: shopifyResult.shopifyDiscountCodeId,
      discountType,
      discountValue: String(discountValue),
      usageLimit: usageLimit ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  return NextResponse.json(saved);
}
