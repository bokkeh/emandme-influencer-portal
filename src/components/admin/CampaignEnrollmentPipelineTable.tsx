"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TierBadge } from "@/components/shared/TierBadge";

type EnrollmentRow = {
  id: string;
  status: "invited" | "accepted" | "declined" | "active" | "completed" | "removed";
  pipelineStage: string | null;
  contractStatus: string | null;
  proposedFee: string | null;
  agreedFee: string | null;
  contractUrl: string | null;
  contentDueDate: string | Date | null;
  influencerId: string;
  influencerName: string | null;
  influencerTier: "nano" | "micro" | "mid" | "macro" | "mega";
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
};

const PIPELINE_STAGES = [
  "outreach",
  "contacted",
  "in_conversation",
  "negotiating",
  "contract_sent",
  "contract_signed",
  "confirmed",
] as const;

const CONTRACT_STATUSES = ["not_sent", "sent", "signed", "declined"] as const;

type Props = {
  campaignId: string;
  rows: EnrollmentRow[];
};

export function CampaignEnrollmentPipelineTable({ campaignId, rows }: Props) {
  const [items, setItems] = useState(rows);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function patchEnrollment(enrollmentId: string, payload: Record<string, unknown>) {
    setSavingId(enrollmentId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update enrollment");
      const updated = (await res.json()) as EnrollmentRow;
      setItems((prev) => prev.map((item) => (item.id === enrollmentId ? { ...item, ...updated } : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update enrollment";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No influencers enrolled yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Influencer</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pipeline</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contract</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proposed</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Agreed</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Content Due</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tier</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
        {items.map((e) => {
          const name =
            (e.influencerName ?? `${e.userFirstName ?? ""} ${e.userLastName ?? ""}`.trim()) || e.userEmail;
          return (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
              <td className="px-4 py-3">
                <Select value={e.status} onValueChange={(value) => void patchEnrollment(e.id, { status: value })}>
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["invited", "accepted", "declined", "active", "completed", "removed"].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3">
                <Select
                  value={e.pipelineStage ?? "outreach"}
                  onValueChange={(value) => void patchEnrollment(e.id, { pipelineStage: value })}
                >
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3">
                <Select
                  value={e.contractStatus ?? "not_sent"}
                  onValueChange={(value) => void patchEnrollment(e.id, { contractStatus: value })}
                >
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3">
                <Input
                  className="h-8 w-[110px]"
                  defaultValue={e.proposedFee ?? ""}
                  placeholder="$"
                  onBlur={(ev) => void patchEnrollment(e.id, { proposedFee: ev.target.value || null })}
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  className="h-8 w-[110px]"
                  defaultValue={e.agreedFee ?? ""}
                  placeholder="$"
                  onBlur={(ev) => void patchEnrollment(e.id, { agreedFee: ev.target.value || null })}
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  type="date"
                  className="h-8 w-[145px]"
                  defaultValue={
                    e.contentDueDate ? new Date(e.contentDueDate).toISOString().slice(0, 10) : ""
                  }
                  onBlur={(ev) => void patchEnrollment(e.id, { contentDueDate: ev.target.value || null })}
                />
              </td>
              <td className="px-4 py-3">
                <TierBadge tier={e.influencerTier} />
                {savingId === e.id ? <span className="ml-2 text-xs text-gray-400">Saving...</span> : null}
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );
}
