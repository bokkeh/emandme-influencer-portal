import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, influencerProfiles, utmLinks, discountCodes, campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/shared/CopyButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Link2, Tag } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default async function InfluencerLinksPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) redirect("/onboarding");

  const [profile] = await db.select({ id: influencerProfiles.id }).from(influencerProfiles).where(eq(influencerProfiles.userId, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  const [myLinks, myCodes] = await Promise.all([
    db.select().from(utmLinks).where(eq(utmLinks.influencerProfileId, profile.id)).orderBy(utmLinks.createdAt),
    db.select().from(discountCodes).where(eq(discountCodes.influencerProfileId, profile.id)).orderBy(discountCodes.createdAt),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Links & Codes</h1>
        <p className="text-sm text-gray-500">Your tracking links and discount codes</p>
      </div>

      {/* UTM Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-rose-600" />
          Tracking Links ({myLinks.length})
        </h2>
        {myLinks.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No tracking links yet"
            description="The Em & Me Studio team will assign tracking links to your campaigns."
          />
        ) : (
          <div className="space-y-3">
            {myLinks.map((link) => (
              <Card key={link.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{link.label ?? "Tracking Link"}</p>
                      <p className="mt-1 font-mono text-xs text-gray-500 break-all">{link.fullUrl}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        {link.utmSource && <span>source: <strong>{link.utmSource}</strong></span>}
                        {link.utmMedium && <span>medium: <strong>{link.utmMedium}</strong></span>}
                        {link.utmCampaign && <span>campaign: <strong>{link.utmCampaign}</strong></span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{link.clicks} clicks tracked</p>
                    </div>
                    <CopyButton text={link.fullUrl} label="Copy" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Discount Codes */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-5 w-5 text-purple-600" />
          Discount Codes ({myCodes.length})
        </h2>
        {myCodes.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No discount codes yet"
            description="Discount codes will appear here once the team creates them for your campaigns."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myCodes.map((dc) => (
              <Card key={dc.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="text-center mb-3">
                    <p className="font-mono text-2xl font-bold text-purple-900">{dc.code}</p>
                    <p className="text-sm text-purple-600 mt-1">
                      {dc.discountType === "percentage" ? `${dc.discountValue}% off` : `$${dc.discountValue} off`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{dc.usageCount} uses</span>
                    <span>${Number(dc.revenueGenerated).toFixed(2)} revenue</span>
                    {dc.expiresAt && <span>Expires {format(new Date(dc.expiresAt), "MMM d")}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={dc.isActive ? "active" : "cancelled"} />
                    <CopyButton text={dc.code} label="Copy Code" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
