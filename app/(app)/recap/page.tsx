import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getEarnedBadges } from "@/actions/badges";
import { YearlyRecapClient } from "@/components/yearly-recap-client";

export default async function RecapPage() {
  const collections = await getUserCollections();
  const rawItems = await getCollectionItemsForCollections(collections.map((c) => c.id));

  // Same physical film can span multiple collections (shared item_group_id) —
  // dedupe so it's counted once, mirrors DashboardPage/StatsViewModel.kt.
  const seen = new Set<string>();
  const items = rawItems.filter((item) => {
    if (seen.has(item.item_group_id)) return false;
    seen.add(item.item_group_id);
    return true;
  });

  const badges = await getEarnedBadges();

  return (
    <div className="mx-auto max-w-2xl">
      <YearlyRecapClient collections={collections} items={items} badges={badges} />
    </div>
  );
}
