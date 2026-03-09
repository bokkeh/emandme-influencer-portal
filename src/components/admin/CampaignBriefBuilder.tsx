"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CampaignBriefContent = {
  heroImageUrl?: string;
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
  campaignType: "influencer" | "ugc" | "affiliate";
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

function getSectionDefs(campaignType: "influencer" | "ugc" | "affiliate") {
  return SECTION_DEFS.filter((section) => {
    if (campaignType === "ugc" && section.key === "taggingHashtags") return false;
    if ((campaignType === "ugc" || campaignType === "affiliate") && section.key === "ftcDisclosure") return false;
    return true;
  });
}

function buildShareUrl(appUrl: string | null | undefined, token: string | null | undefined) {
  if (!token) return "";
  const base = appUrl?.trim();
  if (!base) return `/brief/${token}`;
  return `${base.replace(/\/$/, "")}/brief/${token}`;
}

function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  function exec(command: string, valueArg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html === "<br>" ? "" : html);
  }

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>";

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 rounded-md border border-gray-200">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
          <Button type="button" variant="outline" size="icon-xs" onClick={() => exec("bold")} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon-xs" onClick={() => exec("italic")} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => exec("insertUnorderedList")}
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => exec("insertOrderedList")}
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => {
              const href = window.prompt("Enter URL");
              if (!href) return;
              exec("createLink", href);
            }}
            title="Insert link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative">
          {isEmpty && !isFocused ? (
            <p className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400">{placeholder}</p>
          ) : null}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
            className="min-h-[110px] p-3 text-sm text-gray-900 focus:outline-none [&_a]:text-rose-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          />
        </div>
      </div>
    </div>
  );
}

export function CampaignBriefBuilder({
  campaignId,
  campaignType,
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
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);

  const shareUrl = buildShareUrl(appUrl, briefShareToken);
  const visibleSections = getSectionDefs(campaignType);

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

  async function uploadHeroImage(file: File) {
    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to upload image");
      const data = (await res.json()) as { url: string };
      setBriefContent((prev) => ({ ...prev, heroImageUrl: data.url }));
      toast.success("Header image uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setUploadingHero(false);
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
          <Label>Header Image URL (full-width image above logo/title)</Label>
          <div className="space-y-2">
            <Input
              value={briefContent.heroImageUrl ?? ""}
              onChange={(e) =>
                setBriefContent((prev) => ({
                  ...prev,
                  heroImageUrl: e.target.value,
                }))
              }
              placeholder="https://..."
            />
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadHeroImage(file);
                  e.currentTarget.value = "";
                }}
                disabled={uploadingHero}
              />
              {uploadingHero ? <p className="text-xs text-gray-500">Uploading...</p> : null}
            </div>
            <p className="text-xs text-gray-500">Use either URL or upload image file.</p>
          </div>
        </div>

        <div>
          <Label>Internal Brief Notes</Label>
          <div className="mt-1 rounded-md border border-gray-200 p-2">
            <Textarea
              rows={4}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Internal notes for your team."
            />
          </div>
        </div>

        <div className="space-y-4">
          {visibleSections.map((section) => (
            <RichTextEditor
              key={section.key}
              label={section.label}
              value={briefContent[section.key] ?? ""}
              onChange={(next) =>
                setBriefContent((prev) => ({
                  ...prev,
                  [section.key]: next,
                }))
              }
              placeholder={section.placeholder}
            />
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
