import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, campaigns, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const allCampaigns = await db.select().from(campaigns).orderBy(campaigns.createdAt);
  return NextResponse.json(allCampaigns);
}

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const { title, description, totalBudget, startDate, endDate, platforms, hubspotDealId } = body;

  if (!title) return new NextResponse("Title required", { status: 400 });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  const [campaign] = await db
    .insert(campaigns)
    .values({
      title,
      description: description || null,
      totalBudget: totalBudget ? String(totalBudget) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      platforms: platforms ?? [],
      hubspotDealId: hubspotDealId || null,
      status: "draft",
      createdByUserId: user?.id ?? null,
    })
    .returning();

  return NextResponse.json(campaign, { status: 201 });
}
