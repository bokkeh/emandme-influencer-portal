import { db } from "@/lib/db";
import { discountCodes, influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { Tag } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { GenerateDiscountCodeDialog } from "@/components/admin/GenerateDiscountCodeDialog";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default async function DiscountCodesPage() {
  const [allCodes, allInfluencers] = await Promise.all([
    db
      .select({
        id: discountCodes.id,
        code: discountCodes.code,
        discountType: discountCodes.discountType,
        discountValue: discountCodes.discountValue,
        usageCount: discountCodes.usageCount,
        usageLimit: discountCodes.usageLimit,
        revenueGenerated: discountCodes.revenueGenerated,
        isActive: discountCodes.isActive,
        expiresAt: discountCodes.expiresAt,
        createdAt: discountCodes.createdAt,
        influencerId: influencerProfiles.id,
        influencerName: influencerProfiles.displayName,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(discountCodes)
      .innerJoin(influencerProfiles, eq(discountCodes.influencerProfileId, influencerProfiles.id))
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(discountCodes.createdAt),
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(influencerProfiles.joinedAt),
  ]);

  const influencerOptions = allInfluencers.map((inf) => ({
    id: inf.id,
    name:
      (inf.displayName ??
        `${inf.userFirstName ?? ""} ${inf.userLastName ?? ""}`.trim()) ||
      inf.userEmail,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-sm text-gray-500">Manage Shopify discount codes for influencers</p>
        </div>
        <GenerateDiscountCodeDialog influencers={influencerOptions} />
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {allCodes.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No discount codes yet"
            description="Generate Shopify discount codes for your influencers to share with their audience."
          />
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Code</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCodes.map((dc) => {
                  const name =
                    (dc.influencerName ??
                    `${dc.userFirstName ?? ""} ${dc.userLastName ?? ""}`.trim()) ||
                    dc.userEmail;
                  return (
                    <TableRow key={dc.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-bold text-gray-900">{dc.code}</span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/influencers/${dc.influencerId}`}
                          className="text-sm font-medium text-gray-900 hover:text-rose-600"
                        >
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {dc.discountType === "percentage"
                          ? `${dc.discountValue}% off`
                          : `$${dc.discountValue} off`}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{dc.usageCount}</span>
                        {dc.usageLimit && (
                          <span className="text-gray-400"> / {dc.usageLimit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-700">
                        ${Number(dc.revenueGenerated).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={dc.isActive ? "active" : "cancelled"} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {dc.expiresAt ? format(new Date(dc.expiresAt), "MMM d, yyyy") : "Never"}
                      </TableCell>
                      <TableCell>
                        <CopyButton text={dc.code} label="Copy" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
