"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, Package, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ShipmentStatus = "preparing" | "shipped" | "delivered" | "returned";

type ShipmentProduct = {
  name: string;
  qty: number;
};

type ShipmentRow = {
  id: string;
  products: ShipmentProduct[] | null;
  status: ShipmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | Date | null;
  estimatedDeliveryAt: string | Date | null;
  deliveredAt: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  influencerName: string | null;
  influencerId: string;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
};

type InfluencerOption = {
  id: string;
  name: string;
  email: string;
};

function toDateInputValue(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseProductsInput(raw: string): ShipmentProduct[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, qtyPart] = line.split("|");
      const name = (namePart ?? "").trim();
      const qty = Math.max(1, Number(qtyPart?.trim() || "1"));
      return { name, qty: Number.isFinite(qty) ? Math.round(qty) : 1 };
    })
    .filter((item) => item.name);
}

export function ShippingTrackerClient({
  initialShipments,
  influencerOptions,
}: {
  initialShipments: ShipmentRow[];
  influencerOptions: InfluencerOption[];
}) {
  const [shipments, setShipments] = useState<ShipmentRow[]>(initialShipments);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [influencerProfileId, setInfluencerProfileId] = useState("");
  const [productsText, setProductsText] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("preparing");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippedAt, setShippedAt] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shipments;
    return shipments.filter((s) => {
      const name =
        (s.influencerName ?? `${s.userFirstName ?? ""} ${s.userLastName ?? ""}`.trim()) ||
        s.userEmail;
      const products = (s.products ?? []).map((p) => p.name).join(" ");
      return [name, s.userEmail, s.status, s.carrier ?? "", products].join(" ").toLowerCase().includes(q);
    });
  }, [search, shipments]);

  async function createShipment(e: React.FormEvent) {
    e.preventDefault();
    const products = parseProductsInput(productsText);
    if (!influencerProfileId) {
      toast.error("Select an influencer first.");
      return;
    }
    if (products.length === 0) {
      toast.error("Add at least one product line.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerProfileId,
          products,
          status,
          carrier,
          trackingNumber,
          trackingUrl,
          shippedAt: shippedAt || null,
          estimatedDeliveryAt: estimatedDeliveryAt || null,
          notes,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create shipment");

      const created = await res.json();
      const selectedInfluencer = influencerOptions.find((option) => option.id === influencerProfileId);

      setShipments((prev) => [
        {
          id: created.id,
          products,
          status,
          carrier: carrier || null,
          trackingNumber: trackingNumber || null,
          trackingUrl: trackingUrl || null,
          shippedAt: shippedAt || null,
          estimatedDeliveryAt: estimatedDeliveryAt || null,
          deliveredAt: null,
          notes: notes || null,
          createdAt: new Date().toISOString(),
          influencerName: selectedInfluencer?.name ?? null,
          influencerId: influencerProfileId,
          userEmail: selectedInfluencer?.email ?? "",
          userFirstName: null,
          userLastName: null,
        },
        ...prev,
      ]);

      setOpenCreate(false);
      setInfluencerProfileId("");
      setProductsText("");
      setStatus("preparing");
      setCarrier("");
      setTrackingNumber("");
      setTrackingUrl("");
      setShippedAt("");
      setEstimatedDeliveryAt("");
      setNotes("");
      toast.success("Shipment logged.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create shipment";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(shipmentId: string, nextStatus: ShipmentStatus) {
    try {
      const res = await fetch(`/api/admin/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update status");
      setShipments((prev) =>
        prev.map((item) =>
          item.id === shipmentId
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );
      toast.success("Shipment status updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Tracker</h1>
          <p className="text-sm text-gray-500">Track product sends to influencers</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
              <Plus className="h-4 w-4" />
              Log Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Log Shipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={createShipment} className="space-y-4">
              <div>
                <Label>Influencer *</Label>
                <Select value={influencerProfileId} onValueChange={setInfluencerProfileId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select influencer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {influencerOptions.map((inf) => (
                      <SelectItem key={inf.id} value={inf.id}>
                        {inf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Products *</Label>
                <Textarea
                  value={productsText}
                  onChange={(e) => setProductsText(e.target.value)}
                  placeholder={`Use one line per product:\nPet Tag | 1\nHarness | 2`}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Carrier</Label>
                  <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="UPS, USPS, FedEx..." />
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Tracking URL</Label>
                  <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                </div>
                <div>
                  <Label>Shipped Date</Label>
                  <Input type="date" value={shippedAt} onChange={(e) => setShippedAt(e.target.value)} />
                </div>
                <div>
                  <Label>Est. Delivery Date</Label>
                  <Input
                    type="date"
                    value={estimatedDeliveryAt}
                    onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={saving}>
                {saving ? "Saving..." : "Save Shipment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {shipments.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No shipments logged"
            description="Start tracking product shipments to your influencers."
          />
        ) : (
          <CardContent className="space-y-3 p-4">
            <Input
              placeholder="Search influencer, product, status, carrier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-x-auto">
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
                  {filtered.map((s) => {
                    const name =
                      (s.influencerName ??
                        `${s.userFirstName ?? ""} ${s.userLastName ?? ""}`.trim()) ||
                      s.userEmail;
                    const productList = (s.products ?? [])
                      .map((p) => `${p.name} x${p.qty}`)
                      .join(", ");

                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link
                            href={`/admin/influencers/${s.influencerId}`}
                            className="text-sm font-medium text-gray-900 hover:text-rose-600"
                          >
                            {name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[240px] text-sm text-gray-600 truncate">
                          {productList || "-"}
                        </TableCell>
                        <TableCell className="space-y-2">
                          <StatusBadge status={s.status} />
                          <Select
                            value={s.status}
                            onValueChange={(value) =>
                              void updateStatus(s.id, value as ShipmentStatus)
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="returned">Returned</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{s.carrier ?? "-"}</TableCell>
                        <TableCell>
                          {s.trackingUrl ? (
                            <a
                              href={s.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                            >
                              {s.trackingNumber ?? "Track"} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">{s.trackingNumber ?? "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {s.shippedAt ? format(new Date(s.shippedAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {s.estimatedDeliveryAt
                            ? format(new Date(s.estimatedDeliveryAt), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
