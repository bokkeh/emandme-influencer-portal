"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/shared/CopyButton";
import { Link2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = ["instagram", "tiktok", "youtube", "pinterest", "blog"];
const CONTENT_TYPES: Record<string, string[]> = {
  instagram: ["reel", "story", "static_post"],
  tiktok: ["tiktok_video"],
  youtube: ["youtube_video", "youtube_short"],
  pinterest: ["pin"],
  blog: ["blog_post"],
};

export default function UTMGeneratorPage() {
  const [baseUrl, setBaseUrl] = useState("https://emandmestudio.com");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [campaignSlug, setCampaignSlug] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loading, setLoading] = useState(false);

  function generate() {
    if (!baseUrl || !handle || !platform) {
      toast.error("Please fill in all required fields");
      return;
    }
    const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");
    const utmSource = "influencer";
    const utmMedium = contentType ? `${sanitize(platform)}-${sanitize(contentType)}` : sanitize(platform);
    const utmCampaign = campaignSlug ? sanitize(campaignSlug) : `emandme_${new Date().getFullYear()}`;
    const utmContent = sanitize(handle);

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("utm_source", utmSource);
      url.searchParams.set("utm_medium", utmMedium);
      url.searchParams.set("utm_campaign", utmCampaign);
      url.searchParams.set("utm_content", utmContent);
      setGeneratedUrl(url.toString());
    } catch {
      toast.error("Invalid base URL");
    }
  }

  const params = generatedUrl ? new URL(generatedUrl) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">UTM Generator</h1>
        <p className="text-sm text-gray-500">Generate tracking links for influencer campaigns</p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-rose-600" />
            Generate UTM Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Base URL *</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://emandmestudio.com/products/..."
              />
            </div>

            <div>
              <Label>Influencer Handle *</Label>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@influencer_name"
              />
            </div>

            <div>
              <Label>Platform *</Label>
              <Select value={platform} onValueChange={(v) => { setPlatform(v); setContentType(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {platform && CONTENT_TYPES[platform] && (
              <div>
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES[platform].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Campaign Slug</Label>
              <Input
                value={campaignSlug}
                onChange={(e) => setCampaignSlug(e.target.value)}
                placeholder="summer_sale_2025"
              />
            </div>
          </div>

          <Button onClick={generate} className="bg-rose-600 hover:bg-rose-700 gap-2 w-full">
            <Link2 className="h-4 w-4" />
            Generate Link
          </Button>
        </CardContent>
      </Card>

      {generatedUrl && (
        <Card className="border border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-rose-700 mb-1">GENERATED LINK</p>
              <div className="flex items-center gap-3">
                <p className="flex-1 break-all font-mono text-sm text-gray-800 bg-white rounded border border-rose-200 p-3">
                  {generatedUrl}
                </p>
                <CopyButton text={generatedUrl} label="Copy" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {params && Array.from(params.searchParams.entries())
                .filter(([k]) => k.startsWith("utm_"))
                .map(([k, v]) => (
                  <div key={k} className="rounded bg-white border border-rose-200 p-2">
                    <p className="text-xs text-rose-500 font-medium">{k}</p>
                    <p className="text-xs text-gray-800 font-mono break-all">{v}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
