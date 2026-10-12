import { notFound } from "next/navigation";
import { getCollectionItem } from "@/actions/collections";
import { getMovieDetail } from "@/lib/tmdb/server";
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
  const [movie, filmLog] = await Promise.all([
    getMovieDetail(item.tmdb_movie_id, locale).catch(() => null),
    getFilmLog(item.tmdb_movie_id),
  ]);

  return (
    <CollectionItemEditor item={item} movie={movie} filmLog={filmLog} />
  );
}
