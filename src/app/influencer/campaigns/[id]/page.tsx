import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  users,
  influencerProfiles,
  campaignInfluencers,
  campaigns,
  utmLinks,
  discountCodes,
  assets,
  shipments,
  payments,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { CampaignProgressCard } from "@/components/influencer/CampaignProgressCard";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default async function InfluencerCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [enrollment] = await db
    .select({
      id: campaignInfluencers.id,
      status: campaignInfluencers.status,
      agreedFee: campaignInfluencers.agreedFee,
      contentDueDate: campaignInfluencers.contentDueDate,
      deliverables: campaignInfluencers.deliverables,
      utmLinkId: campaignInfluencers.utmLinkId,
      discountCodeId: campaignInfluencers.discountCodeId,
      petName: campaignInfluencers.petName,
      petBreed: campaignInfluencers.petBreed,
      petAge: campaignInfluencers.petAge,
      petPersonality: campaignInfluencers.petPersonality,
      tagPersonalizationText: campaignInfluencers.tagPersonalizationText,
      campaignTitle: campaigns.title,
      campaignDescription: campaigns.description,
      campaignStatus: campaigns.status,
      campaignPlatforms: campaigns.platforms,
      briefUrl: campaigns.briefUrl,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      products: campaigns.products,
    })
    .from(campaignInfluencers)
    .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
    .where(
      and(
        eq(campaignInfluencers.influencerProfileId, profile.id),
        eq(campaignInfluencers.campaignId, id)
      )
    )
    .limit(1);

  if (!enrollment) notFound();
  if (enrollment.status === "invited") redirect("/influencer/campaigns");

  const [myUTMLink, myDiscountCode] = await Promise.all([
    enrollment.utmLinkId
      ? db.select().from(utmLinks).where(eq(utmLinks.id, enrollment.utmLinkId)).limit(1)
      : Promise.resolve([]),
    enrollment.discountCodeId
      ? db.select().from(discountCodes).where(eq(discountCodes.id, enrollment.discountCodeId)).limit(1)
      : Promise.resolve([]),
  ]);

  const [shipment, submittedAsset, publishedAsset, paidPayment] = await Promise.all([
    db
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.campaignId, id), eq(shipments.influencerProfileId, profile.id)))
      .limit(1),
    db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.campaignId, id), eq(assets.influencerProfileId, profile.id)))
      .limit(1),
    db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          eq(assets.campaignId, id),
          eq(assets.influencerProfileId, profile.id),
          eq(assets.status, "approved")
        )
      )
      .limit(1),
    db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.campaignId, id),
          eq(payments.influencerProfileId, profile.id),
          eq(payments.status, "paid")
        )
      )
      .limit(1),
  ]);

  const petInfoSubmitted = Boolean(
    enrollment.petName &&
      enrollment.petBreed &&
      enrollment.petAge &&
      enrollment.petPersonality &&
      enrollment.tagPersonalizationText
  );
  const joinedCampaign = ["accepted", "active", "completed"].includes(enrollment.status);
  const checklist = [
    { label: "Joined campaign", done: joinedCampaign },
    { label: "Submitted pet tag info", done: petInfoSubmitted },
    { label: "Product shipped", done: Boolean(shipment[0]) },
    { label: "Content submitted for approval", done: Boolean(submittedAsset[0]) },
    { label: "Post published", done: Boolean(publishedAsset[0]) },
    { label: "Payment sent", done: Boolean(paidPayment[0]) },
  ];

  const utmLink = myUTMLink[0] ?? null;
  const discountCode = myDiscountCode[0] ?? null;
  const deliverables = (enrollment.deliverables as Array<{id:string;type:string;platform:string;dueDate:string;status:string;notes?:string}>) ?? [];

  return (
    <div className="space-y-6">
      <Link href="/influencer/campaigns">
        <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>
      </Link>

      {/* Campaign Header */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{enrollment.campaignTitle}</h1>
              {enrollment.campaignDescription && (
                <p className="mt-2 text-gray-600">{enrollment.campaignDescription}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {enrollment.campaignPlatforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            </div>
            <StatusBadge status={enrollment.status} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            {enrollment.agreedFee && (
              <div>
                <p className="text-xs text-gray-400 font-medium">YOUR FEE</p>
                <p className="text-lg font-bold text-gray-900">${Number(enrollment.agreedFee).toFixed(2)}</p>
              </div>
            )}
            {enrollment.contentDueDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium">CONTENT DUE</p>
                <p className="text-lg font-bold text-gray-900">{format(new Date(enrollment.contentDueDate), "MMM d, yyyy")}</p>
              </div>
            )}
            {enrollment.startDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium">START</p>
                <p className="font-medium text-gray-700">{format(new Date(enrollment.startDate), "MMM d, yyyy")}</p>
              </div>
            )}
            {enrollment.endDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium">END</p>
                <p className="font-medium text-gray-700">{format(new Date(enrollment.endDate), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {enrollment.briefUrl && (
            <div className="mt-4">
              <a href={enrollment.briefUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Campaign Brief
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                  d.status === "approved" ? "bg-green-500 border-green-500" :
                  d.status === "submitted" ? "bg-blue-500 border-blue-500" :
                  "border-gray-300"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {d.type.replace(/_/g, " ")} — {d.platform}
                  </p>
                  {d.dueDate && (
                    <p className="text-xs text-gray-400">Due {format(new Date(d.dueDate), "MMM d, yyyy")}</p>
                  )}
                  {d.notes && <p className="text-xs text-gray-500 mt-0.5">{d.notes}</p>}
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CampaignProgressCard
        campaignId={id}
        canSubmitPetInfo={joinedCampaign}
        checklist={checklist}
        initialPetInfo={{
          petName: enrollment.petName ?? "",
          petBreed: enrollment.petBreed ?? "",
          petAge: enrollment.petAge ?? "",
          petPersonality: enrollment.petPersonality ?? "",
          tagPersonalizationText: enrollment.tagPersonalizationText ?? "",
        }}
      />

      {/* UTM Link & Discount Code */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Tracking Link</CardTitle>
          </CardHeader>
          <CardContent>
            {utmLink ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                  <p className="font-mono text-xs text-gray-700 break-all">{utmLink.fullUrl}</p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={utmLink.fullUrl} label="Copy Link" />
                  <a href={utmLink.fullUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-gray-400">{utmLink.clicks} clicks tracked</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No tracking link assigned yet — check back soon!</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Discount Code</CardTitle>
          </CardHeader>
          <CardContent>
            {discountCode ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-purple-50 border border-purple-200 p-4 text-center">
                  <p className="font-mono text-2xl font-bold text-purple-900">{discountCode.code}</p>
                  <p className="text-sm text-purple-700 mt-1">
                    {discountCode.discountType === "percentage"
                      ? `${discountCode.discountValue}% off`
                      : `$${discountCode.discountValue} off`}
                  </p>
                </div>
                <CopyButton text={discountCode.code} label="Copy Code" />
                <div className="text-xs text-gray-400">
                  <p>{discountCode.usageCount} uses · ${Number(discountCode.revenueGenerated).toFixed(2)} revenue generated</p>
                  {discountCode.expiresAt && (
                    <p>Expires {format(new Date(discountCode.expiresAt), "MMM d, yyyy")}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No discount code assigned yet — check back soon!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
