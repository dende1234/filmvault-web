import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { getPublicWishlist } from "@/actions/wishlist";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
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

type Props = { params: Promise<{ userId: string }> };

// One RPC per request, shared by generateMetadata and the page.
const loadWishlist = cache(getPublicWishlist);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const wishlist = await loadWishlist(userId);
  const title = wishlist?.owner_name ? `Verlanglijst van ${wishlist.owner_name}` : "Verlanglijst";
  return {
    title,
    description: wishlist ? `${wishlist.items.length} films op deze verlanglijst op Filmory.` : undefined,
    // Shared by link on purpose, but never in search results (privacy).
    robots: { index: false, follow: false },
  };
}

/** A wishlist shared via link (public_wishlist.sql): Holy Grails first. */
export default async function PublicWishlistPage({ params }: Props) {
  const { userId } = await params;
  const dict = getDictionary(await getLocale());
  const wishlist = await loadWishlist(userId);
  if (!wishlist) notFound();

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
              <Link href="/register?ref=wishlist">{dict.landing_cta_register}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <PageHeader
          title={wishlist.owner_name ? format(dict.public_wishlist_title, wishlist.owner_name) : dict.nav_wishlist}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {wishlist.owner_name && <Avatar src={wishlist.owner_avatar} name={wishlist.owner_name} className="size-6 text-[10px]" />}
              <span>{format(dict.public_wishlist_count, wishlist.items.length)}</span>
            </span>
          }
        />
        <p className="-mt-4 max-w-prose text-sm text-muted-foreground">{dict.public_wishlist_hint}</p>

        {wishlist.items.length === 0 ? (
          <p className="text-muted-foreground">{dict.public_wishlist_empty}</p>
        ) : (
          <PosterGrid>
            {wishlist.items.map((item, i) => (
              <div key={item.tmdb_movie_id} className="flex flex-col gap-2">
                <Poster path={item.movie_poster} title={item.movie_title} priority={i < 6}>
                  {item.is_grail && (
                    <PosterCorner position="tr">
                      <Badge variant="overlay" className="gap-1">
                        <Crown className="size-3 text-primary" aria-hidden />
                        {dict.public_wishlist_grail}
                      </Badge>
                    </PosterCorner>
                  )}
                  {isSeries(item.tmdb_movie_id) && seasonsShort(item.seasons) && (
                    <PosterCorner position="bl">
                      <Badge variant="overlay">{seasonsShort(item.seasons)!.label}</Badge>
                    </PosterCorner>
                  )}
                </Poster>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{item.movie_title}</p>
              </div>
            ))}
          </PosterGrid>
        )}

        <section className="bg-cinema mt-4 flex flex-col items-center gap-3 rounded-card border border-primary/30 px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{dict.public_wishlist_cta_title}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{dict.public_wishlist_cta_description}</p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/register?ref=wishlist">{dict.landing_cta_register}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-8">{dict.landing_tmdb_attribution}</p>
      </footer>
    </div>
  );
}
