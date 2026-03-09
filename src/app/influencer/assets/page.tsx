import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, influencerProfiles, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AssetDeleteButton } from "@/components/influencer/AssetDeleteButton";
import { getSignedReadUrlFromPublicUrl } from "@/lib/storage";
import { LazyVideoPlayer } from "@/components/shared/LazyVideoPlayer";

export default async function InfluencerAssetsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) redirect("/onboarding");

  const [profile] = await db.select({ id: influencerProfiles.id }).from(influencerProfiles).where(eq(influencerProfiles.userId, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  const myAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.influencerProfileId, profile.id))
    .orderBy(assets.createdAt);

  const hydratedAssets = await Promise.all(
    myAssets.map(async (asset) => ({
      ...asset,
      viewUrl: await getSignedReadUrlFromPublicUrl(asset.blobUrl),
      viewThumbnailUrl: asset.thumbnailUrl
        ? await getSignedReadUrlFromPublicUrl(asset.thumbnailUrl)
        : null,
    }))
  );

  const recentReviewedAssets = hydratedAssets.filter((asset) => {
    if (!asset.reviewedAt) return false;
    const reviewedAt = new Date(asset.reviewedAt);
    return Date.now() - reviewedAt.getTime() <= 1000 * 60 * 60 * 24 * 14;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assets</h1>
          <p className="text-sm text-gray-500">{myAssets.length} assets submitted</p>
        </div>
        <Link href="/influencer/upload">
          <Button className="gap-2 bg-rose-600 hover:bg-rose-700">
            <Upload className="h-4 w-4" />
            Upload More
          </Button>
        </Link>
      </div>

      {myAssets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No assets yet"
          description="Upload your first piece of content for review."
          action={
            <Link href="/influencer/upload">
              <Button className="bg-rose-600 hover:bg-rose-700">Upload Content</Button>
            </Link>
          }
        />
      ) : (
        <>
          {recentReviewedAssets.length > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {recentReviewedAssets.length} asset review update{recentReviewedAssets.length > 1 ? "s" : ""} in the
              last 14 days.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {hydratedAssets.map((asset) => {
            const metrics = (asset.metrics as Record<string, number>) ?? {};
            return (
              <Card key={asset.id} className="overflow-hidden border border-gray-200 shadow-sm">
                <div className={`relative flex items-center justify-center bg-gray-100 ${asset.fileType === "video" ? "p-1" : "h-40"}`}>
                  {asset.fileType === "video" ? (
                    <LazyVideoPlayer
                      src={asset.viewUrl}
                      poster={asset.viewThumbnailUrl ?? undefined}
                    />
                  ) : asset.viewThumbnailUrl ? (
                    <img src={asset.viewThumbnailUrl} alt={asset.title ?? "Asset"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-500">No preview</span>
                  )}
                  <div className="absolute left-2 top-2">
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
                <CardContent className="space-y-1.5 p-3">
                  <p className="truncate text-xs font-medium text-gray-900">{asset.title ?? "Untitled"}</p>
                  {asset.platform && <PlatformBadge platform={asset.platform} />}
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}
                  </p>
                  {Object.keys(metrics).length > 0 && (
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      {metrics.views ? <span>Views {metrics.views.toLocaleString()}</span> : null}
                      {metrics.likes ? <span>Likes {metrics.likes.toLocaleString()}</span> : null}
                    </div>
                  )}
                  {asset.status === "approved" ? (
                    <p className="mt-1 rounded bg-green-50 p-1.5 text-xs text-green-700">
                      Approved to go live.
                    </p>
                  ) : null}
                  {asset.reviewNotes && (asset.status === "rejected" || asset.status === "revision_requested") && (
                    <p className="mt-1 rounded bg-red-50 p-1.5 text-xs text-red-500">Review notes: {asset.reviewNotes}</p>
                  )}
                  <div className="pt-1">
                    <AssetDeleteButton assetId={asset.id} />
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </>
      )}
    </div>
  );
}
