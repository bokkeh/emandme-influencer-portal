import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  influencerProfiles,
  users,
  socialAccounts,
  campaignInfluencers,
  campaigns,
  assets,
  payments,
  shipments,
  discountCodes,
  utmLinks,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/shared/TierBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { ArrowLeft, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export default async function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      displayName: influencerProfiles.displayName,
      bio: influencerProfiles.bio,
      niche: influencerProfiles.niche,
      tier: influencerProfiles.tier,
      phone: influencerProfiles.phone,
      shippingAddressLine1: influencerProfiles.shippingAddressLine1,
      shippingCity: influencerProfiles.shippingCity,
      shippingState: influencerProfiles.shippingState,
      shippingPostalCode: influencerProfiles.shippingPostalCode,
      shippingCountry: influencerProfiles.shippingCountry,
      stripeAccountStatus: influencerProfiles.stripeAccountStatus,
      stripePayoutsEnabled: influencerProfiles.stripePayoutsEnabled,
      hubspotContactId: influencerProfiles.hubspotContactId,
      hubspotLastSyncedAt: influencerProfiles.hubspotLastSyncedAt,
      totalEarnings: influencerProfiles.totalEarnings,
      totalCampaigns: influencerProfiles.totalCampaigns,
      totalAssetsSubmitted: influencerProfiles.totalAssetsSubmitted,
      notes: influencerProfiles.notes,
      isVerified: influencerProfiles.isVerified,
      joinedAt: influencerProfiles.joinedAt,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(influencerProfiles.id, id))
    .limit(1);

  if (!profile) notFound();

  const [socials, enrollments, profileAssets, profilePayments, profileShipments, profileDiscountCodes, profileUTMLinks] =
    await Promise.all([
      db.select().from(socialAccounts).where(eq(socialAccounts.influencerProfileId, id)),
      db
        .select({
          id: campaignInfluencers.id,
          status: campaignInfluencers.status,
          agreedFee: campaignInfluencers.agreedFee,
          enrolledAt: campaignInfluencers.enrolledAt,
          campaignTitle: campaigns.title,
          campaignStatus: campaigns.status,
          campaignId: campaigns.id,
        })
        .from(campaignInfluencers)
        .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
        .where(eq(campaignInfluencers.influencerProfileId, id)),
      db.select().from(assets).where(eq(assets.influencerProfileId, id)).limit(10),
      db.select().from(payments).where(eq(payments.influencerProfileId, id)).limit(10),
      db.select().from(shipments).where(eq(shipments.influencerProfileId, id)).limit(10),
      db.select().from(discountCodes).where(eq(discountCodes.influencerProfileId, id)).limit(10),
      db.select().from(utmLinks).where(eq(utmLinks.influencerProfileId, id)).limit(10),
    ]);

  const name =
    (profile.displayName ??
    `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim()) ||
    profile.userEmail;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/influencers">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Influencers
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.userAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-rose-100 text-rose-700 text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <TierBadge tier={profile.tier} showRange />
                {profile.isVerified && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">✓ Verified</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{profile.userEmail}</p>
              {profile.niche && (
                <p className="text-sm text-gray-600 mt-1 capitalize">📂 {profile.niche}</p>
              )}
              {profile.bio && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{profile.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-medium">TOTAL EARNINGS</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${Number(profile.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">CAMPAIGNS</p>
                  <p className="text-lg font-bold text-gray-900">{profile.totalCampaigns}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">ASSETS</p>
                  <p className="text-lg font-bold text-gray-900">{profile.totalAssetsSubmitted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">STRIPE</p>
                  <StatusBadge status={profile.stripeAccountStatus} />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700">Edit Profile</Button>
              <Button size="sm" variant="outline">Sync to HubSpot</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Accounts */}
      {socials.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {socials.map((s) => (
            <Card key={s.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <PlatformBadge platform={s.platform} />
                <p className="mt-2 text-sm font-medium text-gray-900">@{s.handle}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {s.followerCount.toLocaleString()} followers
                </p>
                {s.avgEngagementRate && (
                  <p className="text-xs text-gray-500">{s.avgEngagementRate}% engagement</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="campaigns">Campaigns ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="assets">Assets ({profileAssets.length})</TabsTrigger>
          <TabsTrigger value="utm">UTM Links ({profileUTMLinks.length})</TabsTrigger>
          <TabsTrigger value="codes">Discount Codes ({profileDiscountCodes.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({profilePayments.length})</TabsTrigger>
          <TabsTrigger value="shipping">Shipping ({profileShipments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              {enrollments.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Not enrolled in any campaigns</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Campaign</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Enrollment</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrollments.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/campaigns/${e.campaignId}`} className="font-medium text-gray-900 hover:text-rose-600">
                            {e.campaignTitle}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDistanceToNow(new Date(e.enrolledAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {e.agreedFee ? `$${Number(e.agreedFee).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utm" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-3">
              {profileUTMLinks.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No UTM links created</p>
              ) : (
                profileUTMLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">{link.label ?? "Untitled link"}</p>
                      <p className="text-xs text-gray-400 truncate">{link.fullUrl}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{link.clicks} clicks</p>
                    </div>
                    <CopyButton text={link.fullUrl} label="Copy" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-3">
              {profileDiscountCodes.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No discount codes</p>
              ) : (
                profileDiscountCodes.map((dc) => (
                  <div key={dc.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900">{dc.code}</p>
                      <p className="text-xs text-gray-500">
                        {dc.discountType === "percentage" ? `${dc.discountValue}% off` : `$${dc.discountValue} off`}
                        {" · "}{dc.usageCount} uses{" · "}${Number(dc.revenueGenerated).toFixed(2)} revenue
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={dc.isActive ? "active" : "cancelled"} />
                      <CopyButton text={dc.code} label="Copy" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              {profilePayments.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No payments recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profilePayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 capitalize text-gray-500">{p.paymentType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-gray-500">
                          {p.paidAt ? format(new Date(p.paidAt), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              {profileAssets.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No assets submitted</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {profileAssets.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-100 h-32 flex items-center justify-center">
                        {a.thumbnailUrl ? (
                          <img src={a.thumbnailUrl} alt={a.title ?? "Asset"} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">{a.fileType === "video" ? "🎬" : "🖼️"}</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{a.title ?? "Untitled"}</p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              {profileShipments.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No shipments recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Products</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Carrier</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profileShipments.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-gray-600">
                          {(s.products as Array<{name:string}>)?.map(p => p.name).join(", ") ?? "—"}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{s.carrier ?? "—"}</td>
                        <td className="px-4 py-3">
                          {s.trackingUrl ? (
                            <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer"
                              className="text-rose-600 hover:text-rose-700 text-xs flex items-center gap-1">
                              {s.trackingNumber ?? "Track"} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : s.trackingNumber ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shipping Address & Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {profile.shippingAddressLine1 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{profile.shippingAddressLine1}</p>
              <p className="text-sm text-gray-600">
                {profile.shippingCity}, {profile.shippingState} {profile.shippingPostalCode}
              </p>
              <p className="text-sm text-gray-600">{profile.shippingCountry}</p>
            </CardContent>
          </Card>
        )}

        {profile.notes && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
