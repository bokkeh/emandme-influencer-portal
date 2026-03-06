import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, influencerRoster, influencerRosterActivities, users } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
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

function asTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await resolveAdminUserId();
  if (!guard.ok) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const [profile] = await db.select().from(influencerRoster).where(eq(influencerRoster.id, id)).limit(1);
  if (!profile) return new NextResponse("Not found", { status: 404 });

  const activities = await db
    .select()
    .from(influencerRosterActivities)
    .where(eq(influencerRosterActivities.rosterId, id))
    .orderBy(desc(influencerRosterActivities.createdAt));

  return NextResponse.json({ profile, activities });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await resolveAdminUserId();
  if (!guard.ok || !guard.userId) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const platform = asText(body.platform)?.toLowerCase() as RosterPlatform | null;
  const status = asText(body.status)?.toLowerCase().replace(" ", "_") as RosterStatus | null;
  const tags = asTags(body.tags);
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, guard.userId))
    .limit(1);

  const followerCount = asNumber(body.followerCount);
  const engagementRate = asNumber(body.engagementRate);
  const avgViews = asNumber(body.avgViews);
  const brandFitScore = asNumber(body.brandFitScore);
  const hasFollowerCount = Object.hasOwn(body, "followerCount");
  const hasEngagementRate = Object.hasOwn(body, "engagementRate");
  const hasAvgViews = Object.hasOwn(body, "avgViews");
  const hasBrandFitScore = Object.hasOwn(body, "brandFitScore");

  try {
    const setValues = {
      fullName: asText(body.fullName) ?? undefined,
      handle: body.handle !== undefined ? asText(body.handle) : undefined,
      platform:
        platform && ROSTER_PLATFORMS.includes(platform)
          ? platform
          : body.platform !== undefined
            ? undefined
            : undefined,
      profileUrl: body.profileUrl !== undefined ? asText(body.profileUrl) : undefined,
      portfolioUrl: body.portfolioUrl !== undefined ? asText(body.portfolioUrl) : undefined,
      avatarUrl: body.avatarUrl !== undefined ? asText(body.avatarUrl) : undefined,
      email: body.email !== undefined ? asText(body.email) : undefined,
      phone: body.phone !== undefined ? asText(body.phone) : undefined,
      manager: body.manager !== undefined ? asText(body.manager) : undefined,
      niche: body.niche !== undefined ? asText(body.niche) : undefined,
      location: body.location !== undefined ? asText(body.location) : undefined,
      audienceNotes: body.audienceNotes !== undefined ? asText(body.audienceNotes) : undefined,
      followerCount: hasFollowerCount ? followerCount ?? 0 : undefined,
      engagementRate: hasEngagementRate ? (engagementRate !== null ? String(engagementRate) : null) : undefined,
      avgViews: hasAvgViews ? avgViews : undefined,
      contentStyleNotes:
        body.contentStyleNotes !== undefined ? asText(body.contentStyleNotes) : undefined,
      brandFitScore: hasBrandFitScore ? brandFitScore : undefined,
      status:
        status && ROSTER_STATUSES.includes(status)
          ? status
          : body.status !== undefined
            ? undefined
            : undefined,
      tags,
      internalNotes: body.internalNotes !== undefined ? asText(body.internalNotes) : undefined,
      pricingNotes: body.pricingNotes !== undefined ? asText(body.pricingNotes) : undefined,
      lastContactedAt:
        body.lastContactedAt !== undefined
          ? asText(body.lastContactedAt)
            ? new Date(asText(body.lastContactedAt)!)
            : null
          : undefined,
      campaignHistory: Array.isArray(body.campaignHistory) ? body.campaignHistory : undefined,
      deliverablesCompleted: Array.isArray(body.deliverablesCompleted)
        ? body.deliverablesCompleted
        : undefined,
      updatedAt: new Date(),
    };

    let updated: (typeof influencerRoster.$inferSelect) | undefined;
    try {
      [updated] = await db.update(influencerRoster).set(setValues).where(eq(influencerRoster.id, id)).returning();
    } catch (error) {
      if (!isMissingOptionalColumnError(error)) throw error;
      const legacySetValues = {
        fullName: setValues.fullName,
        handle: setValues.handle,
        platform: setValues.platform,
        profileUrl: setValues.profileUrl,
        email: setValues.email,
        phone: setValues.phone,
        manager: setValues.manager,
        niche: setValues.niche,
        location: setValues.location,
        audienceNotes: setValues.audienceNotes,
        followerCount: setValues.followerCount,
        engagementRate: setValues.engagementRate,
        avgViews: setValues.avgViews,
        contentStyleNotes: setValues.contentStyleNotes,
        brandFitScore: setValues.brandFitScore,
        status: setValues.status,
        tags: setValues.tags,
        internalNotes: setValues.internalNotes,
        pricingNotes: setValues.pricingNotes,
        lastContactedAt: setValues.lastContactedAt,
        campaignHistory: setValues.campaignHistory,
        deliverablesCompleted: setValues.deliverablesCompleted,
        updatedAt: setValues.updatedAt,
      };
      [updated] = await db.update(influencerRoster).set(legacySetValues).where(eq(influencerRoster.id, id)).returning();
    }

    if (!updated) return new NextResponse("Not found", { status: 404 });

    const activityNote = asText(body.activityNote);
    if (activityNote) {
      await db.insert(influencerRosterActivities).values({
        rosterId: id,
        note: activityNote,
        type: asText(body.activityType) ?? "note",
        createdByUserId: adminUser?.id ?? null,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected roster update error";
    return new NextResponse(message, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await resolveAdminUserId();
  if (!guard.ok || !guard.userId) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const [updated] = await db
    .update(influencerRoster)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(influencerRoster.id, id))
    .returning();

  if (!updated) return new NextResponse("Not found", { status: 404 });

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, guard.userId))
    .limit(1);

  await db.insert(influencerRosterActivities).values({
    rosterId: id,
    note: "Influencer archived",
    type: "status_change",
    createdByUserId: adminUser?.id ?? null,
  });

  return NextResponse.json(updated);
}
