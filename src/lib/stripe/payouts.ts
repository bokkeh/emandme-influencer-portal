import { assertStripeConfigured, stripe } from "./client";
import { db, payments, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function triggerInfluencerPayout(paymentId: string) {
  assertStripeConfigured();

  const [payment] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      description: payments.description,
      stripeAccountId: influencerProfiles.stripeAccountId,
      stripePayoutsEnabled: influencerProfiles.stripePayoutsEnabled,
    })
    .from(payments)
    .innerJoin(
      influencerProfiles,
      eq(payments.influencerProfileId, influencerProfiles.id)
    )
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "pending") throw new Error("Only pending payments can be sent.");
  if (!payment.stripeAccountId) throw new Error("Influencer has no Stripe account connected");
  if (!payment.stripePayoutsEnabled) throw new Error("Influencer Stripe payouts not enabled");

  const amountInCents = Math.round(Number(payment.amount) * 100);

  const transfer = await stripe.transfers.create({
    amount: amountInCents,
    currency: payment.currency,
    destination: payment.stripeAccountId,
    description: payment.description ?? `Em & Me Studio payment — ${paymentId}`,
    metadata: { paymentId },
  });

  await db
    .update(payments)
    .set({
      status: "paid",
      stripeTransferId: transfer.id,
      paidAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  return transfer;
}
