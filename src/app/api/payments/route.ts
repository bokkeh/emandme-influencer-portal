import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, payments, users } from "@/lib/db";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }

  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const body = await req.json();
    const { influencerProfileId, campaignId, amount, paymentType, description, dueDate } = body;

    if (!influencerProfileId || amount === null || amount === undefined || !paymentType) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new NextResponse("Amount must be greater than 0", { status: 400 });
    }

    const [payment] = await db
      .insert(payments)
      .values({
        influencerProfileId,
        campaignId: campaignId ?? null,
        amount: String(numericAmount),
        currency: "usd",
        paymentType,
        description: description ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "pending",
      })
      .returning();

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return new NextResponse(message, { status: 500 });
  }
}
