"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  currentMode?: "admin" | "influencer" | "ugc_creator" | "affiliate";
};

export function ViewModeToggle({ currentMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = useMemo(
    () => [
      { value: "admin", label: "Admin View", href: "/admin/dashboard" },
      { value: "influencer", label: "Influencer View", href: "/influencer/dashboard" },
      { value: "ugc_creator", label: "UGC View", href: "/influencer/dashboard?view=ugc_creator" },
      { value: "affiliate", label: "Affiliate View", href: "/influencer/dashboard?view=affiliate" },
    ],
    []
  );

  const inferredCurrent = useMemo(() => {
    if (pathname.startsWith("/admin")) return "admin";
    const view = searchParams.get("view");
    if (view === "ugc_creator") return "ugc_creator";
    if (view === "affiliate") return "affiliate";
    return currentMode ?? "influencer";
  }, [pathname, searchParams, currentMode]);

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <Label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Switch View
      </Label>
      <Select
        value={inferredCurrent}
        onValueChange={(value) => {
          const selected = options.find((option) => option.value === value);
          if (!selected) return;
          router.push(selected.href);
        }}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select view" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
