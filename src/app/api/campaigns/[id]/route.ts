import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, campaigns, users } from "@/lib/db";

type CampaignBriefContent = {
  contentLibraryMedia?: Array<{ url: string; fileType: "image" | "video"; name?: string }>;
  copySnippets?: string[];
  heroImageUrl?: string;
  campaignOverview?: string;
  brandIntroduction?: string;
  campaignGoals?: string;
  deliverables?: string;
  creativeDirection?: string;
  keyProductPoints?: string;
  messagingGuidelines?: string;
  visualGuidelines?: string;
  taggingHashtags?: string;
  linkDiscountCode?: string;
  timeline?: string;
  ftcDisclosure?: string;
  dosAndDonts?: string;
};

function createBriefShareToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${Date.now().toString(36)}`.slice(0, 48);
}

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string | null;
      briefUrl?: string | null;
      briefContent?: CampaignBriefContent | null;
      products?: Array<{
        shopifyProductId: string;
        title: string;
        imageUrl?: string;
        imageUrls?: string[];
        variantId?: string;
      }> | null;
      campaignType?: "influencer" | "ugc" | "affiliate";
      platforms?: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog"> | null;
      status?: "draft" | "active" | "paused" | "completed" | "cancelled";
      totalBudget?: number | string | null;
      startDate?: string | null;
      endDate?: string | null;
    };

    const [existing] = await db
      .select({ briefShareToken: campaigns.briefShareToken })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    if (!existing) return new NextResponse("Campaign not found", { status: 404 });

    const shouldEnsureShareToken =
      body.briefUrl !== undefined || body.description !== undefined || body.briefContent !== undefined;
    const briefShareToken =
      shouldEnsureShareToken && !existing.briefShareToken ? createBriefShareToken() : undefined;

    const setValues = {
      title: body.title?.trim() ? body.title.trim() : undefined,
      description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
      briefUrl: body.briefUrl !== undefined ? (body.briefUrl?.trim() || null) : undefined,
      briefContent: body.briefContent !== undefined ? body.briefContent ?? {} : undefined,
      products: body.products !== undefined ? body.products ?? [] : undefined,
      campaignType:
        body.campaignType !== undefined
          ? body.campaignType === "ugc" || body.campaignType === "affiliate"
            ? body.campaignType
            : "influencer"
          : undefined,
      platforms: body.platforms !== undefined ? body.platforms ?? [] : undefined,
      briefShareToken,
      status: body.status,
      totalBudget:
        body.totalBudget !== undefined
          ? body.totalBudget !== null && body.totalBudget !== ""
            ? String(body.totalBudget)
            : null
          : undefined,
      startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      updatedAt: new Date(),
    };

    const [updated] = await db.update(campaigns).set(setValues).where(eq(campaigns.id, id)).returning();
    if (!updated) return new NextResponse("Campaign not found", { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return new NextResponse(message, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning({ id: campaigns.id });

    if (!deleted) return new NextResponse("Campaign not found", { status: 404 });
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete campaign";
    return new NextResponse(message, { status: 500 });
  }
}
