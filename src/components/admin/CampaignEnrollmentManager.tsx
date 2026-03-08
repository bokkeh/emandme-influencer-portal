"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
};

export function CampaignEnrollmentManager({ campaignId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [contentDueDate, setContentDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.enrolled),
    [candidates]
  );

  async function loadCandidates() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments`);
      if (!res.ok) throw new Error((await res.text()) || "Failed to load influencers");
      const data = (await res.json()) as Candidate[];
      setCandidates(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load influencers";
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
      setContentDueDate("");
      setNotes("");
      await loadCandidates();
    }
  }

  async function enroll() {
    if (!candidateId) {
      toast.error("Select an influencer to enroll");
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
          contentDueDate: contentDueDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to enroll influencer");

      toast.success("Influencer enrolled");
      setOpen(false);
      window.dispatchEvent(new CustomEvent(`campaign-enrollment-updated-${campaignId}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enroll influencer";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-2" onClick={() => void onOpenChange(true)}>
        <Plus className="h-4 w-4" />
        Enroll Influencer
      </Button>

      <Dialog open={open} onOpenChange={(next) => void onOpenChange(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Influencer</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-gray-500">Loading available influencers...</p>
          ) : availableCandidates.length === 0 ? (
            <p className="text-sm text-gray-500">No available influencers found to enroll.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Influencer</Label>
                <Select value={candidateId} onValueChange={setCandidateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select influencer" />
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
