import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignInfluencers,
  influencerProfiles,
  users,
  discountCodes,
  utmLinks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { TierBadge } from "@/components/shared/TierBadge";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  if (!campaign) notFound();

  const enrollments = await db
    .select({
      id: campaignInfluencers.id,
      status: campaignInfluencers.status,
      agreedFee: campaignInfluencers.agreedFee,
      contentDueDate: campaignInfluencers.contentDueDate,
      utmLinkId: campaignInfluencers.utmLinkId,
      discountCodeId: campaignInfluencers.discountCodeId,
      enrolledAt: campaignInfluencers.enrolledAt,
      influencerId: influencerProfiles.id,
      influencerName: influencerProfiles.displayName,
      influencerTier: influencerProfiles.tier,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userAvatarUrl: users.avatarUrl,
    })
    .from(campaignInfluencers)
    .innerJoin(influencerProfiles, eq(campaignInfluencers.influencerProfileId, influencerProfiles.id))
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(campaignInfluencers.campaignId, id));

  const products = (campaign.products as Array<{ title: string; imageUrl?: string }>) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/campaigns">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>
      </div>

      {/* Campaign Header */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                <StatusBadge status={campaign.status} />
              </div>
              {campaign.description && (
                <p className="mt-2 text-gray-600">{campaign.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {campaign.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm">Edit Campaign</Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            {campaign.totalBudget && (
              <div>
                <p className="text-xs text-gray-400 font-medium">BUDGET</p>
                <p className="text-lg font-bold text-gray-900">${Number(campaign.totalBudget).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-medium">REVENUE</p>
              <p className="text-lg font-bold text-green-700">${Number(campaign.totalRevenue).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">ORDERS</p>
              <p className="text-lg font-bold text-gray-900">{campaign.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">INFLUENCERS</p>
              <p className="text-lg font-bold text-gray-900">{enrollments.length}</p>
            </div>
          </div>

          {(campaign.startDate || campaign.endDate) && (
            <div className="mt-3 text-sm text-gray-500">
              {campaign.startDate && format(new Date(campaign.startDate), "MMM d, yyyy")}
              {campaign.startDate && campaign.endDate && " — "}
              {campaign.endDate && format(new Date(campaign.endDate), "MMM d, yyyy")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      {products.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2">
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt={p.title} className="h-10 w-10 rounded object-cover" />
                  )}
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrolled Influencers */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Enrolled Influencers ({enrollments.length})</CardTitle>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-2">
            <Plus className="h-4 w-4" />
            Enroll Influencer
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No influencers enrolled yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Influencer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fee</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Content Due</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map((e) => {
                  const name =
                    (e.influencerName ??
                    `${e.userFirstName ?? ""} ${e.userLastName ?? ""}`.trim()) ||
                    e.userEmail;
                  const initials = name.slice(0, 2).toUpperCase();
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={e.userAvatarUrl ?? undefined} />
                            <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <Link href={`/admin/influencers/${e.influencerId}`}
                            className="font-medium text-gray-900 hover:text-rose-600">
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3">{e.agreedFee ? `$${Number(e.agreedFee).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {e.contentDueDate ? format(new Date(e.contentDueDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3"><TierBadge tier={e.influencerTier} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">Generate UTM</Button>
                          <Button size="sm" variant="outline" className="text-xs">Gen Code</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
