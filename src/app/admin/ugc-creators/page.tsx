import Link from "next/link";
import { db } from "@/lib/db";
import { influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TierBadge } from "@/components/shared/TierBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Camera, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default async function UGCCreatorsPage() {
  const creators = await db
    .select({
      id: influencerProfiles.id,
      displayName: influencerProfiles.displayName,
      tier: influencerProfiles.tier,
      niche: influencerProfiles.niche,
      totalAssetsSubmitted: influencerProfiles.totalAssetsSubmitted,
      totalEarnings: influencerProfiles.totalEarnings,
      joinedAt: influencerProfiles.joinedAt,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(users.role, "ugc_creator"))
    .orderBy(influencerProfiles.joinedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UGC Creators</h1>
          <p className="text-sm text-gray-500">{creators.length} total creators</p>
        </div>
        <Button className="bg-pink-600 hover:bg-pink-700 gap-2">
          <UserPlus className="h-4 w-4" />
          Add Creator
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {creators.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No UGC creators yet"
            description="Add your first UGC creator to manage their content and payments."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Creator</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((c) => {
                const name =
                  (c.displayName ??
                  `${c.userFirstName ?? ""} ${c.userLastName ?? ""}`.trim()) ||
                  c.userEmail;
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={c.userAvatarUrl ?? undefined} />
                          <AvatarFallback className="bg-pink-100 text-pink-700 text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/admin/ugc-creators/${c.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-pink-600"
                          >
                            {name}
                          </Link>
                          <p className="text-xs text-gray-400">{c.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><TierBadge tier={c.tier} /></TableCell>
                    <TableCell className="text-sm text-gray-600 capitalize">{c.niche ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{c.totalAssetsSubmitted}</TableCell>
                    <TableCell className="text-sm font-medium">
                      ${Number(c.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(c.joinedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/ugc-creators/${c.id}`}>
                        <Button variant="ghost" size="sm" className="text-pink-600 hover:text-pink-700">View →</Button>
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
