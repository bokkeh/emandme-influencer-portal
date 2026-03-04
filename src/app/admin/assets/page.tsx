import { db } from "@/lib/db";
import { assets, influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function AssetsPage() {
  const allAssets = await db
    .select({
      id: assets.id,
      blobUrl: assets.blobUrl,
      thumbnailUrl: assets.thumbnailUrl,
      fileType: assets.fileType,
      contentType: assets.contentType,
      platform: assets.platform,
      title: assets.title,
      status: assets.status,
      createdAt: assets.createdAt,
      influencerId: influencerProfiles.id,
      influencerName: influencerProfiles.displayName,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(assets)
    .innerJoin(influencerProfiles, eq(assets.influencerProfileId, influencerProfiles.id))
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .orderBy(assets.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Library</h1>
        <p className="text-sm text-gray-500">{allAssets.length} total assets</p>
      </div>

      {allAssets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No assets yet"
          description="Assets uploaded by influencers will appear here for review."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {allAssets.map((asset) => {
            const name =
              (asset.influencerName ??
              `${asset.userFirstName ?? ""} ${asset.userLastName ?? ""}`.trim()) ||
              asset.userEmail;
            return (
              <Card key={asset.id} className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.title ?? "Asset"}
                      className="h-full w-full object-cover"
                    />
                  ) : asset.fileType === "video" ? (
                    <div className="flex flex-col items-center text-gray-400">
                      <span className="text-3xl">🎬</span>
                      <span className="text-xs mt-1">Video</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <span className="text-3xl">🖼️</span>
                      <span className="text-xs mt-1">Image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {asset.title ?? "Untitled"}
                  </p>
                  <Link
                    href={`/admin/influencers/${asset.influencerId}`}
                    className="text-xs text-gray-400 hover:text-rose-600 truncate block"
                  >
                    {name}
                  </Link>
                  {asset.platform && <PlatformBadge platform={asset.platform} />}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}
                  </p>
                  {asset.status === "pending_review" && (
                    <div className="mt-2 flex gap-1.5">
                      <button className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">
                        Approve
                      </button>
                      <button className="flex-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">
                        Reject
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
