import { getCollectionItemsForCollections, getUserCollections } from "@/actions/collections";
import { CollectionsList } from "@/components/collections-list";
import { buildCollectionPreviews } from "@/components/collection-card";

export const metadata = { title: "Collecties" };

export default async function CollectionsPage() {
  const collections = await getUserCollections();
  const items = await getCollectionItemsForCollections(collections.map((c) => c.id));

  const previews = buildCollectionPreviews(items);

  return (
    <div className="mx-auto max-w-6xl">
      <CollectionsList collections={collections} previews={previews} />
    </div>
  );
}
