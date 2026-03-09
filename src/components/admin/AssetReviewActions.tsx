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
  const [emailDebug, setEmailDebug] = useState<{
    status: "sent" | "failed";
    recipientEmail?: string;
    contactId?: string;
    properties?: Record<string, string>;
    error?: string | null;
  } | null>(null);

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
      const data = (await res.json()) as {
        emailSent?: boolean;
        emailError?: string | null;
        emailDebug?: {
          recipientEmail?: string;
          contactId?: string;
          properties?: Record<string, string>;
        } | null;
      };
      toast.success(`Asset ${status.replace("_", " ")}.`);
      if (data.emailSent === false) {
        toast.warning(data.emailError ?? "HubSpot email did not send.");
      }
      setEmailDebug({
        status: data.emailSent === false ? "failed" : "sent",
        recipientEmail: data.emailDebug?.recipientEmail,
        contactId: data.emailDebug?.contactId,
        properties: data.emailDebug?.properties,
        error: data.emailError ?? null,
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update asset review";
      toast.error(message);
      setEmailDebug({
        status: "failed",
        error: message,
      });
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
      {emailDebug ? (
        <div className="rounded border border-gray-200 bg-white p-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Email Debug</p>
          <p className="mt-1 text-[11px] text-gray-700">
            Status:{" "}
            <span className={emailDebug.status === "sent" ? "text-green-700" : "text-red-700"}>
              {emailDebug.status}
            </span>
          </p>
          <p className="text-[11px] text-gray-700">Recipient: {emailDebug.recipientEmail ?? "-"}</p>
          <p className="text-[11px] text-gray-700">HubSpot Contact ID: {emailDebug.contactId ?? "-"}</p>
          {emailDebug.error ? (
            <p className="mt-1 text-[11px] text-red-700">Error: {emailDebug.error}</p>
          ) : null}
          {emailDebug.properties ? (
            <pre className="mt-2 max-h-36 overflow-auto rounded bg-gray-50 p-2 text-[10px] text-gray-700">
              {JSON.stringify(emailDebug.properties, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
