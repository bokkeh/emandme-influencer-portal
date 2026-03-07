import { isSuperAdminByUserId, requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireAdmin();
  const isSuperAdmin = await isSuperAdminByUserId(userId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar showViewToggle={isSuperAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
