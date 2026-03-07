import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncInfluencerToHubSpot } from "@/lib/hubspot/sync";
import { db, influencerProfiles, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

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

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  return NextResponse.json({
    configured: Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN),
    hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const body = (await req.json().catch(() => ({}))) as { influencerProfileId?: string };
    let influencerProfileId = body.influencerProfileId;

    if (!influencerProfileId) {
      const [latestProfile] = await db
        .select({ id: influencerProfiles.id })
        .from(influencerProfiles)
        .orderBy(desc(influencerProfiles.updatedAt))
        .limit(1);
      influencerProfileId = latestProfile?.id;
    }

    if (!influencerProfileId) return new NextResponse("No influencer profiles found to sync", { status: 400 });

    const result = await syncInfluencerToHubSpot({ influencerProfileId });
    if (!result?.success) {
      return new NextResponse("Influencer profile not found", { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "HubSpot sync failed";
    return new NextResponse(message, { status: 500 });
  }
}
