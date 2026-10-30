import Link from "next/link";
import { notFound } from "next/navigation";
import { getSmartCollection } from "@/actions/smart-collections";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { formatShort } from "@/lib/formats";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Badge } from "@/components/ui/badge";
import { SmartCollectionActions } from "@/components/smart-collection-actions";
import { Sparkles } from "lucide-react";

/** A smart collection: every copy that matches its filter, by title. */
export default async function SmartCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dict = getDictionary(await getLocale());
  const found = await getSmartCollection(id);
  if (!found) notFound();
  const { collection, items } = found;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title={collection.name}
        description={format(dict.smart_count, items.length)}
        actions={<SmartCollectionActions collection={collection} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={Sparkles} title={dict.smart_no_matches} />
      ) : (
        <PosterGrid>
          {items.map((item) => (
            <Link key={item.item_group_id} href={`/collections/${item.collection_id}/items/${item.id}`} className="group flex flex-col gap-2">
              <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} hover>
                <PosterCorner position="bl">
                  <Badge variant="overlay">{formatShort(item.type)}</Badge>
                </PosterCorner>
              </Poster>
              <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">{item.movie_title}</p>
            </Link>
          ))}
        </PosterGrid>
      )}
    </div>
  );
}
