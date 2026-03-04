import Link from "next/link";
import { db } from "@/lib/db";
import { shipments, influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Package, Plus, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ShippingPage() {
  const allShipments = await db
    .select({
      id: shipments.id,
      products: shipments.products,
      status: shipments.status,
      carrier: shipments.carrier,
      trackingNumber: shipments.trackingNumber,
      trackingUrl: shipments.trackingUrl,
      shippedAt: shipments.shippedAt,
      estimatedDeliveryAt: shipments.estimatedDeliveryAt,
      deliveredAt: shipments.deliveredAt,
      notes: shipments.notes,
      createdAt: shipments.createdAt,
      influencerName: influencerProfiles.displayName,
      influencerId: influencerProfiles.id,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(shipments)
    .innerJoin(influencerProfiles, eq(shipments.influencerProfileId, influencerProfiles.id))
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .orderBy(shipments.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Tracker</h1>
          <p className="text-sm text-gray-500">Track product sends to influencers</p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
          <Plus className="h-4 w-4" />
          Log Shipment
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {allShipments.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No shipments logged"
            description="Start tracking product shipments to your influencers."
          />
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Influencer</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allShipments.map((s) => {
                  const name =
                    (s.influencerName ??
                    `${s.userFirstName ?? ""} ${s.userLastName ?? ""}`.trim()) ||
                    s.userEmail;
                  const productList = (s.products as Array<{ name: string; qty: number }> ?? [])
                    .map((p) => `${p.name} ×${p.qty}`)
                    .join(", ");
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/admin/influencers/${s.influencerId}`}
                          className="text-sm font-medium text-gray-900 hover:text-rose-600">
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {productList || "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-gray-500">{s.carrier ?? "—"}</TableCell>
                      <TableCell>
                        {s.trackingUrl ? (
                          <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700">
                            {s.trackingNumber ?? "Track"} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">{s.trackingNumber ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {s.shippedAt ? format(new Date(s.shippedAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {s.estimatedDeliveryAt ? format(new Date(s.estimatedDeliveryAt), "MMM d, yyyy") : "—"}
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
