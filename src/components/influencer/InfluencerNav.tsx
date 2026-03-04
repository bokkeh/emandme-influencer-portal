"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/influencer/dashboard" },
  { label: "Campaigns", href: "/influencer/campaigns" },
  { label: "Upload", href: "/influencer/upload" },
  { label: "My Assets", href: "/influencer/assets" },
  { label: "My Links", href: "/influencer/links" },
  { label: "Payments", href: "/influencer/payments" },
  { label: "Profile", href: "/influencer/profile" },
];

export function InfluencerNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-0 sm:px-6">
        <div className="flex items-center gap-8">
          <div className="py-4">
            <p className="text-sm font-bold text-rose-600">Em & Me Studio</p>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-rose-50 text-rose-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="py-3">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </nav>
  );
}
