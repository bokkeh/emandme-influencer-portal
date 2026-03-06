"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

async function readErrorMessage(res: Response, fallback: string) {
  const raw = await res.text();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
}

export function DeleteDiscountCodeButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `Delete code ${code}? This will deactivate it in Shopify and remove it from the portal.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/shopify/discount-codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const message = await readErrorMessage(res, "Failed to delete discount code.");
        throw new Error(message);
      }
      toast.success("Discount code deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete discount code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={loading}
      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
      aria-label={`Delete ${code}`}
      title="Delete code"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
