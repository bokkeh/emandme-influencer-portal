"use client";

import { useMemo, useState } from "react";
import { CampaignEnrollmentManager } from "@/components/admin/CampaignEnrollmentManager";
import { CampaignEnrollmentPipelineTable } from "@/components/admin/CampaignEnrollmentPipelineTable";
import { Card, CardContent } from "@/components/ui/card";

type EnrollmentRow = {
  id: string;
  status: "invited" | "accepted" | "declined" | "active" | "completed" | "removed";
  pipelineStage: string | null;
  contractStatus: string | null;
  proposedFee: string | null;
  agreedFee: string | null;
  contractUrl: string | null;
  contentDueDate: Date | string | null;
  influencerId: string;
  influencerName: string | null;
  influencerTier: "nano" | "micro" | "mid" | "macro" | "mega";
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  avatarUrl?: string | null;
  handle?: string | null;
  handleProfileUrl?: string | null;
};

type Props = {
  campaignId: string;
  initialRows: EnrollmentRow[];
};

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function deriveNameParts(row: EnrollmentRow) {
  const full = (row.influencerName ?? "").trim();
  if (row.userFirstName || row.userLastName) {
    return {
      firstName: row.userFirstName ?? full.split(/\s+/)[0] ?? row.userEmail,
      lastName: row.userLastName ?? full.split(/\s+/).slice(1).join(" "),
    };
  }
  const [firstName, ...rest] = full.split(/\s+/);
  return {
    firstName: firstName || row.userEmail,
    lastName: rest.join(" "),
  };
}

export function CampaignEnrolledSection({ campaignId, initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);

  const profileCards = useMemo(() => {
    const uniqueByInfluencer = new Map<string, EnrollmentRow>();
    for (const row of rows) {
      if (!uniqueByInfluencer.has(row.influencerId)) uniqueByInfluencer.set(row.influencerId, row);
    }
    return Array.from(uniqueByInfluencer.values());
  }, [rows]);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-6 pb-3">
        <p className="text-base font-semibold text-gray-900">Enrolled Influencers ({rows.length})</p>
        <CampaignEnrollmentManager campaignId={campaignId} />
      </div>

      {profileCards.length > 0 ? (
        <div className="px-6 pb-4">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {profileCards.map((row) => {
              const { firstName, lastName } = deriveNameParts(row);
              const displayName = `${firstName} ${lastName}`.trim();
              const handle = row.handle?.replace(/^@/, "");
              const handleLabel = handle ? `@${handle}` : "No handle";
              const handleHref =
                row.handleProfileUrl || (handle ? `https://www.instagram.com/${handle}/` : null);

              return (
                <div
                  key={row.influencerId}
                  className="min-w-[170px] rounded-lg border border-gray-200 bg-white p-3 text-center"
                >
                  <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full bg-gray-100">
                    {row.avatarUrl ? (
                      <img src={row.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                        {initialsFor(displayName || row.userEmail)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{firstName}</p>
                  <p className="text-xs text-gray-500 leading-tight min-h-[16px]">{lastName || "\u00a0"}</p>
                  {handleHref ? (
                    <a
                      href={handleHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-rose-600 underline underline-offset-2"
                    >
                      {handleLabel}
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400">{handleLabel}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <CardContent className="p-0">
        <CampaignEnrollmentPipelineTable campaignId={campaignId} rows={rows} onRowsChange={setRows} />
      </CardContent>
    </Card>
  );
}
