import { db } from "@/lib/db";
import { assets, influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { CopyButton } from "@/components/shared/CopyButton";
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
              <Card key={asset.id} className="overflow-hidden border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                <div className="relative flex h-40 items-center justify-center bg-gray-100">
                  {asset.fileType === "video" ? (
                    <video
                      className="h-full w-full bg-black object-cover"
                      controls
                      preload="metadata"
                      playsInline
                      poster={asset.thumbnailUrl ?? undefined}
                    >
                      <source src={asset.blobUrl} />
                    </video>
                  ) : asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.title ?? "Asset"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-gray-500">No preview</div>
                  )}
                  <div className="absolute right-2 top-2">
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-xs font-medium text-gray-900">{asset.title ?? "Untitled"}</p>
                  <Link
                    href={`/admin/influencers/${asset.influencerId}`}
                    className="block truncate text-xs text-gray-400 hover:text-rose-600"
                  >
                    {name}
                  </Link>
                  {asset.platform && <PlatformBadge platform={asset.platform} />}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={asset.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 underline"
                    >
                      Open
                    </a>
                    <CopyButton text={asset.blobUrl} label="Copy link" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
