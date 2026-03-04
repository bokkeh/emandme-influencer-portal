import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, discountCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createShopifyDiscountCode } from "@/lib/shopify/discount-codes";

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

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

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

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
