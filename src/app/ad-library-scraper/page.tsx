import { requireAdLibraryViewer } from "@/lib/auth";
import { MetaAdLibraryScraper } from "@/components/admin/MetaAdLibraryScraper";

export default async function AdLibraryScraperViewerPage() {
  await requireAdLibraryViewer();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <MetaAdLibraryScraper />
      </div>
    </div>
  );
}
