import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { triggerInfluencerPayout } from "@/lib/stripe/payouts";
import { googleChat } from "@/lib/notifications/google-chat";
import { db, payments, influencerProfiles, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;

  try {
    const transfer = await triggerInfluencerPayout(id);

    // Lookup payment info for notification
    const [payment] = await db
      .select({
        amount: payments.amount,
        currency: payments.currency,
        influencerName: influencerProfiles.displayName,
        userEmail: users.email,
      })
      .from(payments)
      .innerJoin(influencerProfiles, eq(payments.influencerProfileId, influencerProfiles.id))
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .where(eq(payments.id, id))
      .limit(1);

    if (payment) {
      await googleChat.paymentProcessed(
        payment.influencerName ?? payment.userEmail,
        Number(payment.amount).toFixed(2),
        payment.currency
      );
    }

    return NextResponse.json({ transferId: transfer.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(message, { status: 400 });
  }
}
