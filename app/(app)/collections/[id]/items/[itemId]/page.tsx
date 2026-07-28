import { notFound } from "next/navigation";
import { getCollectionItem } from "@/actions/collections";
import { getMovieDetail } from "@/lib/tmdb/server";
import { getLocale } from "@/lib/preferences";
import { CollectionItemEditor } from "@/components/collection-item-editor";

export default async function CollectionItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { itemId } = await params;
  const item = await getCollectionItem(itemId);
  if (!item) notFound();

  const locale = await getLocale();
  const movie = await getMovieDetail(item.tmdb_movie_id, locale).catch(() => null);

  return (
    <div className="mx-auto max-w-3xl">
      <CollectionItemEditor item={item} movie={movie} />
    </div>
  );
}
