import { assertStripeConfigured, stripe } from "./client";
import { db, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

type StripeAccountStatus = "not_connected" | "pending" | "active" | "restricted" | "disabled";

export function mapStripeAccountStatus(account: Stripe.Account): StripeAccountStatus {
  if (account.payouts_enabled) return "active";
  if (account.requirements?.disabled_reason) return "disabled";
  if (account.details_submitted) return "restricted";
  return "pending";
}

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
  const stripeAccountStatus = mapStripeAccountStatus(account);

  return {
    stripeAccountStatus,
    detailsSubmitted: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
    disabledReason: account.requirements?.disabled_reason ?? null,
  };
}
