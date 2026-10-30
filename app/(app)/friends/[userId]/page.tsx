import { LibraryBig } from "lucide-react";
import { getPublicProfiles } from "@/actions/friends";
import { getCollectionItemsForCollections, getCollectionsForUser, getUserCollections } from "@/actions/collections";
import { getWishlist } from "@/actions/wishlist";
import { compareCollections } from "@/lib/compare";
import { FriendCompare } from "@/components/friend-compare";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CollectionCard, buildCollectionPreviews } from "@/components/collection-card";

export default async function FriendCollectionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const dict = getDictionary(await getLocale());

  const [profiles, collections] = await Promise.all([getPublicProfiles([userId]), getCollectionsForUser(userId)]);
  const friendName = profiles[0]?.name || dict.friend_collections_default_name;
  const [items, myCollections, myWishlist] = await Promise.all([
    getCollectionItemsForCollections(collections.map((c) => c.id)).catch(() => []),
    getUserCollections(),
    getWishlist().catch(() => []),
  ]);
  const previews = buildCollectionPreviews(items);
  const myItems = await getCollectionItemsForCollections(myCollections.map((c) => c.id)).catch(() => []);
  const comparison = compareCollections(myItems, items, myWishlist);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={format(dict.friend_collections_title, friendName)} />

      {collections.length === 0 ? (
        <EmptyState icon={LibraryBig} title={dict.friend_collections_empty} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => {
            const preview = previews[c.id] ?? { count: 0, posters: [] };
            return (
              <CollectionCard
                key={c.id}
                collection={c}
                preview={preview}
                href={`/friends/${userId}/${c.id}`}
                countLabel={format(dict.collections_film_count, preview.count)}
              />
            );
          })}
        </div>
      )}

      {items.length > 0 && <FriendCompare comparison={comparison} friendName={friendName} />}
    </div>
  );
}
