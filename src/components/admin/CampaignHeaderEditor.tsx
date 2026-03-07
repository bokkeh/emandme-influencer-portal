"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  campaignId: string;
  initialTitle: string;
  initialDescription: string;
};

export function CampaignHeaderEditor({ campaignId, initialTitle, initialDescription }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update campaign");
      toast.success("Campaign updated");
      setEditing(false);
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

