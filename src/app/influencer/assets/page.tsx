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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assets</h1>
          <p className="text-sm text-gray-500">{myAssets.length} assets submitted</p>
        </div>
        <Link href="/influencer/upload">
          <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {myAssets.map((asset) => {
            const metrics = asset.metrics as Record<string, number> ?? {};
            return (
              <Card key={asset.id} className="border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  {asset.thumbnailUrl ? (
                    <img src={asset.thumbnailUrl} alt={asset.title ?? "Asset"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">{asset.fileType === "video" ? "🎬" : "🖼️"}</span>
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
                <CardContent className="p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-900 truncate">{asset.title ?? "Untitled"}</p>
                  {asset.platform && <PlatformBadge platform={asset.platform} />}
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}
                  </p>
                  {Object.keys(metrics).length > 0 && (
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      {metrics.views && <span>👁 {metrics.views.toLocaleString()}</span>}
                      {metrics.likes && <span>❤️ {metrics.likes.toLocaleString()}</span>}
                    </div>
                  )}
                  {asset.reviewNotes && asset.status === "rejected" && (
                    <p className="text-xs text-red-500 bg-red-50 rounded p-1.5 mt-1">{asset.reviewNotes}</p>
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
