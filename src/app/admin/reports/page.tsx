import { db } from "@/lib/db";
import {
  campaigns,
  discountCodes,
  influencerProfiles,
  payments,
  assets,
  users,
} from "@/lib/db/schema";
import { eq, sum, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/admin/KPICard";
import { TrendingUp, DollarSign, Users, ImageIcon } from "lucide-react";

export default async function ReportsPage() {
  const [
    [totalRevenue],
    [totalPaid],
    [influencerCount],
    [assetCount],
    topCampaigns,
    topInfluencers,
  ] = await Promise.all([
    db.select({ total: sum(campaigns.totalRevenue) }).from(campaigns),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "paid")),
    db.select({ count: count() }).from(influencerProfiles),
    db.select({ count: count() }).from(assets).where(eq(assets.status, "approved")),
    db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        totalRevenue: campaigns.totalRevenue,
        totalOrders: campaigns.totalOrders,
        status: campaigns.status,
      })
      .from(campaigns)
      .orderBy(campaigns.totalRevenue)
      .limit(10),
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        totalEarnings: influencerProfiles.totalEarnings,
        totalCampaigns: influencerProfiles.totalCampaigns,
        totalAssetsSubmitted: influencerProfiles.totalAssetsSubmitted,
        tier: influencerProfiles.tier,
        userEmail: users.email,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(influencerProfiles.totalEarnings)
      .limit(10),
  ]);

  const fmt = (v: string | null) =>
    v ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Overview of campaign performance and influencer metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total Revenue Attributed"
          value={fmt(totalRevenue.total)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <KPICard
          title="Total Paid to Influencers"
          value={fmt(totalPaid.total)}
          icon={DollarSign}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <KPICard
          title="Active Influencers"
          value={influencerCount.count}
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <KPICard
          title="Approved Assets"
          value={assetCount.count}
          icon={ImageIcon}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top Campaigns by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No campaign revenue data yet</p>
            ) : (
              <ul className="space-y-3">
                {topCampaigns.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.title}</p>
                        <p className="text-xs text-gray-400">{c.totalOrders} orders · {c.status}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-700">
                      ${Number(c.totalRevenue).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top Influencers by Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {topInfluencers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No earnings data yet</p>
            ) : (
              <ul className="space-y-3">
                {topInfluencers.map((inf, i) => {
                  const name = inf.displayName ?? inf.userEmail;
                  return (
                    <li key={inf.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400">
                            {inf.totalCampaigns} campaigns · {inf.totalAssetsSubmitted} assets · {inf.tier}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-rose-700">
                        ${Number(inf.totalEarnings).toLocaleString()}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
