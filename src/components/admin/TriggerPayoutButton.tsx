"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  paymentId: string;
};

export function TriggerPayoutButton({ paymentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function trigger() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/trigger`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to send payout");

      toast.success("Payout sent successfully.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send payout";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={() => void trigger()}
      disabled={loading}
      className="h-8 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
    >
      {loading ? "Sending..." : "Send Payout"}
    </Button>
  );
}

