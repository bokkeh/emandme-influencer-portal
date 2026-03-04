import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, influencerProfiles, campaignInfluencers, campaigns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
      campaignPlatforms: campaigns.platforms,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
    })
    .from(campaignInfluencers)
    .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
    .where(eq(campaignInfluencers.influencerProfileId, profile.id))
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
          {myCampaigns.map((c) => (
            <Link key={c.enrollmentId} href={`/influencer/campaigns/${c.campaignId}`}>
              <Card className="border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{c.campaignTitle}</h3>
                      {c.campaignDescription && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{c.campaignDescription}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.campaignPlatforms.map((p) => (
                          <PlatformBadge key={p} platform={p} />
                        ))}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-6 text-sm">
                    {c.agreedFee && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">YOUR FEE</p>
                        <p className="font-semibold text-gray-900">${Number(c.agreedFee).toFixed(2)}</p>
                      </div>
                    )}
                    {c.contentDueDate && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">CONTENT DUE</p>
                        <p className="font-semibold text-gray-900">{format(new Date(c.contentDueDate), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {c.startDate && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">DATES</p>
                        <p className="font-medium text-gray-600">
                          {format(new Date(c.startDate), "MMM d")}
                          {c.endDate && ` — ${format(new Date(c.endDate), "MMM d, yyyy")}`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
