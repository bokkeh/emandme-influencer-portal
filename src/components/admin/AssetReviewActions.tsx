"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  assetId: string;
  currentStatus: "pending_review" | "approved" | "rejected" | "revision_requested";
  initialReviewNotes?: string | null;
};

export function AssetReviewActions({ assetId, currentStatus, initialReviewNotes }: Props) {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState(initialReviewNotes ?? "");
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);

  async function update(status: "approved" | "rejected" | "revision_requested") {
    setSubmittingStatus(status);
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (!res.ok) {
        const message = (await res.text()) || "Failed to update asset review";
        throw new Error(message);
      }
      toast.success(`Asset ${status.replace("_", " ")}.`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update asset review";
      toast.error(message);
    } finally {
      setSubmittingStatus(null);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Review</p>
      <Textarea
        rows={2}
        value={reviewNotes}
        onChange={(event) => setReviewNotes(event.target.value)}
        placeholder="Optional feedback for influencer..."
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 bg-green-600 px-2.5 text-xs hover:bg-green-700"
          onClick={() => void update("approved")}
          disabled={submittingStatus !== null && submittingStatus !== "approved"}
        >
          {submittingStatus === "approved" ? "Saving..." : "Approve"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-amber-400 px-2.5 text-xs text-amber-700 hover:bg-amber-50"
          onClick={() => void update("revision_requested")}
          disabled={submittingStatus !== null && submittingStatus !== "revision_requested"}
        >
          {submittingStatus === "revision_requested" ? "Saving..." : "Request Revision"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-red-300 px-2.5 text-xs text-red-600 hover:bg-red-50"
          onClick={() => void update("rejected")}
          disabled={submittingStatus !== null && submittingStatus !== "rejected"}
        >
          {submittingStatus === "rejected" ? "Saving..." : "Reject"}
        </Button>
      </div>
      {currentStatus !== "pending_review" ? (
        <p className="text-[11px] text-gray-500">Current status: {currentStatus.replace("_", " ")}</p>
      ) : null}
    </div>
  );
}
