"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Influencer {
  id: string;
  name: string;
}

export function GenerateDiscountCodeDialog({ influencers }: { influencers: Influencer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [influencerProfileId, setInfluencerProfileId] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!influencerProfileId || !code || !discountValue) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shopify/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerProfileId,
          code: code.toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Discount code created!");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
          <Plus className="h-4 w-4" />
          Generate Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Discount Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Influencer *</Label>
            <Select value={influencerProfileId} onValueChange={setInfluencerProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Select influencer..." />
              </SelectTrigger>
              <SelectContent>
                {influencers.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id}>{inf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ALEX20"
              className="font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount Type *</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value *</Label>
              <Input
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "20" : "10.00"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Usage Limit</Label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Expires At</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={loading}>
            {loading ? "Creating in Shopify..." : "Generate Code"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
