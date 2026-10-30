import { getCollectionItemsForCollections, getUserCollections } from "@/actions/collections";
import { CollectionsList } from "@/components/collections-list";
import { getSmartCollections } from "@/actions/smart-collections";
import { SmartCollectionsSection } from "@/components/smart-collections-section";
import { buildCollectionPreviews } from "@/components/collection-card";

export const metadata = { title: "Collecties" };

export default async function CollectionsPage() {
  const [collections, smart] = await Promise.all([getUserCollections(), getSmartCollections()]);
  const items = await getCollectionItemsForCollections(collections.map((c) => c.id));

  const previews = buildCollectionPreviews(items);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <CollectionsList collections={collections} previews={previews} />
      {smart !== null && collections.length > 0 && <SmartCollectionsSection items={smart} />}
    </div>
  );
}
