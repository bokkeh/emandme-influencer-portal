import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, campaigns, users, influencerProfiles, campaignInfluencers } from "@/lib/db";
import { googleChat } from "@/lib/notifications/google-chat";

function redirectFromRequest(req: Request, path: string) {
  const url = new URL(path, req.url);
  return NextResponse.redirect(url);
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [campaign] = await db
    .select({ id: campaigns.id, title: campaigns.title })
    .from(campaigns)
    .where(eq(campaigns.briefShareToken, token))
    .limit(1);

  if (!campaign) {
    return new NextResponse("Campaign brief not found", { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return redirectFromRequest(
      req,
      `/sign-in?redirect_url=${encodeURIComponent(`/api/brief/${token}/join`)}`
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) {
    return redirectFromRequest(req, `/onboarding?campaignId=${campaign.id}`);
  }

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) {
    return redirectFromRequest(req, `/onboarding?campaignId=${campaign.id}`);
  }

  const [existing] = await db
    .select({ id: campaignInfluencers.id })
    .from(campaignInfluencers)
    .where(
      and(
        eq(campaignInfluencers.campaignId, campaign.id),
        eq(campaignInfluencers.influencerProfileId, profile.id)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(campaignInfluencers).values({
      campaignId: campaign.id,
      influencerProfileId: profile.id,
      status: "invited",
      pipelineStage: "outreach",
      contractStatus: "not_sent",
    });

    const influencerName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
    googleChat.campaignSignupRequested(campaign.title, influencerName).catch(() => {});
  }

  return redirectFromRequest(req, "/influencer/campaigns?joined=1");
}
