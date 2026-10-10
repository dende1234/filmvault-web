import { notFound } from "next/navigation";
import { getCollection, getCollectionItems } from "@/actions/collections";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { CollectionDetailClient } from "@/components/collection-detail-client";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [collection, items, { data: auth }] = await Promise.all([getCollection(id), getCollectionItems(id), supabase.auth.getUser()]);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <CollectionDetailClient
        collection={collection}
        items={items}
        isOwner={collection.user_id === auth.user?.id}
        shareUrl={`${SITE_URL}/c/${collection.id}`}
      />
    </div>
  );
}
