import { notFound } from "next/navigation";
import { getCollection, getCollectionItems } from "@/actions/collections";
import { CollectionDetailClient } from "@/components/collection-detail-client";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, items] = await Promise.all([getCollection(id), getCollectionItems(id)]);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <CollectionDetailClient collection={collection} items={items} />
    </div>
  );
}
