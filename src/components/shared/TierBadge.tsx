import { Badge } from "@/components/ui/badge";

const TIER_CONFIG: Record<string, { bg: string; label: string; range: string }> = {
  nano: { bg: "bg-gray-100 text-gray-700 border-gray-300", label: "Nano", range: "1K–10K" },
  micro: { bg: "bg-blue-100 text-blue-700 border-blue-300", label: "Micro", range: "10K–100K" },
  macro: { bg: "bg-purple-100 text-purple-700 border-purple-300", label: "Macro", range: "100K–1M" },
  mega: { bg: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "Mega", range: "1M+" },
};

export function TierBadge({ tier, showRange = false }: { tier: string; showRange?: boolean }) {
  const config = TIER_CONFIG[tier] ?? { bg: "bg-gray-100 text-gray-700 border-gray-300", label: tier, range: "" };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.bg}`}>
      {config.label}{showRange ? ` (${config.range})` : ""}
    </Badge>
  );
}
