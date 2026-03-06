"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Camera,
  ClipboardList,
  Megaphone,
  ImageIcon,
  CreditCard,
  Package,
  Link2,
  Tag,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Influencers", href: "/admin/influencers", icon: Users },
  { label: "My Influencers", href: "/admin/my-influencers", icon: Users },
  { label: "Roster", href: "/admin/roster", icon: ClipboardList },
  { label: "UGC Creators", href: "/admin/ugc-creators", icon: Camera },
  { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { label: "Asset Library", href: "/admin/assets", icon: ImageIcon },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Shipping", href: "/admin/shipping", icon: Package },
  { label: "UTM Generator", href: "/admin/utm", icon: Link2 },
  { label: "Discount Codes", href: "/admin/discount-codes", icon: Tag },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div>
          <p className="text-sm font-bold text-rose-600 leading-tight">Em & Me Studio</p>
          <p className="text-xs text-gray-500">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-3">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-rose-50 text-rose-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5", active ? "text-rose-600" : "text-gray-400")} size={18} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400">© 2025 Em & Me Studio</p>
      </div>
    </aside>
  );
}
