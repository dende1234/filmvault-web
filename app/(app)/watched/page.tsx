import { getWatchedOverview } from "@/actions/watched";
import { WatchedPageClient } from "@/components/watched/watched-page-client";

export const metadata = { title: "Bekeken" };

export default async function WatchedPage() {
  const overview = await getWatchedOverview();
  return (
    <div className="mx-auto max-w-6xl">
      <WatchedPageClient available={overview.available} films={overview.films} diary={overview.diary} />
    </div>
  );
}
