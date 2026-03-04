import { requireInfluencer } from "@/lib/auth";
import { InfluencerNav } from "@/components/influencer/InfluencerNav";

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInfluencer();

  return (
    <div className="min-h-screen bg-gray-50">
      <InfluencerNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
