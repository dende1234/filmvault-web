import { notFound } from "next/navigation";
import { getList, getListItems, getOwnedTmdbMovieIds, getSubscribedListIds } from "@/actions/curated-lists";
import { getOrCreateProfile } from "@/actions/profile";
import { CuratedListDetailClient } from "@/components/curated-list-detail-client";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentProfile = await getOrCreateProfile();

  const [list, items, ownedIds, subscribedIds] = await Promise.all([
    getList(id),
    getListItems(id),
    getOwnedTmdbMovieIds(),
    getSubscribedListIds(),
  ]);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <CuratedListDetailClient
        list={list}
        items={items}
        ownedTmdbIds={Array.from(ownedIds)}
        isMine={list.owner_id === currentProfile?.id}
        isAdmin={currentProfile?.is_admin === true}
        isSubscribed={subscribedIds.has(list.id)}
      />
    </div>
  );
}
