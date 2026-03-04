import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, assets } from "@/lib/db";
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

  // Notify Google Chat
  await googleChat.assetSubmitted(
    "Influencer",
    "Portal Upload",
    platform ?? "unknown"
  );

  return NextResponse.json(saved, { status: 201 });
}
