import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, users, influencerProfiles, campaignInfluencers } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      petName?: string;
      petBreed?: string;
      petAge?: string;
      petPersonality?: string;
      tagPersonalizationText?: string;
    };

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    if (!user) return new NextResponse("User not found", { status: 404 });

    const [profile] = await db
      .select({ id: influencerProfiles.id })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.userId, user.id))
      .limit(1);
    if (!profile) return new NextResponse("Profile not found", { status: 404 });

    if (
      !body.petName?.trim() ||
      !body.petBreed?.trim() ||
      !body.petAge?.trim() ||
      !body.petPersonality?.trim() ||
      !body.tagPersonalizationText?.trim()
    ) {
      return new NextResponse("All pet info fields are required", { status: 400 });
    }

    const [updated] = await db
      .update(campaignInfluencers)
      .set({
        petName: body.petName.trim(),
        petBreed: body.petBreed.trim(),
        petAge: body.petAge.trim(),
        petPersonality: body.petPersonality.trim(),
        tagPersonalizationText: body.tagPersonalizationText.trim(),
        petInfoSubmittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(campaignInfluencers.campaignId, id),
          eq(campaignInfluencers.influencerProfileId, profile.id)
        )
      )
      .returning({
        petName: campaignInfluencers.petName,
        petBreed: campaignInfluencers.petBreed,
        petAge: campaignInfluencers.petAge,
        petPersonality: campaignInfluencers.petPersonality,
        tagPersonalizationText: campaignInfluencers.tagPersonalizationText,
        petInfoSubmittedAt: campaignInfluencers.petInfoSubmittedAt,
      });

    if (!updated) return new NextResponse("Campaign enrollment not found", { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save pet info";
    return new NextResponse(message, { status: 500 });
  }
}

