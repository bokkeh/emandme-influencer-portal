"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ViewModeToggle } from "@/components/shared/ViewModeToggle";

export function AdminMobileHeader({
  showViewToggle = false,
  logoDarkUrl = null,
}: {
  showViewToggle?: boolean;
  logoDarkUrl?: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-600">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] p-0">
          <div className="flex h-full flex-col bg-white">
            <div className="flex h-14 items-center border-b border-gray-200 px-4">
              <div className="flex items-center gap-2">
                {logoDarkUrl ? (
                  <img src={logoDarkUrl} alt="Em & Me Studio" className="h-6 w-auto object-contain" />
                ) : null}
                <div>
                  <p className="text-sm font-bold leading-tight text-rose-600">Em & Me Studio</p>
                  <p className="text-xs text-gray-500">Admin Portal</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
              <ul className="space-y-1 px-3">
                {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
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
            <div className="border-t border-gray-200 p-4">
              {showViewToggle ? (
                <div className="mb-3">
                  <ViewModeToggle currentMode="admin" />
                </div>
              ) : null}
              <p className="text-xs text-gray-400">© 2026 Em & Me Studio</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center">
        {logoDarkUrl ? (
          <img src={logoDarkUrl} alt="Em & Me Studio" className="h-6 w-auto object-contain" />
        ) : (
          <p className="text-sm font-bold text-rose-600">Em & Me Studio</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500">
          <Bell className="h-4.5 w-4.5" />
        </Button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
