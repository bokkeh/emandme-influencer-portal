import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignsPageClient } from "@/components/admin/CampaignsPageClient";

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
    platforms: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog">;
    totalBudget: string | null;
    totalRevenue: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    campaignType: string;
  }> = [];
  let schemaError: string | null = null;

  try {
    allCampaigns = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        platforms: campaigns.platforms,
        totalBudget: campaigns.totalBudget,
        totalRevenue: campaigns.totalRevenue,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        createdAt: campaigns.createdAt,
        campaignType: campaigns.campaignType,
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
      ) : (
        <CampaignsPageClient initialCampaigns={allCampaigns} />
      )}
    </div>
  );
}
