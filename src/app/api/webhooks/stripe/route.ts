import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import { db, influencerProfiles, payments, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleChat } from "@/lib/notifications/google-chat";
import { sendEmail } from "@/lib/email";
import { paymentFailedEmailHtml } from "@/lib/email/templates";

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    const status = account.payouts_enabled ? "active" :
      account.details_submitted ? "pending" :
      "not_connected";

    await db
      .update(influencerProfiles)
      .set({
        stripeAccountStatus: status as "active" | "pending" | "not_connected",
        stripeDetailsSubmitted: account.details_submitted,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
        updatedAt: new Date(),
      })
      .where(eq(influencerProfiles.stripeAccountId, account.id));
  }

  if ((event.type as string) === "transfer.failed") {
    const transfer = event.data.object as { metadata?: { paymentId?: string }; amount?: number; failure_message?: string };
    const paymentId = transfer.metadata?.paymentId;
    if (paymentId) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
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
        String((transfer.amount ?? 0) / 100),
        transfer.failure_message ?? undefined
      );

      if (payment?.userEmail) {
        sendEmail({
          to: payment.userEmail,
          subject: "Payment issue — action required",
          html: paymentFailedEmailHtml({
            firstName: payment.userFirstName,
            amount: transfer.amount ?? 0,
            currency: "usd",
            reason: transfer.failure_message ?? null,
          }),
        }).catch(console.error);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
