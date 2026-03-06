import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, discountCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { deactivateShopifyDiscountCode } from "@/lib/shopify/discount-codes";

async function resolveAdminUserId() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, userId: null };

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
  return { ok: role === "admin" || isAllowlisted, userId };
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await resolveAdminUserId();
    if (!guard.userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!guard.ok) return new NextResponse("Forbidden", { status: 403 });

    const { id } = await params;
    if (!id) return new NextResponse("Missing discount code id", { status: 400 });

    const [code] = await db
      .select({
        id: discountCodes.id,
        shopifyPriceRuleId: discountCodes.shopifyPriceRuleId,
      })
      .from(discountCodes)
      .where(eq(discountCodes.id, id))
      .limit(1);

    if (!code) return new NextResponse("Discount code not found", { status: 404 });

    if (code.shopifyPriceRuleId) {
      await deactivateShopifyDiscountCode(code.shopifyPriceRuleId);
    }

    await db.delete(discountCodes).where(eq(discountCodes.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete discount code";
    const status = /forbidden|unauthorized/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
