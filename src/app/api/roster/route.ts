import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, influencerRoster, influencerRosterActivities, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { ROSTER_PLATFORMS, ROSTER_STATUSES, type RosterPlatform, type RosterStatus } from "@/types/roster";

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

function isMissingOptionalColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("avatar_url") || lowered.includes("portfolio_url");
}

async function resolveAdminUserId() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, userId: null };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }

  return { ok: role === "admin", userId };
}

export async function GET() {
  const guard = await resolveAdminUserId();
  if (!guard.ok) return new NextResponse("Forbidden", { status: 403 });

  const rows = await db.select().from(influencerRoster).orderBy(desc(influencerRoster.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const guard = await resolveAdminUserId();
  if (!guard.ok || !guard.userId) return new NextResponse("Forbidden", { status: 403 });

  const body = (await req.json()) as Record<string, unknown>;
  const fullName = asText(body.fullName);
  if (!fullName) return new NextResponse("Full name is required", { status: 400 });

  const platform = asText(body.platform)?.toLowerCase() as RosterPlatform | null;
  const status = asText(body.status)?.toLowerCase().replace(" ", "_") as RosterStatus | null;
  const engagementRate = asNumber(body.engagementRate);
  const lastContactedAt = asText(body.lastContactedAt);
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, guard.userId))
    .limit(1);

  try {
    const values = {
      fullName,
      handle: asText(body.handle),
      platform: platform && ROSTER_PLATFORMS.includes(platform) ? platform : "instagram",
      profileUrl: asText(body.profileUrl),
      portfolioUrl: asText(body.portfolioUrl),
      avatarUrl: asText(body.avatarUrl),
      email: asText(body.email),
      phone: asText(body.phone),
      manager: asText(body.manager),
      niche: asText(body.niche),
      location: asText(body.location),
      audienceNotes: asText(body.audienceNotes),
      followerCount: asNumber(body.followerCount) ?? 0,
      engagementRate: engagementRate !== null ? String(engagementRate) : null,
      avgViews: asNumber(body.avgViews),
      contentStyleNotes: asText(body.contentStyleNotes),
      brandFitScore: asNumber(body.brandFitScore),
      status: status && ROSTER_STATUSES.includes(status) ? status : "prospect",
      tags: asTags(body.tags),
      internalNotes: asText(body.internalNotes),
      pricingNotes: asText(body.pricingNotes),
      lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null,
      campaignHistory: Array.isArray(body.campaignHistory) ? body.campaignHistory : [],
      deliverablesCompleted: Array.isArray(body.deliverablesCompleted)
        ? body.deliverablesCompleted
        : [],
    };

    let created: (typeof influencerRoster.$inferSelect) | undefined;
    try {
      [created] = await db.insert(influencerRoster).values(values).returning();
    } catch (error) {
      if (!isMissingOptionalColumnError(error)) throw error;
      const legacyValues = {
        fullName: values.fullName,
        handle: values.handle,
        platform: values.platform,
        profileUrl: values.profileUrl,
        email: values.email,
        phone: values.phone,
        manager: values.manager,
        niche: values.niche,
        location: values.location,
        audienceNotes: values.audienceNotes,
        followerCount: values.followerCount,
        engagementRate: values.engagementRate,
        avgViews: values.avgViews,
        contentStyleNotes: values.contentStyleNotes,
        brandFitScore: values.brandFitScore,
        status: values.status,
        tags: values.tags,
        internalNotes: values.internalNotes,
        pricingNotes: values.pricingNotes,
        lastContactedAt: values.lastContactedAt,
        campaignHistory: values.campaignHistory,
        deliverablesCompleted: values.deliverablesCompleted,
      };
      [created] = await db.insert(influencerRoster).values(legacyValues).returning();
    }

    if (!created) return new NextResponse("Failed to create profile", { status: 500 });

    await db.insert(influencerRosterActivities).values({
      rosterId: created.id,
      type: "system",
      note: "Influencer profile added to roster",
      createdByUserId: adminUser?.id ?? null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected roster create error";
    return new NextResponse(message, { status: 500 });
  }
}
