import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { influencerProfiles, users, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/shared/TierBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function UGCCreatorDetailPage({
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
      totalEarnings: influencerProfiles.totalEarnings,
      totalAssetsSubmitted: influencerProfiles.totalAssetsSubmitted,
      joinedAt: influencerProfiles.joinedAt,
      notes: influencerProfiles.notes,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userAvatarUrl: users.avatarUrl,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(influencerProfiles.id, id))
    .limit(1);

  if (!profile) notFound();

  const myAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.influencerProfileId, id))
    .orderBy(assets.createdAt);

  const name =
    (profile.displayName ??
    `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim()) ||
    profile.userEmail;

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/ugc-creators">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to UGC Creators
          </Button>
        </Link>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.userAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-pink-100 text-pink-700 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <TierBadge tier={profile.tier} />
              </div>
              <p className="text-sm text-gray-500">{profile.userEmail}</p>
              {profile.niche && (
                <p className="text-sm text-gray-600 capitalize mt-1">{profile.niche}</p>
              )}
              {profile.bio && (
                <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-medium">ASSETS SUBMITTED</p>
              <p className="text-2xl font-bold text-gray-900">{profile.totalAssetsSubmitted}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">TOTAL EARNINGS</p>
              <p className="text-2xl font-bold text-green-700">
                ${Number(profile.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">JOINED</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDistanceToNow(new Date(profile.joinedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Assets ({myAssets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myAssets.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No assets submitted yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {myAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                >
                  <div className="h-32 flex items-center justify-center bg-gray-100">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title ?? "Asset"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{asset.fileType === "video" ? "🎬" : "🖼️"}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {asset.title ?? "Untitled"}
                    </p>
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {profile.notes && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Admin Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
