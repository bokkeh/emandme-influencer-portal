import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users,
  influencerProfiles,
  campaignInfluencers,
  campaigns,
  assets,
  payments,
} from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Megaphone, ImageIcon, CreditCard, Upload } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { formatDistanceToNow } from "date-fns";
import { redirect } from "next/navigation";

export default async function InfluencerDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ id: users.id, firstName: users.firstName })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) redirect("/onboarding");

  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      totalEarnings: influencerProfiles.totalEarnings,
      totalCampaigns: influencerProfiles.totalCampaigns,
      stripePayoutsEnabled: influencerProfiles.stripePayoutsEnabled,
      stripeAccountStatus: influencerProfiles.stripeAccountStatus,
    })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) redirect("/onboarding");

  const [activeCampaigns, pendingAssets, pendingPayments] = await Promise.all([
    db
      .select({
        id: campaignInfluencers.id,
        status: campaignInfluencers.status,
        campaignTitle: campaigns.title,
        campaignId: campaigns.id,
        campaignStatus: campaigns.status,
        contentDueDate: campaignInfluencers.contentDueDate,
      })
      .from(campaignInfluencers)
      .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignInfluencers.influencerProfileId, profile.id),
          eq(campaignInfluencers.status, "active")
        )
      )
      .limit(5),
    db
      .select({ count: count() })
      .from(assets)
      .where(and(eq(assets.influencerProfileId, profile.id), eq(assets.status, "pending_review"))),
    db
      .select({ count: count() })
      .from(payments)
      .where(and(eq(payments.influencerProfileId, profile.id), eq(payments.status, "pending"))),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user.firstName ? `, ${user.firstName}` : ""}! 👋
        </h1>
        <p className="text-sm text-gray-500">Here's what's happening with your campaigns</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total Earnings"
          value={`$${Number(profile.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <KPICard
          title="Active Campaigns"
          value={activeCampaigns.length}
          icon={Megaphone}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <KPICard
          title="Assets in Review"
          value={pendingAssets[0].count}
          icon={ImageIcon}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Pending Payments"
          value={pendingPayments[0].count}
          icon={CreditCard}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      {/* Stripe Banner */}
      {!profile.stripePayoutsEnabled && (
        <Card className="border border-orange-200 bg-orange-50 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-orange-800">Connect your bank to receive payments</p>
              <p className="text-xs text-orange-600">Set up Stripe to get paid directly to your bank account</p>
            </div>
            <Link href="/influencer/profile">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                Set Up Payments
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active Campaigns */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
          <Link href="/influencer/campaigns">
            <Button variant="ghost" size="sm" className="text-rose-600">View all →</Button>
          </Link>
        </div>
        {activeCampaigns.length === 0 ? (
          <Card className="border border-dashed border-gray-200">
            <CardContent className="py-8 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">No active campaigns — check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCampaigns.map((c) => (
              <Link key={c.id} href={`/influencer/campaigns/${c.campaignId}`}>
                <Card className="border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{c.campaignTitle}</p>
                      {c.contentDueDate && (
                        <p className="text-xs text-gray-400">
                          Due {formatDistanceToNow(new Date(c.contentDueDate), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={c.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/influencer/upload">
            <Button variant="outline" className="w-full h-16 flex-col gap-1 text-sm">
              <Upload className="h-5 w-5 text-rose-600" />
              Upload Content
            </Button>
          </Link>
          <Link href="/influencer/campaigns">
            <Button variant="outline" className="w-full h-16 flex-col gap-1 text-sm">
              <Megaphone className="h-5 w-5 text-purple-600" />
              My Campaigns
            </Button>
          </Link>
          <Link href="/influencer/links">
            <Button variant="outline" className="w-full h-16 flex-col gap-1 text-sm">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              My Links
            </Button>
          </Link>
          <Link href="/influencer/payments">
            <Button variant="outline" className="w-full h-16 flex-col gap-1 text-sm">
              <CreditCard className="h-5 w-5 text-green-600" />
              Payments
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
