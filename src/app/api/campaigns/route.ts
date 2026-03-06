import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, campaigns, users } from "@/lib/db";
import { eq } from "drizzle-orm";

function isSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("campaigns") ||
    lowered.includes("campaign_status") ||
    lowered.includes("platform") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

export async function GET() {
  try {
    const allCampaigns = await db.select().from(campaigns).orderBy(campaigns.createdAt);
    return NextResponse.json(allCampaigns);
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Campaign database tables are missing. Run campaign DB migrations and redeploy.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return new NextResponse("Forbidden", { status: 403 });

    let role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== "admin") {
      const [dbUserRole] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.clerkUserId, userId))
        .limit(1);
      role = dbUserRole?.role;
    }
    if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

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
        platforms: Array.isArray(platforms) ? platforms : [],
        hubspotDealId: hubspotDealId || null,
        status: "draft",
        createdByUserId: user?.id ?? null,
      })
      .returning();

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Campaign database schema is incomplete. Run campaign DB migrations and try again.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return new NextResponse(message, { status: 500 });
  }
}
