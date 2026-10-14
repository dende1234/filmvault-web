import Link from "next/link";
import { titleHref } from "@/lib/titles";
import { notFound } from "next/navigation";
import { Eye, Film } from "lucide-react";
import { getCollection, getCollectionItems } from "@/actions/collections";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title={collection.name}
        description={
          <>
            {format(dict.collections_film_count, items.length)}
            {collection.description && <> · {collection.description}</>}
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Film} title={dict.collection_detail_empty} />
      ) : (
        <PosterGrid>
          {items.map((item) => (
            <Link key={item.id} href={titleHref(item.tmdb_movie_id)} className="group flex flex-col gap-2 focus-visible:outline-none">
              <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} hover>
                <PosterCorner position="bl">
                  <Badge variant="overlay">{item.type}</Badge>
                  {item.watched && (
                    <Badge variant="overlay" className="px-1.5" title={dict.watched_label}>
                      <Eye className="text-success" />
                    </Badge>
                  )}
                </PosterCorner>
              </Poster>
              <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                {item.movie_title}
              </p>
            </Link>
          ))}
        </PosterGrid>
      )}
    </div>
  );
}
