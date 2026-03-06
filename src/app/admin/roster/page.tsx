import { requireAdmin } from "@/lib/auth";
import { RosterClient } from "@/components/admin/RosterClient";

export default async function RosterPage() {
  await requireAdmin();
  return <RosterClient />;
}
