import { db } from "@/lib/db";
import { payments, influencerProfiles, users } from "@/lib/db/schema";
import { eq, sum, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KPICard } from "@/components/admin/KPICard";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PaymentsPage() {
  const [allPayments, [pendingTotal], [paidTotal], [failedTotal]] = await Promise.all([
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentType: payments.paymentType,
        description: payments.description,
        dueDate: payments.dueDate,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        stripeTransferId: payments.stripeTransferId,
        influencerName: influencerProfiles.displayName,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        stripePayoutsEnabled: influencerProfiles.stripePayoutsEnabled,
      })
      .from(payments)
      .innerJoin(influencerProfiles, eq(payments.influencerProfileId, influencerProfiles.id))
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(payments.createdAt),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "pending")),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "paid")),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "failed")),
  ]);

  const fmt = (v: string | null) =>
    v ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">Manage influencer payouts via Stripe</p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
          <DollarSign className="h-4 w-4" />
          Create Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Pending Payouts" value={fmt(pendingTotal.total)} icon={CreditCard} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <KPICard title="Total Paid" value={fmt(paidTotal.total)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
        <KPICard title="Failed" value={fmt(failedTotal.total)} icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" />
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No payments recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Influencer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayments.map((p) => {
                  const name =
                    (p.influencerName ??
                    `${p.userFirstName ?? ""} ${p.userLastName ?? ""}`.trim()) ||
                    p.userEmail;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400">{p.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        ${Number(p.amount).toFixed(2)} {p.currency.toUpperCase()}
                      </TableCell>
                      <TableCell className="capitalize text-gray-500 text-sm">
                        {p.paymentType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {p.dueDate ? format(new Date(p.dueDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {p.paidAt ? format(new Date(p.paidAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {p.status === "pending" && p.stripePayoutsEnabled && (
                          <form action={`/api/payments/${p.id}/trigger`} method="POST">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                              Send Payout
                            </Button>
                          </form>
                        )}
                        {p.stripeTransferId && (
                          <span className="font-mono text-xs text-gray-400">{p.stripeTransferId.slice(0, 16)}…</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
