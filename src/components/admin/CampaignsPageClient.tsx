"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, LayoutGrid, List, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";

type CampaignRow = {
  id: string;
  title: string;
  platforms: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog">;
  totalBudget: string | null;
  totalRevenue: string;
  startDate: Date | null;
  endDate: Date | null;
  campaignType: string;
};

type ViewMode = "grid" | "list";

function CampaignCard({
  campaign,
  onDelete,
  deleting,
  listMode,
}: {
  campaign: CampaignRow;
  onDelete: (id: string) => void;
  deleting: boolean;
  listMode: boolean;
}) {
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all">
      <CardContent className={listMode ? "p-5" : "p-5"}>
        <div className={`flex ${listMode ? "items-center justify-between gap-4" : "items-start justify-between gap-3"}`}>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight text-gray-900">{campaign.title}</h3>
            <div className="mt-1">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                {campaign.campaignType}
              </span>
            </div>
            {campaign.platforms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {campaign.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:max-w-sm">
              {campaign.totalBudget ? (
                <div>
                  <p className="text-xs font-medium text-gray-400">BUDGET</p>
                  <p className="font-semibold text-gray-900">${Number(campaign.totalBudget).toLocaleString()}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-gray-400">REVENUE</p>
                <p className="font-semibold text-green-700">${Number(campaign.totalRevenue).toLocaleString()}</p>
              </div>
            </div>
            {(campaign.startDate || campaign.endDate) && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <CalendarDays className="h-3.5 w-3.5" />
                {campaign.startDate && format(new Date(campaign.startDate), "MMM d")}
                {campaign.startDate && campaign.endDate && " - "}
                {campaign.endDate && format(new Date(campaign.endDate), "MMM d, yyyy")}
              </div>
            )}
          </div>
          <div className={`flex ${listMode ? "flex-row" : "flex-col"} gap-2`}>
            <Link href={`/admin/campaigns/${campaign.id}`}>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                Open
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={deleting}
              onClick={() => onDelete(campaign.id)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignsPageClient({ initialCampaigns }: { initialCampaigns: CampaignRow[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime()),
    [campaigns]
  );

  async function deleteCampaign(id: string) {
    const confirmDelete = window.confirm("Delete this campaign? This cannot be undone.");
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete campaign");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete campaign";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">{campaigns.length} total campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className={viewMode === "grid" ? "h-8 bg-gray-900 hover:bg-gray-800" : "h-8"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              Grid
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className={viewMode === "list" ? "h-8 bg-gray-900 hover:bg-gray-800" : "h-8"}
              onClick={() => setViewMode("list")}
            >
              <List className="mr-1.5 h-4 w-4" />
              List
            </Button>
          </div>
          <Link href="/admin/campaigns/new">
            <Button className="gap-2 bg-rose-600 hover:bg-rose-700">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {sortedCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start managing influencer partnerships."
          action={
            <Link href="/admin/campaigns/new">
              <Button className="bg-rose-600 hover:bg-rose-700">Create Campaign</Button>
            </Link>
          }
        />
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {sortedCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={deleteCampaign}
              deleting={deletingId === campaign.id}
              listMode={viewMode === "list"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

