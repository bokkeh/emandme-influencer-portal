import { isSuperAdminByUserId, requireInfluencer } from "@/lib/auth";
import { InfluencerNav } from "@/components/influencer/InfluencerNav";

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireInfluencer();
  const isSuperAdmin = await isSuperAdminByUserId(userId);

  return (
    <div className="min-h-screen bg-gray-50">
      <InfluencerNav showViewToggle={isSuperAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
