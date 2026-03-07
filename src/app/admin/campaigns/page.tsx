import Link from "next/link";
import { db } from "@/lib/db";
import { campaigns, campaignInfluencers } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Megaphone, Plus, CalendarDays, DollarSign } from "lucide-react";
import { format } from "date-fns";

function isCampaignSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("campaigns") ||
    lowered.includes("campaign_influencers") ||
    lowered.includes("campaign_status") ||
    lowered.includes("platform") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

export default async function CampaignsPage() {
  let allCampaigns: Array<{
    id: string;
    title: string;
    status: "draft" | "active" | "paused" | "completed" | "cancelled";
    platforms: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog">;
    totalBudget: string | null;
    totalRevenue: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  }> = [];
  let schemaError: string | null = null;

  try {
    allCampaigns = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        status: campaigns.status,
        platforms: campaigns.platforms,
        totalBudget: campaigns.totalBudget,
        totalRevenue: campaigns.totalRevenue,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .orderBy(campaigns.createdAt);
  } catch (error) {
    if (isCampaignSchemaError(error)) {
      schemaError =
        "Campaign database schema is missing or outdated. Run migrations 0007, 0009, and 0010 in Neon, then redeploy.";
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">{allCampaigns.length} total campaigns</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {schemaError ? (
        <Card className="border border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-5 space-y-2">
            <p className="text-sm font-semibold text-amber-900">Campaigns unavailable</p>
            <p className="text-sm text-amber-800">{schemaError}</p>
            <p className="text-xs text-amber-700">
              Migration files: `src/lib/db/migrations/0007_campaigns_backfill.sql`,
              `src/lib/db/migrations/0009_campaign_enrollments_backfill.sql`,
              `src/lib/db/migrations/0010_campaign_workflow_fields.sql`
            </p>
          </CardContent>
        </Card>
      ) : allCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start managing influencer partnerships."
          action={
            <Link href="/admin/campaigns/new">
              <Button className="bg-rose-600 hover:bg-rose-700">Create Campaign</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {allCampaigns.map((campaign) => (
            <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
              <Card className="border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 leading-tight">{campaign.title}</h3>
                    <StatusBadge status={campaign.status} />
                  </div>

                  {/* Platforms */}
                  {campaign.platforms.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {campaign.platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {campaign.totalBudget && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium">BUDGET</p>
                        <p className="font-semibold text-gray-900">
                          ${Number(campaign.totalBudget).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 font-medium">REVENUE</p>
                      <p className="font-semibold text-green-700">
                        ${Number(campaign.totalRevenue).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {(campaign.startDate || campaign.endDate) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {campaign.startDate && format(new Date(campaign.startDate), "MMM d")}
                      {campaign.startDate && campaign.endDate && " — "}
                      {campaign.endDate && format(new Date(campaign.endDate), "MMM d, yyyy")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
