"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const PLATFORMS = ["instagram", "tiktok", "youtube", "pinterest", "blog"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(formData),
      platforms: selectedPlatforms,
    };

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create campaign");
      const campaign = await res.json();
      toast.success("Campaign created!");
      router.push(`/admin/campaigns/${campaign.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create campaign.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/campaigns">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-rose-600" />
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input name="title" placeholder="Summer 2025 Campaign" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" placeholder="Campaign overview and goals..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Budget ($)</Label>
                <Input name="totalBudget" type="number" step="0.01" placeholder="5000.00" />
              </div>
              <div>
                <Label>HubSpot Deal ID</Label>
                <Input name="hubspotDealId" placeholder="optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input name="startDate" type="date" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input name="endDate" type="date" />
              </div>
            </div>
            <div>
              <Label>Platforms</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedPlatforms.includes(p)}
                      onCheckedChange={() => togglePlatform(p)}
                    />
                    <span className="text-sm capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
