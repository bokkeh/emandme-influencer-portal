import { isSuperAdminByUserId, requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMobileHeader } from "@/components/admin/AdminMobileHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireAdmin();
  const isSuperAdmin = await isSuperAdminByUserId(userId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AdminSidebar showViewToggle={isSuperAdmin} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminMobileHeader showViewToggle={isSuperAdmin} />
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
