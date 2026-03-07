"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  currentMode: "admin" | "influencer";
};

export function ViewModeToggle({ currentMode }: Props) {
  const targetHref = currentMode === "admin" ? "/influencer/dashboard" : "/admin/dashboard";
  const label = currentMode === "admin" ? "Switch to Influencer View" : "Switch to Admin View";

  return (
    <Link href={targetHref} className="block w-full">
      <Button variant="outline" className="w-full justify-start gap-2 text-xs">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        {label}
      </Button>
    </Link>
  );
}

