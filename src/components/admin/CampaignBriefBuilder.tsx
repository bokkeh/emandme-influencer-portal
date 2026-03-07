"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CampaignBriefContent = {
  campaignOverview?: string;
  brandIntroduction?: string;
  campaignGoals?: string;
  deliverables?: string;
  creativeDirection?: string;
  keyProductPoints?: string;
  messagingGuidelines?: string;
  visualGuidelines?: string;
  taggingHashtags?: string;
  linkDiscountCode?: string;
  timeline?: string;
  ftcDisclosure?: string;
  dosAndDonts?: string;
};

type Props = {
  campaignId: string;
  initialBrief: string;
  initialBriefUrl: string;
  initialBriefContent?: CampaignBriefContent | null;
  initialBriefShareToken?: string | null;
  appUrl?: string | null;
};

const SECTION_DEFS: Array<{ key: keyof CampaignBriefContent; label: string; placeholder: string }> = [
  {
    key: "campaignOverview",
    label: "1. Campaign Overview",
    placeholder: "Campaign name, what you are promoting, campaign goal, and why you chose this creator.",
  },
  {
    key: "brandIntroduction",
    label: "2. Brand Introduction",
    placeholder: "Who you are, what makes the brand unique, tone of voice, and audience.",
  },
  {
    key: "campaignGoals",
    label: "3. Campaign Goals",
    placeholder: "Define success metrics and what outcomes matter most for this campaign.",
  },
  {
    key: "deliverables",
    label: "4. Deliverables",
    placeholder: "Required posts, format, platform, timeline, and content-live expectations.",
  },
  {
    key: "creativeDirection",
    label: "5. Creative Direction",
    placeholder: "Loose creative prompts and story directions creators can adapt to their style.",
  },
  {
    key: "keyProductPoints",
    label: "6. Key Product Points",
    placeholder: "Top product benefits to feature (short list only).",
  },
  {
    key: "messagingGuidelines",
    label: "7. Messaging Guidelines",
    placeholder: "Soft talking points and brand themes. Avoid strict scripts unless required.",
  },
  {
    key: "visualGuidelines",
    label: "8. Visual Guidelines",
    placeholder: "Preferred visual style and what to avoid (lighting, backgrounds, framing).",
  },
  {
    key: "taggingHashtags",
    label: "9. Tagging + Hashtags",
    placeholder: "Required tags and hashtags.",
  },
  {
    key: "linkDiscountCode",
    label: "10. Link / Discount Code",
    placeholder: "Creator link and/or code to include.",
  },
  {
    key: "timeline",
    label: "11. Timeline",
    placeholder: "Ship date, draft due date, and posting window.",
  },
  {
    key: "ftcDisclosure",
    label: "12. FTC Disclosure",
    placeholder: "Required disclosure text, tags, or platform disclosure instructions.",
  },
  {
    key: "dosAndDonts",
    label: "Do's and Don'ts",
    placeholder: "Practical examples of what to do and what to avoid.",
  },
];

function buildShareUrl(appUrl: string | null | undefined, token: string | null | undefined) {
  if (!token) return "";
  const base = appUrl?.trim();
  if (!base) return `/brief/${token}`;
  return `${base.replace(/\/$/, "")}/brief/${token}`;
}

export function CampaignBriefBuilder({
  campaignId,
  initialBrief,
  initialBriefUrl,
  initialBriefContent,
  initialBriefShareToken,
  appUrl,
}: Props) {
  const [brief, setBrief] = useState(initialBrief);
  const [briefUrl, setBriefUrl] = useState(initialBriefUrl);
  const [briefContent, setBriefContent] = useState<CampaignBriefContent>(initialBriefContent ?? {});
  const [briefShareToken, setBriefShareToken] = useState(initialBriefShareToken ?? "");
  const [saving, setSaving] = useState(false);

  const shareUrl = buildShareUrl(appUrl, briefShareToken);

  async function saveBrief() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: brief,
          briefUrl,
          briefContent,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save brief");
      const updated = (await res.json()) as { briefShareToken?: string | null };
      if (updated.briefShareToken) setBriefShareToken(updated.briefShareToken);
      toast.success("Campaign brief saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save brief";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Campaign Brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <Label>Public Share URL (no login required)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={shareUrl} placeholder="Save brief to generate share URL" />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!shareUrl) return;
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success("Brief link copied");
                }}
                disabled={!shareUrl}
              >
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!shareUrl) return;
                  window.open(shareUrl, "_blank", "noopener,noreferrer");
                }}
                disabled={!shareUrl}
              >
                Open
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Brief URL (Drive/Notion)</Label>
          <Input value={briefUrl} onChange={(e) => setBriefUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div>
          <Label>Internal Brief Notes</Label>
          <Textarea
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Internal notes for your team."
          />
        </div>

        <div className="space-y-4">
          {SECTION_DEFS.map((section) => (
            <div key={section.key}>
              <Label>{section.label}</Label>
              <Textarea
                rows={4}
                value={briefContent[section.key] ?? ""}
                onChange={(e) =>
                  setBriefContent((prev) => ({
                    ...prev,
                    [section.key]: e.target.value,
                  }))
                }
                placeholder={section.placeholder}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button className="bg-rose-600 hover:bg-rose-700" disabled={saving} onClick={() => void saveBrief()}>
            {saving ? "Saving..." : "Save Brief"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
