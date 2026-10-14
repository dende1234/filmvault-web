import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCollection } from "@/actions/collections";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { posterUrl } from "@/types/tmdb";
import { isSeries } from "@/lib/titles";
import { seasonsShort } from "@/lib/seasons";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

type Props = { params: Promise<{ id: string }> };

// One RPC per request, shared by generateMetadata and the page.
const loadCollection = cache(getPublicCollection);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await loadCollection(id);
  if (!collection) return { title: "Collectie", robots: { index: false, follow: false } };
  const firstPoster = collection.items.find((i) => i.movie_poster)?.movie_poster ?? null;
  const by = collection.owner_name ? ` · ${collection.owner_name}` : "";
  return {
    title: `${collection.name}${by}`,
    description: `${collection.items.length} films in deze collectie op Filmory.`,
    // Shared by link on purpose, but never in search results (privacy).
    robots: { index: false, follow: false },
    openGraph: {
      title: `${collection.name}${by}`,
      description: `${collection.items.length} films · Filmory`,
      images: firstPoster ? [{ url: posterUrl(firstPoster, "w500")! }] : undefined,
    },
  };
}

export default async function PublicCollectionPage({ params }: Props) {
  const { id } = await params;
  const dict = getDictionary(await getLocale());
  const collection = await loadCollection(id);
  if (!collection) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" aria-label="Filmory">
            <Logo markClassName="size-7" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild size="sm">
              <Link href="/register?ref=share">{dict.landing_cta_register}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <PageHeader
          title={collection.name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {collection.owner_name && (
                <>
                  <Avatar src={collection.owner_avatar_url} name={collection.owner_name} className="size-6 text-[10px]" />
                  <span>{format(dict.public_collection_by, collection.owner_name)}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{format(dict.collections_film_count, collection.items.length)}</span>
            </span>
          }
        />
        {collection.description && <p className="-mt-4 max-w-prose text-muted-foreground">{collection.description}</p>}

        <PosterGrid>
          {collection.items.map((item, i) => (
            <div key={`${item.tmdb_movie_id}-${item.type}-${item.editie}-${i}`} className="flex flex-col gap-2">
              <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} priority={i < 6}>
                <PosterCorner position="bl">
                  <Badge variant="overlay">{item.type}</Badge>
                  {isSeries(item.tmdb_movie_id) && seasonsShort(item.seasons) && (
                    <Badge variant="overlay">{seasonsShort(item.seasons)!.label}</Badge>
                  )}
                </PosterCorner>
              </Poster>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium leading-snug">{item.movie_title}</p>
                {item.editie && item.editie !== "Normaal" && <p className="text-xs text-primary">{item.editie}</p>}
                {item.is_box && item.box_name && <p className="text-xs text-muted-foreground">{item.box_name}</p>}
              </div>
            </div>
          ))}
        </PosterGrid>

        <section className="bg-cinema mt-4 flex flex-col items-center gap-3 rounded-card border border-primary/30 px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{dict.public_collection_cta_title}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{dict.public_collection_cta_description}</p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/register?ref=share">{dict.landing_cta_register}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-8">{dict.landing_tmdb_attribution}</p>
      </footer>
    </div>
  );
}
