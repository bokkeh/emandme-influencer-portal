import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import { db, influencerProfiles, payments } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleChat } from "@/lib/notifications/google-chat";

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

      await googleChat.paymentFailed("Influencer", String((transfer.amount ?? 0) / 100), transfer.failure_message ?? undefined);
    }
  }

  return new Response("OK", { status: 200 });
}
