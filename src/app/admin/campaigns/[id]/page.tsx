import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { campaigns, campaignInfluencers, influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CampaignEnrollmentManager } from "@/components/admin/CampaignEnrollmentManager";
import { CampaignBriefBuilder } from "@/components/admin/CampaignBriefBuilder";
import { CampaignCostBenchmarksCard } from "@/components/admin/CampaignCostBenchmarksCard";
import { CampaignEnrollmentPipelineTable } from "@/components/admin/CampaignEnrollmentPipelineTable";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

function isCampaignSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("campaigns") ||
    lowered.includes("campaign_influencers") ||
    lowered.includes("campaign_status") ||
    lowered.includes("platform") ||
    lowered.includes("enrollment_status") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let schemaError: string | null = null;
  let campaign: (typeof campaigns.$inferSelect) | null = null;
  let enrollments: Array<{
    id: string;
    status: "invited" | "accepted" | "declined" | "active" | "completed" | "removed";
    pipelineStage: string | null;
    contractStatus: string | null;
    proposedFee: string | null;
    agreedFee: string | null;
    contractUrl: string | null;
    contentDueDate: Date | null;
    influencerId: string;
    influencerName: string | null;
    influencerTier: "nano" | "micro" | "mid" | "macro" | "mega";
    userEmail: string;
    userFirstName: string | null;
    userLastName: string | null;
  }> = [];

  try {
    const found = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    campaign = found[0] ?? null;
    if (campaign) {
      enrollments = await db
        .select({
          id: campaignInfluencers.id,
          status: campaignInfluencers.status,
          pipelineStage: campaignInfluencers.pipelineStage,
          contractStatus: campaignInfluencers.contractStatus,
          proposedFee: campaignInfluencers.proposedFee,
          agreedFee: campaignInfluencers.agreedFee,
          contractUrl: campaignInfluencers.contractUrl,
          contentDueDate: campaignInfluencers.contentDueDate,
          influencerId: influencerProfiles.id,
          influencerName: influencerProfiles.displayName,
          influencerTier: influencerProfiles.tier,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(campaignInfluencers)
        .innerJoin(influencerProfiles, eq(campaignInfluencers.influencerProfileId, influencerProfiles.id))
        .innerJoin(users, eq(influencerProfiles.userId, users.id))
        .where(eq(campaignInfluencers.campaignId, id));
    }
  } catch (error) {
    if (isCampaignSchemaError(error)) {
      schemaError =
        "Campaign workflow schema is missing or outdated. Run migrations 0007, 0009, and 0010 in Neon, then redeploy.";
    } else {
      throw error;
    }
  }

  if (schemaError) {
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
        <Card className="border border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-5 space-y-2">
            <p className="text-sm font-semibold text-amber-900">Campaign detail unavailable</p>
            <p className="text-sm text-amber-800">{schemaError}</p>
            <p className="text-xs text-amber-700">
              Migration files: `src/lib/db/migrations/0007_campaigns_backfill.sql`,
              `src/lib/db/migrations/0009_campaign_enrollments_backfill.sql`,
              `src/lib/db/migrations/0010_campaign_workflow_fields.sql`
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) notFound();

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

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                <StatusBadge status={campaign.status} />
              </div>
              {campaign.description ? <p className="mt-2 text-gray-600">{campaign.description}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {campaign.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            {campaign.totalBudget ? (
              <div>
                <p className="text-xs text-gray-400 font-medium">BUDGET</p>
                <p className="text-lg font-bold text-gray-900">${Number(campaign.totalBudget).toLocaleString()}</p>
              </div>
            ) : null}
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

          {campaign.startDate || campaign.endDate ? (
            <div className="mt-3 text-sm text-gray-500">
              {campaign.startDate ? format(new Date(campaign.startDate), "MMM d, yyyy") : null}
              {campaign.startDate && campaign.endDate ? " - " : ""}
              {campaign.endDate ? format(new Date(campaign.endDate), "MMM d, yyyy") : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {products.length > 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Products</p>
            <div className="flex flex-wrap gap-4">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title} className="h-10 w-10 rounded object-cover" />
                  ) : null}
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CampaignBriefBuilder
          campaignId={id}
          initialBrief={campaign.description ?? ""}
          initialBriefUrl={campaign.briefUrl ?? ""}
        />
        <CampaignCostBenchmarksCard />
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-6 pb-3">
          <p className="text-base font-semibold text-gray-900">
            Enrolled Influencers ({enrollments.length})
          </p>
          <CampaignEnrollmentManager campaignId={id} />
        </div>
        <CardContent className="p-0">
          <CampaignEnrollmentPipelineTable campaignId={id} rows={enrollments} />
        </CardContent>
      </Card>
    </div>
  );
}
