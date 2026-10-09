import Link from "next/link";
import { Eye, EyeOff, Film, LibraryBig, Play } from "lucide-react";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getOrCreateProfile } from "@/actions/profile";
import { getMovieDetail } from "@/lib/tmdb/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import type { CollectionItem } from "@/types/database";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { SurpriseMeButton } from "@/components/surprise-me-button";
import { BackdropHero } from "@/components/movie/backdrop-hero";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterRail, RailItem } from "@/components/movie/poster-rail";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Dashboard" };

/** Stable "film of the day": same pick all day, rotates daily. */
function pickOfTheDay<T>(list: T[], now: Date): T | null {
  if (list.length === 0) return null;
  const day = Math.floor(now.getTime() / 86_400_000);
  return list[day % list.length];
}

function itemHref(item: CollectionItem) {
  return `/collections/${item.collection_id}/items/${item.id}`;
}

function ItemPoster({ item }: { item: CollectionItem }) {
  return (
    <Link href={itemHref(item)} className="group flex flex-col gap-2 focus-visible:outline-none">
      <Poster path={item.movie_poster} title={item.movie_title} size="sm" hover>
        <PosterCorner position="bl">
          <Badge variant="overlay">{item.type}</Badge>
        </PosterCorner>
        {item.watched && (
          <PosterCorner position="tr">
            <Badge variant="overlay" className="px-1.5">
              <Eye className="text-success" />
            </Badge>
          </PosterCorner>
        )}
      </Poster>
      <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">{item.movie_title}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [collections, profile] = await Promise.all([getUserCollections(), getOrCreateProfile()]);
  const rawItems = await getCollectionItemsForCollections(collections.map((c) => c.id));

  // Same physical film can span multiple collections (shared item_group_id) —
  // dedupe so it's counted/shown once, mirrors DashboardViewModel.kt exactly.
  const seen = new Set<string>();
  const items = rawItems.filter((item) => {
    if (seen.has(item.item_group_id)) return false;
    seen.add(item.item_group_id);
    return true;
  });

  const byNewest = [...items].sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
  const unwatched = byNewest.filter((i) => !i.watched);
  const watchedCount = items.length - unwatched.length;
  const watchedPct = items.length > 0 ? Math.round((watchedCount / items.length) * 100) : 0;

  const featured = pickOfTheDay(unwatched, new Date()) ?? byNewest[0] ?? null;
  const featuredMovie = featured ? await getMovieDetail(featured.tmdb_movie_id, locale).catch(() => null) : null;
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const welcome = firstName ? format(dict.dashboard_welcome, firstName) : dict.dashboard_welcome_anonymous;

  return (
    <div className="flex flex-col gap-10">
      <BackdropHero path={featuredMovie?.backdrop_path ?? null}>
        <p className="mb-4 text-sm font-medium text-muted-foreground">{welcome}</p>
        {featured ? (
          <div className="flex items-end gap-5">
            <Link href={itemHref(featured)} className="group hidden shrink-0 sm:block">
              <Poster path={featured.movie_poster} title={featured.movie_title} size="lg" priority hover className="w-36 md:w-44" />
            </Link>
            <div className="flex min-w-0 flex-col gap-3">
              <Badge variant="default" className="w-fit uppercase tracking-wider">
                {dict.dashboard_featured_label}
              </Badge>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
                {featured.movie_title}
              </h1>
              {featuredMovie?.overview ? (
                <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-foreground/80 md:text-base">{featuredMovie.overview}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{dict.dashboard_featured_subtitle}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={itemHref(featured)}>
                    <Play className="fill-current" />
                    {dict.dashboard_view_button}
                  </Link>
                </Button>
                <SurpriseMeButton unwatchedItems={unwatched} />
              </div>
            </div>
          </div>
        ) : (
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{dict.dashboard_empty_title}</h1>
        )}
      </BackdropHero>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={LibraryBig} label={dict.collections_label} value={collections.length} />
          <StatTile icon={Film} label={dict.films_label} value={items.length} />
          <StatTile
            icon={Eye}
            label={dict.watched_label}
            value={watchedCount}
            hint={
              items.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Progress value={watchedPct} label={format(dict.dashboard_watched_progress, watchedPct)} />
                  <p className="text-xs text-muted-foreground">{format(dict.dashboard_watched_progress, watchedPct)}</p>
                </div>
              )
            }
          />
          <StatTile icon={EyeOff} label={dict.not_watched_label} value={unwatched.length} />
        </div>

        <div className="flex flex-wrap gap-2">
          <AddFilmFlow />
          <AddBoxFlow />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Film}
            title={dict.dashboard_empty_title}
            description={dict.dashboard_empty_description}
            action={<AddFilmFlow />}
          />
        ) : (
          <>
            <PosterRail title={dict.dashboard_recent_title}>
              {byNewest.slice(0, 15).map((item) => (
                <RailItem key={item.id}>
                  <ItemPoster item={item} />
                </RailItem>
              ))}
            </PosterRail>
            {unwatched.length > 0 && (
              <PosterRail title={dict.dashboard_unwatched_title}>
                {unwatched.slice(0, 15).map((item) => (
                  <RailItem key={item.id}>
                    <ItemPoster item={item} />
                  </RailItem>
                ))}
              </PosterRail>
            )}
          </>
        )}
      </div>
    </div>
  );
}
