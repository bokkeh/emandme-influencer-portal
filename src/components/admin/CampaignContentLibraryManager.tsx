"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { StatusBadge } from "@/components/shared/StatusBadge";

type CampaignProduct = {
  shopifyProductId: string;
  title: string;
  imageUrl?: string;
};

type CampaignAsset = {
  id: string;
  blobUrl: string;
  thumbnailUrl: string | null;
  fileType: string;
  title: string | null;
  status: "pending_review" | "approved" | "rejected" | "revision_requested";
};

type BriefContent = {
  contentLibraryMedia?: Array<{ url: string; fileType: "image" | "video"; name?: string }>;
  copySnippets?: string[];
};

type Props = {
  campaignId: string;
  selectedProducts: CampaignProduct[];
  campaignAssets: CampaignAsset[];
  initialBriefContent: BriefContent;
};

export function CampaignContentLibraryManager({
  campaignId,
  selectedProducts,
  campaignAssets,
  initialBriefContent,
}: Props) {
  const [media, setMedia] = useState(initialBriefContent.contentLibraryMedia ?? []);
  const [snippets, setSnippets] = useState(initialBriefContent.copySnippets ?? []);
  const [newSnippet, setNewSnippet] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefContent: {
            ...initialBriefContent,
            contentLibraryMedia: media,
            copySnippets: snippets,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save content library");
      toast.success("Content library saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save content library";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-media", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to upload media");
      const uploaded = (await res.json()) as { url: string; fileType: "image" | "video"; name?: string };
      setMedia((prev) => [...prev, uploaded]);
      toast.success("Media uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload media";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function downloadSnippet(text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaign-snippet.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No products selected yet in the Brief tab.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {selectedProducts.map((product) => (
                <div key={product.shopifyProductId} className="rounded-md border border-gray-200 p-2">
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-28 w-full rounded object-cover" /> : null}
                  <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-800">{product.title}</p>
                  {product.imageUrl ? (
                    <a href={product.imageUrl} download className="mt-2 inline-flex text-xs text-rose-600 underline">
                      Download
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Campaign Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignAssets.length === 0 ? (
            <p className="text-sm text-gray-500">No influencer uploads yet for this campaign.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {campaignAssets.map((asset) => (
                <div key={asset.id} className="rounded-md border border-gray-200 p-2">
                  {asset.thumbnailUrl ? (
                    <img src={asset.thumbnailUrl} alt={asset.title ?? "Asset"} className="h-28 w-full rounded object-cover" />
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                      {asset.fileType}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={asset.status} />
                    <a href={asset.blobUrl} download className="text-xs text-rose-600 underline">
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Extra Media Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void uploadFile(file);
              e.currentTarget.value = "";
            }}
            disabled={uploading}
          />
          {uploading ? <p className="text-xs text-gray-500">Uploading...</p> : null}
          {media.length > 0 ? (
            <div className="space-y-2">
              {media.map((item, index) => (
                <div key={`${item.url}-${index}`} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                  <p className="truncate pr-3 text-gray-700">{item.name ?? item.url}</p>
                  <div className="flex items-center gap-2">
                    <a href={item.url} download className="text-xs text-rose-600 underline">
                      Download
                    </a>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Copy Snippets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={newSnippet}
              onChange={(e) => setNewSnippet(e.target.value)}
              placeholder="Add a caption/snippet for creators..."
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (!newSnippet.trim()) return;
                setSnippets((prev) => [...prev, newSnippet.trim()]);
                setNewSnippet("");
              }}
            >
              <Plus className="h-4 w-4" />
              Add Snippet
            </Button>
          </div>

          {snippets.length > 0 ? (
            <div className="space-y-2">
              {snippets.map((snippet, index) => (
                <div key={`${index}-${snippet.slice(0, 12)}`} className="rounded-md border border-gray-200 p-3">
                  <p className="text-sm text-gray-700">{snippet}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <CopyButton text={snippet} label="Copy snippet" />
                    <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => downloadSnippet(snippet)}>
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-gray-500"
                      onClick={() => setSnippets((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" className="bg-rose-600 hover:bg-rose-700" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save Content Library"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

