"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function SyncStripeButton({ influencerProfileId }: { influencerProfileId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/stripe/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerProfileId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { stripePayoutsEnabled: boolean; stripeAccountStatus: string };
      if (data.stripePayoutsEnabled) {
        toast.success("Stripe synced - payouts are now enabled.");
      } else {
        toast.info(`Stripe synced - status: ${data.stripeAccountStatus.replace("_", " ")}.`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={sync}
      disabled={syncing}
      title="Sync Stripe account status"
      className="ml-1 inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </button>
  );
}
