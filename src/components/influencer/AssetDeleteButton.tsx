"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function AssetDeleteButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const confirmed = window.confirm("Delete this uploaded asset?");
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const message = (await res.text()) || "Failed to delete asset";
        throw new Error(message);
      }
      toast.success("Asset deleted");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete asset";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50"
      onClick={() => void onDelete()}
      disabled={deleting}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
