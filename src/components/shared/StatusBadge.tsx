import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  // Asset
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  revision_requested: "bg-orange-100 text-orange-800 border-orange-200",
  // Payment
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  // Shipment
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  returned: "bg-gray-100 text-gray-600 border-gray-200",
  // Campaign
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  // Enrollment
  invited: "bg-purple-100 text-purple-800 border-purple-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  removed: "bg-gray-100 text-gray-600 border-gray-200",
  // Stripe
  not_connected: "bg-gray-100 text-gray-600 border-gray-200",
  restricted: "bg-orange-100 text-orange-800 border-orange-200",
  disabled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  revision_requested: "Revision Needed",
  not_connected: "Not Connected",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={cn("text-xs font-medium capitalize", style)}>
      {label}
    </Badge>
  );
}
