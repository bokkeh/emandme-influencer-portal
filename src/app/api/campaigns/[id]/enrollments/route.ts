import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, like } from "drizzle-orm";
import {
  db,
  users,
  campaigns,
  influencerProfiles,
  campaignInfluencers,
  influencerRoster,
} from "@/lib/db";

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
    lowered.includes("influencer_roster") ||
    lowered.includes("enrollment_status") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

function parseName(fullName: string | null | undefined) {
  const value = (fullName ?? "").trim();
  if (!value) return { firstName: null as string | null, lastName: null as string | null };
  const [first, ...rest] = value.split(/\s+/);
  return {
    firstName: first ?? null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}

async function resolveProfileId(candidateId: string) {
  if (candidateId.startsWith("profile:")) return candidateId.replace("profile:", "");
  if (!candidateId.startsWith("roster:")) return null;

  const rosterId = candidateId.replace("roster:", "");
  const [roster] = await db
    .select({
      id: influencerRoster.id,
      fullName: influencerRoster.fullName,
      email: influencerRoster.email,
      niche: influencerRoster.niche,
      audienceNotes: influencerRoster.audienceNotes,
      influencerTier: influencerRoster.influencerTier,
      creatorType: influencerRoster.creatorType,
      internalNotes: influencerRoster.internalNotes,
    })
    .from(influencerRoster)
    .where(eq(influencerRoster.id, rosterId))
    .limit(1);
  if (!roster) return null;

  const syntheticClerkUserId = `roster_${roster.id}`;
  const fallbackEmail = `roster_${roster.id}@placeholder.local`;
  const { firstName, lastName } = parseName(roster.fullName);

  let userId: string | null = null;
  if (roster.email) {
    const [existingByEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, roster.email)).limit(1);
    userId = existingByEmail?.id ?? null;
  }
  if (!userId) {
    const [existingBySynthetic] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, syntheticClerkUserId))
      .limit(1);
    userId = existingBySynthetic?.id ?? null;
  }
  if (!userId) {
    const [createdUser] = await db
      .insert(users)
      .values({
        clerkUserId: syntheticClerkUserId,
        email: roster.email ?? fallbackEmail,
        firstName,
        lastName,
        role: roster.creatorType === "ugc_creator" ? "ugc_creator" : "influencer",
      })
      .returning({ id: users.id });
    userId = createdUser?.id ?? null;
  }
  if (!userId) return null;

  const [existingProfile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, userId))
    .limit(1);
  if (existingProfile) return existingProfile.id;

  const [createdProfile] = await db
    .insert(influencerProfiles)
    .values({
      userId,
      displayName: roster.fullName,
      niche: roster.niche,
      bio: roster.audienceNotes,
      tier: roster.influencerTier,
      notes: roster.internalNotes,
    })
    .returning({ id: influencerProfiles.id });

  return createdProfile?.id ?? null;
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
    const profileByEmail = new Map<string, string>();
    for (const row of rows) {
      if (row.email) profileByEmail.set(row.email.toLowerCase(), row.id);
    }

    const profileCandidates = rows.map((row) => ({
      id: `profile:${row.id}`,
      name:
        row.displayName ||
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
        row.email,
      email: row.email,
      tier: row.tier,
      avatarUrl: row.avatarUrl,
      source: "portal" as const,
      enrolled: enrolledSet.has(row.id),
    }));

    const rosterRows = await db
      .select({
        id: influencerRoster.id,
        fullName: influencerRoster.fullName,
        email: influencerRoster.email,
        influencerTier: influencerRoster.influencerTier,
        avatarUrl: influencerRoster.avatarUrl,
      })
      .from(influencerRoster);

    const syntheticRows = await db
      .select({
        clerkUserId: users.clerkUserId,
        profileId: influencerProfiles.id,
      })
      .from(users)
      .innerJoin(influencerProfiles, eq(influencerProfiles.userId, users.id))
      .where(like(users.clerkUserId, "roster_%"));

    const syntheticProfileByRosterId = new Map<string, string>();
    for (const row of syntheticRows) {
      const rosterId = row.clerkUserId.replace(/^roster_/, "");
      syntheticProfileByRosterId.set(rosterId, row.profileId);
    }

    const rosterCandidates = rosterRows
      .filter((row) => {
        const syntheticProfileId = syntheticProfileByRosterId.get(row.id);
        if (syntheticProfileId) return false;
        if (!row.email) return true;
        return !profileByEmail.has(row.email.toLowerCase());
      })
      .map((row) => ({
        id: `roster:${row.id}`,
        name: row.fullName,
        email: row.email ?? "No email",
        tier: row.influencerTier,
        avatarUrl: row.avatarUrl,
        source: "roster" as const,
        enrolled: row.email ? enrolledSet.has(profileByEmail.get(row.email.toLowerCase()) ?? "") : false,
      }));

    const candidates = [...profileCandidates, ...rosterCandidates].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

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
      candidateId?: string;
      agreedFee?: number | string | null;
      contentDueDate?: string | null;
      notes?: string | null;
    };

    if (!body.candidateId) return new NextResponse("Influencer is required", { status: 400 });
    const influencerProfileId = await resolveProfileId(body.candidateId);
    if (!influencerProfileId) return new NextResponse("Influencer profile could not be resolved", { status: 400 });

    const [existing] = await db
      .select({ id: campaignInfluencers.id })
      .from(campaignInfluencers)
      .where(
        and(
          eq(campaignInfluencers.campaignId, id),
          eq(campaignInfluencers.influencerProfileId, influencerProfileId)
        )
      )
      .limit(1);
    if (existing) return new NextResponse("Influencer already enrolled in this campaign", { status: 409 });

    const [created] = await db
      .insert(campaignInfluencers)
      .values({
        campaignId: id,
        influencerProfileId,
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
