import { requireAdmin } from "@/lib/auth";
import { MetaAdLibraryScraper } from "@/components/admin/MetaAdLibraryScraper";

export default async function MetaAdLibraryPage() {
  await requireAdmin();
  return <MetaAdLibraryScraper />;
}
