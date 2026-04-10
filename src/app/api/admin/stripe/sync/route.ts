import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, influencerProfiles, users } from "@/lib/db";
import { getStripeAccountStatus } from "@/lib/stripe/connect";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };
  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const { influencerProfileId } = (await req.json()) as { influencerProfileId: string };
  if (!influencerProfileId) return new NextResponse("influencerProfileId required", { status: 400 });

  const [profile] = await db
    .select({ id: influencerProfiles.id, stripeAccountId: influencerProfiles.stripeAccountId })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);

  if (!profile) return new NextResponse("Profile not found", { status: 404 });
  if (!profile.stripeAccountId) {
    return NextResponse.json({ stripeAccountStatus: "not_connected", stripePayoutsEnabled: false });
  }

  try {
    const status = await getStripeAccountStatus(profile.stripeAccountId);
    const stripeAccountStatus = status.stripeAccountStatus;

    await db
      .update(influencerProfiles)
      .set({
        stripeAccountStatus,
        stripeDetailsSubmitted: status.detailsSubmitted,
        stripePayoutsEnabled: status.payoutsEnabled ?? false,
        updatedAt: new Date(),
      })
      .where(eq(influencerProfiles.id, profile.id));

    return NextResponse.json({
      stripeAccountStatus,
      stripePayoutsEnabled: status.payoutsEnabled ?? false,
      stripeDetailsSubmitted: status.detailsSubmitted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Stripe status";
    return new NextResponse(message, { status: 500 });
  }
}
