import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles, utmLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { buildUTMUrl } from "@/lib/utm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const {
    influencerProfileId,
    campaignId,
    baseUrl,
    platform,
    contentType,
    campaignSlug,
    label,
    influencerHandle,
  } = body;

  if (!influencerProfileId || !baseUrl || !platform || !influencerHandle) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  const utm = buildUTMUrl({
    baseUrl,
    influencerHandle,
    platform,
    contentType,
    campaignSlug,
    label,
  });

  const [link] = await db
    .insert(utmLinks)
    .values({
      influencerProfileId,
      campaignId: campaignId ?? null,
      label: label ?? null,
      baseUrl,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmContent: utm.utmContent,
      utmTerm: utm.utmTerm || null,
      fullUrl: utm.fullUrl,
      createdByUserId: user?.id ?? null,
    })
    .returning();

  return NextResponse.json(link);
}
