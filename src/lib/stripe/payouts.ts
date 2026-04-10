import { assertStripeConfigured, stripe } from "./client";
import { db, payments, influencerProfiles, users } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { paymentSentEmailHtml } from "@/lib/email/templates";

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
      userEmail: users.email,
      userFirstName: users.firstName,
    })
    .from(payments)
    .innerJoin(influencerProfiles, eq(payments.influencerProfileId, influencerProfiles.id))
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) throw new Error("Payment not found");
  if (!payment.stripeAccountId) throw new Error("Influencer has no Stripe account connected");
  if (!payment.stripePayoutsEnabled) throw new Error("Influencer Stripe payouts not enabled");
  if (payment.status !== "pending") {
    if (payment.status === "processing") throw new Error("Payout is already being processed.");
    throw new Error(`Payment cannot be sent from status "${payment.status}".`);
  }

  const amountInCents = Math.round(Number(payment.amount) * 100);
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  const claimed = await db
    .update(payments)
    .set({
      status: "processing",
      updatedAt: new Date(),
      stripeFailureReason: null,
    })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning({ id: payments.id });

  if (claimed.length === 0) {
    throw new Error("Payment status changed before payout could be sent. Refresh and try again.");
  }

  const idempotencyKey = `influencer_payout_${paymentId}`;

  let transfer;
  try {
    transfer = await stripe.transfers.create(
      {
        amount: amountInCents,
        currency: payment.currency,
        destination: payment.stripeAccountId,
        description: payment.description ?? `Em & Me Studio payment - ${paymentId}`,
        metadata: { paymentId },
      },
      { idempotencyKey }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Stripe transfer failed";

    await db
      .update(payments)
      .set({
        status: "failed",
        stripeFailureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    throw error;
  }

  await db
    .update(payments)
    .set({
      status: "paid",
      stripeTransferId: transfer.id,
      stripeFailureReason: null,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  // Send payment confirmation email (fire-and-forget)
  sendEmail({
    to: payment.userEmail,
    subject: "Your payment from Em & Me Studio",
    html: paymentSentEmailHtml({
      firstName: payment.userFirstName,
      amount: amountInCents,
      currency: payment.currency,
      description: payment.description,
    }),
  }).catch(console.error);

  return transfer;
}
