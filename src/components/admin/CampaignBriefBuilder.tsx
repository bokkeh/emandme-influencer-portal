"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  campaignId: string;
  initialBrief: string;
  initialBriefUrl: string;
};

export function CampaignBriefBuilder({ campaignId, initialBrief, initialBriefUrl }: Props) {
  const [brief, setBrief] = useState(initialBrief);
  const [briefUrl, setBriefUrl] = useState(initialBriefUrl);
  const [saving, setSaving] = useState(false);

  async function saveBrief() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: brief,
          briefUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save brief");
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
      <CardContent className="space-y-3">
        <div>
          <Label>Brief URL (Drive/Notion)</Label>
          <Input value={briefUrl} onChange={(e) => setBriefUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Brief Notes</Label>
          <Textarea
            rows={8}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Goals, hooks, creative direction, deliverables, timelines, CTA..."
          />
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
