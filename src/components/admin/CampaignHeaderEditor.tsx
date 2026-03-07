"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  campaignId: string;
  initialTitle: string;
  initialDescription: string;
  initialPlatforms: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog">;
  initialTotalBudget: string | null;
  initialStartDate: Date | string | null;
  initialEndDate: Date | string | null;
};

const PLATFORMS: Array<"instagram" | "tiktok" | "youtube" | "pinterest" | "blog"> = [
  "instagram",
  "tiktok",
  "youtube",
  "pinterest",
  "blog",
];

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function CampaignHeaderEditor({
  campaignId,
  initialTitle,
  initialDescription,
  initialPlatforms,
  initialTotalBudget,
  initialStartDate,
  initialEndDate,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [totalBudget, setTotalBudget] = useState(initialTotalBudget ?? "");
  const [startDate, setStartDate] = useState(toDateInput(initialStartDate));
  const [endDate, setEndDate] = useState(toDateInput(initialEndDate));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function togglePlatform(platform: "instagram" | "tiktok" | "youtube" | "pinterest" | "blog") {
    setPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          platforms,
          totalBudget: totalBudget || null,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update campaign");
      toast.success("Campaign updated");
      setEditing(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update campaign";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="w-full space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign name" />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Campaign description"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-xs capitalize">
              <Checkbox checked={platforms.includes(platform)} onCheckedChange={() => togglePlatform(platform)} />
              {platform}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            type="number"
            step="0.01"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            placeholder="Total budget"
          />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="bg-rose-600 hover:bg-rose-700"
            disabled={saving || !title.trim()}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              setTitle(initialTitle);
              setDescription(initialDescription);
              setPlatforms(initialPlatforms);
              setTotalBudget(initialTotalBudget ?? "");
              setStartDate(toDateInput(initialStartDate));
              setEndDate(toDateInput(initialEndDate));
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
      {description ? <p className="mt-2 text-gray-600">{description}</p> : null}
    </div>
  );
}
