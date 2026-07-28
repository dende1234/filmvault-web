import Image from "next/image";
import { notFound } from "next/navigation";
import { getCollection, getCollectionItems } from "@/actions/collections";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { posterUrl } from "@/types/tmdb";

export default async function FriendCollectionDetailPage({
  params,
}: {
  params: Promise<{ userId: string; collectionId: string }>;
}) {
  const { collectionId } = await params;
  const dict = getDictionary(await getLocale());
  const [collection, items] = await Promise.all([getCollection(collectionId), getCollectionItems(collectionId)]);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold">{collection.name}</h1>
      {collection.description && <p className="mb-6 text-sm text-muted-foreground">{collection.description}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.collection_detail_empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const poster = posterUrl(item.movie_poster, "w200");
            return (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                  {poster && <Image src={poster} alt={item.movie_title} fill className="object-cover" />}
                  {item.watched && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {dict.watched_label}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-medium">{item.movie_title}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
