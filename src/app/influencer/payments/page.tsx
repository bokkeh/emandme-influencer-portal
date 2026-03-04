import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, influencerProfiles, payments } from "@/lib/db/schema";
import { eq, and, sum } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function InfluencerPaymentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) redirect("/onboarding");

  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      totalEarnings: influencerProfiles.totalEarnings,
      stripeAccountStatus: influencerProfiles.stripeAccountStatus,
      stripePayoutsEnabled: influencerProfiles.stripePayoutsEnabled,
    })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) redirect("/onboarding");

  const [allPayments, [pendingTotal]] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(eq(payments.influencerProfileId, profile.id))
      .orderBy(payments.createdAt),
    db.select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.influencerProfileId, profile.id), eq(payments.status, "pending"))),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Your earnings and payment history</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-400 font-medium">TOTAL EARNED</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${Number(profile.totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-400 font-medium">PENDING PAYOUT</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              ${Number(pendingTotal.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-400 font-medium">STRIPE STATUS</p>
            <div className="mt-1">
              <StatusBadge status={profile.stripeAccountStatus} />
            </div>
            {!profile.stripePayoutsEnabled && (
              <Link href="/influencer/profile">
                <Button size="sm" className="mt-2 bg-rose-600 hover:bg-rose-700 text-xs">
                  Connect Bank
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No payments yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${Number(p.amount).toFixed(2)} {p.currency.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-500">
                      {p.paymentType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{p.description ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.paidAt
                        ? format(new Date(p.paidAt), "MMM d, yyyy")
                        : p.dueDate
                        ? `Due ${format(new Date(p.dueDate), "MMM d, yyyy")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
