import Link from "next/link";
import { db } from "@/lib/db";
import {
  influencerProfiles,
  users,
  socialAccounts,
  campaignInfluencers,
} from "@/lib/db/schema";
import { eq, count, ilike, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/shared/TierBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function InfluencersPage() {
  const influencers = await db
    .select({
      id: influencerProfiles.id,
      displayName: influencerProfiles.displayName,
      tier: influencerProfiles.tier,
      niche: influencerProfiles.niche,
      totalEarnings: influencerProfiles.totalEarnings,
      totalCampaigns: influencerProfiles.totalCampaigns,
      stripeAccountStatus: influencerProfiles.stripeAccountStatus,
      hubspotContactId: influencerProfiles.hubspotContactId,
      isVerified: influencerProfiles.isVerified,
      joinedAt: influencerProfiles.joinedAt,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      role: users.role,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(users.role, "influencer"))
    .orderBy(influencerProfiles.joinedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
          <p className="text-sm text-gray-500">{influencers.length} total influencers</p>
        </div>
        <Link href="/admin/influencers/new">
          <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
            <UserPlus className="h-4 w-4" />
            Add Influencer
          </Button>
        </Link>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {influencers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No influencers yet"
            description="Add your first influencer to get started."
            action={
              <Link href="/admin/influencers/new">
                <Button className="bg-rose-600 hover:bg-rose-700">Add Influencer</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Influencer</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>HubSpot</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencers.map((inf) => {
                const name =
                  (inf.displayName ??
                  `${inf.userFirstName ?? ""} ${inf.userLastName ?? ""}`.trim()) ||
                  inf.userEmail;
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <TableRow key={inf.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={inf.userAvatarUrl ?? undefined} />
                          <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/admin/influencers/${inf.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-rose-600"
                          >
                            {name}
                          </Link>
                          <p className="text-xs text-gray-400">{inf.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={inf.tier} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 capitalize">{inf.niche ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-900">{inf.totalCampaigns}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-900">
                        ${Number(inf.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inf.stripeAccountStatus} />
                    </TableCell>
                    <TableCell>
                      {inf.hubspotContactId ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 text-xs">Not synced</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/influencers/${inf.id}`}>
                        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                          View →
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
