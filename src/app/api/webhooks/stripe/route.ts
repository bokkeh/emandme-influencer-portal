import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { db, influencerProfiles, payments, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleChat } from "@/lib/notifications/google-chat";
import { sendEmail } from "@/lib/email";
import { paymentFailedEmailHtml } from "@/lib/email/templates";
import { mapStripeAccountStatus } from "@/lib/stripe/connect";

type TransferWithFailure = Stripe.Transfer & {
  failure_message?: string | null;
};

async function handleTransferFailure(params: {
  paymentId: string;
  amountInCents: number;
  currency: string;
  transferId?: string;
  failureMessage?: string | null;
}) {
  const { paymentId, amountInCents, currency, transferId, failureMessage } = params;

  await db
    .update(payments)
    .set({
      status: "failed",
      stripeTransferId: transferId ?? null,
      stripeFailureReason: failureMessage ?? "Stripe transfer failed",
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  const [payment] = await db
    .select({
      influencerName: influencerProfiles.displayName,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(payments)
    .innerJoin(influencerProfiles, eq(payments.influencerProfileId, influencerProfiles.id))
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(payments.id, paymentId))
    .limit(1);

  const influencerName =
    (payment?.influencerName ?? "").trim() ||
    `${payment?.userFirstName ?? ""} ${payment?.userLastName ?? ""}`.trim() ||
    payment?.userEmail ||
    "Unknown Creator";

  await googleChat.paymentFailed(
    influencerName,
    String(amountInCents / 100),
    failureMessage ?? undefined
  );

  if (payment?.userEmail) {
    sendEmail({
      to: payment.userEmail,
      subject: "Payment issue - action required",
      html: paymentFailedEmailHtml({
        firstName: payment.userFirstName,
        amount: amountInCents,
        currency,
        reason: failureMessage ?? null,
      }),
    }).catch(console.error);
  }
}

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const stripeAccountStatus = mapStripeAccountStatus(account);

    await db
      .update(influencerProfiles)
      .set({
        stripeAccountStatus,
        stripeDetailsSubmitted: account.details_submitted,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
        updatedAt: new Date(),
      })
      .where(eq(influencerProfiles.stripeAccountId, account.id));
  }

  if (event.type === "transfer.created") {
    const transfer = event.data.object as Stripe.Transfer;
    const paymentId = transfer.metadata?.paymentId;

    if (paymentId) {
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
    }
  }

  if ((event.type as string) === "transfer.failed") {
    const transfer = event.data.object as TransferWithFailure;
    const paymentId = transfer.metadata?.paymentId;

    if (paymentId) {
      await handleTransferFailure({
        paymentId,
        amountInCents: transfer.amount ?? 0,
        currency: transfer.currency ?? "usd",
        transferId: transfer.id,
        failureMessage: transfer.failure_message,
      });
    }
  }

  if ((event.type as string) === "transfer.reversed") {
    const transfer = event.data.object as Stripe.Transfer;
    const paymentId = transfer.metadata?.paymentId;

    if (paymentId) {
      await handleTransferFailure({
        paymentId,
        amountInCents: transfer.amount_reversed ?? transfer.amount ?? 0,
        currency: transfer.currency ?? "usd",
        transferId: transfer.id,
        failureMessage: "Transfer reversed by Stripe.",
      });
    }
  }

  return new Response("OK", { status: 200 });
}
