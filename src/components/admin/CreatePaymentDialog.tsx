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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Influencer {
  id: string;
  name: string;
}

export function CreatePaymentDialog({ influencers }: { influencers: Influencer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [influencerProfileId, setInfluencerProfileId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("campaign_fee");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!influencerProfileId || !amount || !paymentType) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerProfileId,
          amount: Number(amount),
          paymentType,
          description: description || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Payment record created!");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
          <DollarSign className="h-4 w-4" />
          Create Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment</DialogTitle>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (USD) *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
              />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign_fee">Campaign Fee</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="gift_card">Gift Card</SelectItem>
                  <SelectItem value="product_credit">Product Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Payment for Summer 2025 Campaign"
              rows={2}
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={loading}>
            {loading ? "Creating..." : "Create Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
