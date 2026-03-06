import { requireAdmin } from "@/lib/auth";
import { RosterClient } from "@/components/admin/RosterClient";

export default async function MyInfluencersPage() {
  await requireAdmin();

  return (
    <RosterClient
      title="My Influencers"
      subtitle="influencers tracked"
    />
  );
}
