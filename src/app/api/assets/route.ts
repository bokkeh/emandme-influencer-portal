import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, assets, influencerProfiles, users, campaigns } from "@/lib/db";
import { googleChat } from "@/lib/notifications/google-chat";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const {
    influencerProfileId,
    campaignId,
    blobUrl,
    fileType,
    fileSizeMb,
    platform,
    contentType,
    title,
    caption,
    postUrl,
  } = body;

  if (!influencerProfileId || !blobUrl || !fileType) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const [saved] = await db
    .insert(assets)
    .values({
      influencerProfileId,
      campaignId: campaignId ?? null,
      blobUrl,
      fileType,
      fileSizeMb: fileSizeMb ? String(fileSizeMb) : null,
      contentType: contentType ?? null,
      platform: platform ?? null,
      title: title ?? null,
      caption: caption ?? null,
      postUrl: postUrl ?? null,
      status: "pending_review",
    })
    .returning();

  const [influencer] = await db
    .select({
      displayName: influencerProfiles.displayName,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);

  const [campaign] = campaignId
    ? await db
        .select({ title: campaigns.title })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1)
    : [];

  const influencerName =
    (influencer?.displayName ?? "").trim() ||
    `${influencer?.firstName ?? ""} ${influencer?.lastName ?? ""}`.trim() ||
    influencer?.email ||
    "Unknown Creator";

  const campaignTitle = campaign?.title ?? "Portal Upload";

  await googleChat.assetSubmitted(
    influencerName,
    campaignTitle,
    platform ?? "unknown"
  );

  return NextResponse.json(saved, { status: 201 });
}
