import { assertStripeConfigured, stripe } from "./client";
import { db, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function createStripeConnectAccount(influencerProfileId: string, email: string) {
  assertStripeConfigured();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
  });

  await db
    .update(influencerProfiles)
    .set({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
    })
    .where(eq(influencerProfiles.id, influencerProfileId));

  return account;
}

export async function createStripeOnboardingLink(stripeAccountId: string) {
  assertStripeConfigured();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for Stripe onboarding links.");
  }
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/influencer/profile?stripe=refresh`,
    return_url: `${appUrl}/influencer/profile?stripe=success`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function getStripeAccountStatus(stripeAccountId: string) {
  assertStripeConfigured();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    detailsSubmitted: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
  };
}
