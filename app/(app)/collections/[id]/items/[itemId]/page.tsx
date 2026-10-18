import { notFound } from "next/navigation";
import { getCollectionItem, getCopyCollectionIds, getUserCollections } from "@/actions/collections";
import { getTitleDetail } from "@/lib/tmdb/server";
import { getLocale } from "@/lib/preferences";
import { CollectionItemEditor } from "@/components/collection-item-editor";
import { getFilmLog } from "@/actions/watched";

export default async function CollectionItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { itemId } = await params;
  const item = await getCollectionItem(itemId);
  if (!item) notFound();

  const locale = await getLocale();
  const [movie, filmLog, collections, copyCollectionIds] = await Promise.all([
    getTitleDetail(item.tmdb_movie_id, locale).catch(() => null),
    getFilmLog(item.tmdb_movie_id),
    getUserCollections(),
    getCopyCollectionIds(itemId),
  ]);

  return (
    <CollectionItemEditor
      item={item}
      movie={movie}
      filmLog={filmLog}
      collections={collections}
      copyCollectionIds={copyCollectionIds}
    />
  );
}
