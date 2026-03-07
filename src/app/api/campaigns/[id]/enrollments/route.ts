import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, users, campaigns, influencerProfiles, campaignInfluencers } from "@/lib/db";

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return false;

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }
  return role === "admin";
}

function isSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("campaign_influencers") ||
    lowered.includes("influencer_profiles") ||
    lowered.includes("enrollment_status") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { id } = await params;

    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) return new NextResponse("Campaign not found", { status: 404 });

    const rows = await db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        tier: influencerProfiles.tier,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id));

    const enrolledRows = await db
      .select({
        influencerProfileId: campaignInfluencers.influencerProfileId,
      })
      .from(campaignInfluencers)
      .where(eq(campaignInfluencers.campaignId, id));

    const enrolledSet = new Set(enrolledRows.map((row) => row.influencerProfileId));
    const candidates = rows.map((row) => ({
      id: row.id,
      name:
        row.displayName ||
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
        row.email,
      email: row.email,
      tier: row.tier,
      avatarUrl: row.avatarUrl,
      enrolled: enrolledSet.has(row.id),
    }));

    return NextResponse.json(candidates);
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Campaign enrollment schema is missing. Run campaign enrollment DB migrations.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to load enrollment candidates";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      influencerProfileId?: string;
      agreedFee?: number | string | null;
      contentDueDate?: string | null;
      notes?: string | null;
    };

    if (!body.influencerProfileId) return new NextResponse("Influencer is required", { status: 400 });

    const [existing] = await db
      .select({ id: campaignInfluencers.id })
      .from(campaignInfluencers)
      .where(
        and(
          eq(campaignInfluencers.campaignId, id),
          eq(campaignInfluencers.influencerProfileId, body.influencerProfileId)
        )
      )
      .limit(1);
    if (existing) return new NextResponse("Influencer already enrolled in this campaign", { status: 409 });

    const [created] = await db
      .insert(campaignInfluencers)
      .values({
        campaignId: id,
        influencerProfileId: body.influencerProfileId,
        status: "invited",
        agreedFee:
          body.agreedFee !== null && body.agreedFee !== undefined && body.agreedFee !== ""
            ? String(body.agreedFee)
            : null,
        contentDueDate: body.contentDueDate ? new Date(body.contentDueDate) : null,
        notes: body.notes?.trim() || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Campaign enrollment schema is missing. Run campaign enrollment DB migrations.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to enroll influencer";
    return new NextResponse(message, { status: 500 });
  }
}
