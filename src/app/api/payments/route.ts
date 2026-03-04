import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, payments } from "@/lib/db";

export async function POST(req: Request) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const { influencerProfileId, campaignId, amount, paymentType, description, dueDate } = body;

  if (!influencerProfileId || !amount || !paymentType) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const [payment] = await db
    .insert(payments)
    .values({
      influencerProfileId,
      campaignId: campaignId ?? null,
      amount: String(amount),
      currency: "usd",
      paymentType,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "pending",
    })
    .returning();

  return NextResponse.json(payment, { status: 201 });
}
