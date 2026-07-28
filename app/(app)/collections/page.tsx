import { getUserCollections } from "@/actions/collections";
import { CollectionsList } from "@/components/collections-list";

export default async function CollectionsPage() {
  const collections = await getUserCollections();
  return (
    <div className="mx-auto max-w-5xl">
      <CollectionsList collections={collections} />
    </div>
  );
}
