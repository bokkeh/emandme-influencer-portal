import { isSuperAdminByUserId, requireInfluencer } from "@/lib/auth";
import { InfluencerNav } from "@/components/influencer/InfluencerNav";
import { getBrandingSettings } from "@/lib/branding";

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireInfluencer();
  const isSuperAdmin = await isSuperAdminByUserId(userId);
  const branding = await getBrandingSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <InfluencerNav showViewToggle={isSuperAdmin} logoDarkUrl={branding.logoDarkUrl} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
