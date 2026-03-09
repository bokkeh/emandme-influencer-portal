import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, influencerProfiles, campaignInfluencers, campaigns } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";

export default async function InfluencerCampaignsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) redirect("/onboarding");

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) redirect("/onboarding");

  const myCampaigns = await db
    .select({
      enrollmentId: campaignInfluencers.id,
      status: campaignInfluencers.status,
      agreedFee: campaignInfluencers.agreedFee,
      contentDueDate: campaignInfluencers.contentDueDate,
      enrolledAt: campaignInfluencers.enrolledAt,
      campaignId: campaigns.id,
      campaignTitle: campaigns.title,
      campaignDescription: campaigns.description,
      campaignStatus: campaigns.status,
      campaignType: campaigns.campaignType,
      campaignPlatforms: campaigns.platforms,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
    })
    .from(campaignInfluencers)
    .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
    .where(
      and(
        eq(campaignInfluencers.influencerProfileId, profile.id),
        ne(campaignInfluencers.status, "removed")
      )
    )
    .orderBy(campaigns.startDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Campaigns</h1>
        <p className="text-sm text-gray-500">{myCampaigns.length} campaign{myCampaigns.length !== 1 ? "s" : ""}</p>
      </div>

      {myCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="The Em & Me Studio team will invite you to campaigns soon!"
        />
      ) : (
        <div className="space-y-4">
          {myCampaigns.map((campaign) => {
            const isPendingApproval = campaign.status === "invited";
            const dateLabel = campaign.startDate
              ? campaign.endDate
                ? `${format(new Date(campaign.startDate), "MMM d")} - ${format(new Date(campaign.endDate), "MMM d, yyyy")}`
                : format(new Date(campaign.startDate), "MMM d, yyyy")
              : null;

            const card = (
              <Card
                className={`border border-gray-200 shadow-sm transition-all ${
                  isPendingApproval ? "bg-amber-50/40" : "hover:shadow-md hover:border-rose-200 cursor-pointer"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{campaign.campaignTitle}</h3>
                      <div className="mt-1">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                          {campaign.campaignType}
                        </span>
                      </div>
                      {campaign.campaignDescription && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{campaign.campaignDescription}</p>
                      )}
                      {isPendingApproval ? (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Pending admin approval. You&apos;ll get access once approved.
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {campaign.campaignPlatforms.map((platform) => (
                          <PlatformBadge key={platform} platform={platform} />
                        ))}
                      </div>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-6 text-sm">
                    {campaign.agreedFee && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">YOUR PAY</p>
                        <p className="font-semibold text-gray-900">${Number(campaign.agreedFee).toFixed(2)}</p>
                      </div>
                    )}
                    {campaign.contentDueDate && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">CONTENT DUE</p>
                        <p className="font-semibold text-gray-900">{format(new Date(campaign.contentDueDate), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {dateLabel ? (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">DATES</p>
                        <p className="font-medium text-gray-600">{dateLabel}</p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );

            if (isPendingApproval) {
              return <div key={campaign.enrollmentId}>{card}</div>;
            }

            return (
              <Link key={campaign.enrollmentId} href={`/influencer/campaigns/${campaign.campaignId}`}>
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
