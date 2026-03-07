"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type ChecklistItem = {
  label: string;
  done: boolean;
};

type Props = {
  campaignId: string;
  canSubmitPetInfo: boolean;
  checklist: ChecklistItem[];
  initialPetInfo: {
    petName: string;
    petBreed: string;
    petAge: string;
    petPersonality: string;
    tagPersonalizationText: string;
  };
};

export function CampaignProgressCard({ campaignId, canSubmitPetInfo, checklist, initialPetInfo }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [petName, setPetName] = useState(initialPetInfo.petName);
  const [petBreed, setPetBreed] = useState(initialPetInfo.petBreed);
  const [petAge, setPetAge] = useState(initialPetInfo.petAge);
  const [petPersonality, setPetPersonality] = useState(initialPetInfo.petPersonality);
  const [tagPersonalizationText, setTagPersonalizationText] = useState(initialPetInfo.tagPersonalizationText);

  const completed = checklist.filter((item) => item.done).length;
  const percent = Math.round((completed / checklist.length) * 100);

  async function submitPetInfo() {
    if (!petName.trim() || !petBreed.trim() || !petAge.trim() || !petPersonality.trim() || !tagPersonalizationText.trim()) {
      toast.error("Please complete all pet info fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/influencer/campaigns/${campaignId}/pet-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName,
          petBreed,
          petAge,
          petPersonality,
          tagPersonalizationText,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to submit pet info");
      toast.success("Pet tag info submitted");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit pet info";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Campaign Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-gray-700">{percent}% Complete</p>
            <p className="text-gray-500">
              {completed}/{checklist.length}
            </p>
          </div>
          <Progress value={percent} className="h-2 bg-gray-100 [&_[data-slot=progress-indicator]]:bg-rose-600" />
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
              <span className={item.done ? "text-gray-800" : "text-gray-500"}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-md border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-900">Pet Tag Information</p>
          {!canSubmitPetInfo ? (
            <p className="text-xs text-amber-700">
              Your enrollment is not approved yet. You can submit pet details after approval.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Pet name</Label>
              <Input value={petName} onChange={(e) => setPetName(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Breed</Label>
              <Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Age</Label>
              <Input value={petAge} onChange={(e) => setPetAge(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div className="sm:col-span-2">
              <Label>Personality</Label>
              <Textarea
                rows={2}
                value={petPersonality}
                onChange={(e) => setPetPersonality(e.target.value)}
                disabled={!canSubmitPetInfo || saving}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Tag personalization text</Label>
              <Textarea
                rows={2}
                value={tagPersonalizationText}
                onChange={(e) => setTagPersonalizationText(e.target.value)}
                disabled={!canSubmitPetInfo || saving}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void submitPetInfo()}
              disabled={!canSubmitPetInfo || saving}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {saving ? "Saving..." : "Submit Pet Info"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

