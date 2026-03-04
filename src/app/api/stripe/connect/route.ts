import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createStripeConnectAccount, createStripeOnboardingLink } from "@/lib/stripe/connect";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) return new NextResponse("User not found", { status: 404 });

  const [profile] = await db
    .select({ id: influencerProfiles.id, stripeAccountId: influencerProfiles.stripeAccountId })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) return new NextResponse("Profile not found", { status: 404 });

  let stripeAccountId = profile.stripeAccountId;

  if (!stripeAccountId) {
    const account = await createStripeConnectAccount(profile.id, user.email);
    stripeAccountId = account.id;
  }

  const onboardingUrl = await createStripeOnboardingLink(stripeAccountId);

  return NextResponse.json({ url: onboardingUrl });
}
