import { requireAdLibraryViewer } from "@/lib/auth";
import { MetaAdLibraryScraper } from "@/components/admin/MetaAdLibraryScraper";

export default async function MetaAdLibraryPage() {
  await requireAdLibraryViewer();
  return <MetaAdLibraryScraper />;
}
