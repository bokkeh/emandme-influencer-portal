import { db } from "@/lib/db";
import {
  influencerProfiles,
  campaigns,
  payments,
  assets,
  shipments,
} from "@/lib/db/schema";
import { eq, count, sum, and, ne } from "drizzle-orm";
import { KPICard } from "@/components/admin/KPICard";
import {
  Users,
  Megaphone,
  DollarSign,
  CreditCard,
  ImageIcon,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage() {
  const [
    [influencerCount],
    [activeCampaignCount],
    [pendingPaymentsResult],
    [pendingAssetsCount],
    [pendingShipmentsCount],
    recentInfluencers,
    recentAssets,
  ] = await Promise.all([
    db.select({ count: count() }).from(influencerProfiles),
    db
      .select({ count: count() })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "pending")),
    db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.status, "pending_review")),
    db
      .select({ count: count() })
      .from(shipments)
      .where(eq(shipments.status, "preparing")),
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        tier: influencerProfiles.tier,
        joinedAt: influencerProfiles.joinedAt,
      })
      .from(influencerProfiles)
      .orderBy(influencerProfiles.joinedAt)
      .limit(5),
    db
      .select({
        id: assets.id,
        title: assets.title,
        platform: assets.platform,
        status: assets.status,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(eq(assets.status, "pending_review"))
      .orderBy(assets.createdAt)
      .limit(5),
  ]);

  const pendingPaymentTotal = pendingPaymentsResult.total
    ? `$${Number(pendingPaymentsResult.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$0.00";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Em & Me Studio Influencer Portal overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Total Influencers"
          value={influencerCount.count}
          icon={Users}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <KPICard
          title="Active Campaigns"
          value={activeCampaignCount.count}
          icon={Megaphone}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <KPICard
          title="Pending Payouts"
          value={pendingPaymentTotal}
          icon={CreditCard}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KPICard
          title="Assets to Review"
          value={pendingAssetsCount.count}
          icon={ImageIcon}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Pending Shipments"
          value={pendingShipmentsCount.count}
          icon={Package}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <KPICard
          title="Total Roster"
          value={influencerCount.count}
          subtitle="influencers + UGC"
          icon={DollarSign}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Influencers</CardTitle>
            <Link href="/admin/influencers">
              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                View all →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentInfluencers.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No influencers yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentInfluencers.map((inf) => (
                  <li key={inf.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/admin/influencers/${inf.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-rose-600"
                      >
                        {inf.displayName ?? "Unnamed Influencer"}
                      </Link>
                      <p className="text-xs text-gray-400">
                        Joined {formatDistanceToNow(new Date(inf.joinedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-xs font-medium capitalize text-gray-500">{inf.tier}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Assets Pending Review</CardTitle>
            <Link href="/admin/assets">
              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                Review all →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No assets pending review</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentAssets.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.title ?? "Untitled Asset"}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{asset.platform ?? "Unknown platform"}</p>
                    </div>
                    <StatusBadge status={asset.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
