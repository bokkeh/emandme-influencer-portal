"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Candidate = {
  id: string;
  name: string;
  email: string;
  tier: string;
  avatarUrl: string | null;
  source: "portal" | "roster";
  enrolled: boolean;
};

type Props = {
  campaignId: string;
  campaignType?: "influencer" | "ugc" | "affiliate";
};

export function CampaignEnrollmentManager({ campaignId, campaignType = "influencer" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [includesFreeProduct, setIncludesFreeProduct] = useState(false);
  const [contentDueDate, setContentDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const singleLabel = campaignType === "influencer" ? "influencer" : "creator";
  const titleLabel = campaignType === "influencer" ? "Influencer" : "Creator";

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.enrolled),
    [candidates]
  );

  async function loadCandidates() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments`);
      if (!res.ok) throw new Error((await res.text()) || `Failed to load ${singleLabel}s`);
      const data = (await res.json()) as Candidate[];
      setCandidates(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${singleLabel}s`;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setCandidateId("");
      setAgreedFee("");
      setIncludesFreeProduct(false);
      setContentDueDate("");
      setNotes("");
      await loadCandidates();
    }
  }

  async function enroll() {
    if (!candidateId) {
      toast.error(`Select a ${singleLabel} to enroll`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          agreedFee: agreedFee ? Number(agreedFee) : null,
          includesFreeProduct,
          contentDueDate: contentDueDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Failed to enroll ${singleLabel}`);

      toast.success(`${titleLabel} enrolled`);
      setOpen(false);
      window.dispatchEvent(new CustomEvent(`campaign-enrollment-updated-${campaignId}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to enroll ${singleLabel}`;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-2" onClick={() => void onOpenChange(true)}>
        <Plus className="h-4 w-4" />
        Enroll {titleLabel}
      </Button>

      <Dialog open={open} onOpenChange={(next) => void onOpenChange(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll {titleLabel}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-gray-500">Loading available {singleLabel}s...</p>
          ) : availableCandidates.length === 0 ? (
            <p className="text-sm text-gray-500">No available {singleLabel}s found to enroll.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>{titleLabel}</Label>
                <Select value={candidateId} onValueChange={setCandidateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${singleLabel}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCandidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} ({candidate.email}) {candidate.source === "roster" ? "- Roster" : "- Portal"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agreed Fee (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={agreedFee}
                  onChange={(e) => setAgreedFee(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enroll-includes-free-product"
                  checked={includesFreeProduct}
                  onCheckedChange={(checked) => setIncludesFreeProduct(Boolean(checked))}
                />
                <Label htmlFor="enroll-includes-free-product" className="cursor-pointer">
                  Includes free product
                </Label>
              </div>
              <div>
                <Label>Content Due Date (optional)</Label>
                <Input type="date" value={contentDueDate} onChange={(e) => setContentDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Enrollment Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => void enroll()} disabled={submitting}>
                  {submitting ? "Enrolling..." : "Enroll"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
