import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Package } from "lucide-react";
import { getBoxItems, getCollection, getCopyCollectionIds, getUserCollections } from "@/actions/collections";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyCollections } from "@/components/copy-collections";
import { BoxPageRemove } from "@/components/box-page-remove";

/** One box in one collection: its details, its films as poster cards, the
 * collections it is in, and removing it from this collection. */
export default async function BoxPage({ params }: { params: Promise<{ id: string; boxGroupId: string }> }) {
  const { id, boxGroupId } = await params;
  const supabase = await createClient();
  const [collection, items, { data: auth }] = await Promise.all([getCollection(id), getBoxItems(id, boxGroupId), supabase.auth.getUser()]);
  if (!collection || items.length === 0) notFound();

  const dict = getDictionary(await getLocale());
  const isOwner = collection.user_id === auth.user?.id;
  const first = items[0];
  const name = first.box_name ?? first.movie_title;
  const [collections, copyCollectionIds] = isOwner
    ? await Promise.all([getUserCollections(), getCopyCollectionIds(first.id)])
    : [[], []];
  const meta = [first.type, first.editie !== "Normaal" ? first.editie : null, format(dict.box_card_film_count, items.length)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Link href={`/collections/${id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {format(dict.box_page_back, collection.name)}
      </Link>

      <header className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/30">
          <Package className="size-6 text-primary" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance md:text-4xl">{name}</h1>
          <p className="text-sm text-muted-foreground">{meta}</p>
          <p className="font-mono text-xs text-muted-foreground">{format(dict.box_page_barcode, first.barcode)}</p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">{dict.box_page_films}</h2>
        <PosterGrid>
          {items.map((item) => (
            <Link key={item.id} href={`/collections/${id}/items/${item.id}`} className="group flex flex-col gap-2 focus-visible:outline-none">
              <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} hover>
                {item.watched && (
                  <PosterCorner position="bl">
                    <Badge variant="overlay" className="px-1.5" title={dict.watched_label}>
                      <Eye className="text-success" />
                    </Badge>
                  </PosterCorner>
                )}
              </Poster>
              <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">{item.movie_title}</p>
            </Link>
          ))}
        </PosterGrid>
      </section>

      {isOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{dict.copy_collections_title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CopyCollections
                key={copyCollectionIds.slice().sort().join(",")}
                itemId={first.id}
                isBox
                boxGroupId={boxGroupId}
                collections={collections}
                initialIds={copyCollectionIds}
              />
            </CardContent>
          </Card>
          <BoxPageRemove collectionId={id} itemIds={items.map((i) => i.id)} boxName={name} />
        </>
      )}
    </div>
  );
}
