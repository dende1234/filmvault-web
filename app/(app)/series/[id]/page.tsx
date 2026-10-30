import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Eye, Layers, Star } from "lucide-react";
import { getTvDetailFull } from "@/lib/tmdb/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { toTitleId } from "@/lib/titles";
import { seasonsShort } from "@/lib/seasons";
import { profileUrl, regularSeasons, tvToSummary, type TvDetailFullDto } from "@/types/tmdb";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { WishlistToggleButton } from "@/components/wishlist-toggle-button";
import { isOnWishlist } from "@/actions/wishlist";
import { getFilmLog } from "@/actions/watched";
import { getCollectionItemsForCollections, getUserCollections } from "@/actions/collections";
import { BackdropHero } from "@/components/movie/backdrop-hero";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterRail, RailItem } from "@/components/movie/poster-rail";
import { TrailerButton } from "@/components/movie/trailer-button";
import { MovieCard } from "@/components/movie-card";
import { Avatar } from "@/components/avatar";
import { WatchedButton } from "@/components/watched/watched-button";
import { FilmLogCard } from "@/components/watched/film-log-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WatchProviders } from "@/components/movie/watch-providers";
import { watchCountry as getWatchCountry } from "@/lib/watch-country";

function pickTrailer(tv: TvDetailFullDto) {
  const videos = (tv.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const rank = (v: (typeof videos)[number]) => (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 2 : 4) + (v.official ? 0 : 1);
  return videos.filter((v) => v.type === "Trailer" || v.type === "Teaser").sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function certification(tv: TvDetailFullDto) {
  for (const country of ["NL", "US"]) {
    const r = tv.content_ratings?.results.find((c) => c.iso_3166_1 === country)?.rating;
    if (r) return r;
  }
  return null;
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tvId = Number(id);
  if (!Number.isInteger(tvId) || tvId <= 0) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const watchCountry = await getWatchCountry();

  let tv: TvDetailFullDto;
  try {
    tv = await getTvDetailFull(tvId, locale);
  } catch {
    notFound();
  }

  // Stored as a negative title id everywhere (lib/titles.ts).
  const titleId = toTitleId("tv", tv.id);
  const [onWishlist, collections, filmLog] = await Promise.all([isOnWishlist(titleId), getUserCollections(), getFilmLog(titleId)]);
  const items = await getCollectionItemsForCollections(collections.map((c) => c.id));
  const ownedCopies = items
    .filter((i) => i.tmdb_movie_id === titleId)
    .filter((item, index, all) => all.findIndex((o) => o.item_group_id === item.item_group_id) === index);

  const seasons = regularSeasons(tv);
  const specials = (tv.seasons ?? []).find((s) => s.season_number === 0);
  const allSeasons = specials ? [...seasons, specials] : seasons;
  const ownedSeasons = new Set(ownedCopies.flatMap((c) => c.seasons ?? []));
  const watchedSeasons = new Set(
    filmLog.log?.watched ? filmLog.viewings.map((v) => v.season_number).filter((n): n is number => n != null) : [],
  );
  const missingCount = ownedCopies.length > 0 ? seasons.filter((s) => !ownedSeasons.has(s.season_number)).length : 0;

  const meta = { tmdbMovieId: titleId, title: tv.name, poster: tv.poster_path };
  const startYear = tv.first_air_date?.slice(0, 4);
  const endYear = tv.in_production ? null : tv.last_air_date?.slice(0, 4);
  const years = startYear ? (endYear && endYear !== startYear ? `${startYear}–${endYear}` : tv.in_production ? `${startYear}–` : startYear) : null;
  const trailer = pickTrailer(tv);
  const cert = certification(tv);
  const cast = (tv.aggregate_credits?.cast ?? []).slice(0, 15);
  const recommendations = (tv.recommendations?.results ?? []).filter((m) => m.poster_path).slice(0, 15).map(tvToSummary);
  const originalLanguage = tv.original_language ? new Intl.DisplayNames([locale], { type: "language" }).of(tv.original_language) : null;

  return (
    <div className="flex flex-col gap-10">
      <BackdropHero path={tv.backdrop_path}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Poster path={tv.poster_path} title={tv.name} size="lg" priority className="w-32 shrink-0 shadow-2xl shadow-black/60 sm:w-44 md:w-56" />
          <div className="flex min-w-0 flex-col gap-3">
            <Badge variant="outline" className="w-fit uppercase tracking-wider">
              {dict.picker_kind_series}
            </Badge>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">{tv.name}</h1>
            {tv.tagline && <p className="font-display text-lg italic text-muted-foreground">{tv.tagline}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              {years && <span>{years}</span>}
              {seasons.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Layers className="size-3.5" />
                  {format(dict.series_number_of_seasons, seasons.length)}
                </span>
              )}
              {cert && <Badge variant="outline">{cert}</Badge>}
              {tv.vote_average > 0 && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="size-4 fill-primary text-primary" />
                  <span className="font-semibold tabular-nums">{tv.vote_average.toFixed(1)}</span>
                  {tv.vote_count > 0 && <span className="text-muted-foreground">({format(dict.movie_votes, tv.vote_count.toLocaleString(locale))})</span>}
                </span>
              )}
            </div>
            {tv.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tv.genres.map((g) => (
                  <Badge key={g.id} variant="secondary">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <AddToCollectionButton tmdbMovieId={titleId} movieTitle={tv.name} moviePoster={tv.poster_path} />
              <WatchedButton meta={meta} log={filmLog.log} viewingCount={filmLog.viewings.length} />
              <WishlistToggleButton tmdbMovieId={titleId} movieTitle={tv.name} moviePoster={tv.poster_path} initialOnWishlist={onWishlist} />
              {trailer && <TrailerButton youtubeKey={trailer.key} title={`${tv.name} · ${trailer.name}`} />}
            </div>
          </div>
        </div>
      </BackdropHero>

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <WatchProviders providers={tv["watch/providers"]} country={watchCountry} dict={dict} locale={locale} />
          {tv.overview && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">{dict.movie_overview_title}</h2>
              <p className="max-w-prose whitespace-pre-line leading-relaxed text-foreground/90">{tv.overview}</p>
              {tv.created_by.length > 0 && (
                <dl className="mt-2 text-sm">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{dict.series_creators}</dt>
                  <dd className="font-medium">{tv.created_by.map((c) => c.name).join(", ")}</dd>
                </dl>
              )}
            </section>
          )}

          {allSeasons.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight">{dict.series_seasons_title}</h2>
                {missingCount > 0 && <p className="text-sm text-muted-foreground">{format(dict.series_missing_count, missingCount)}</p>}
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-5">
                {allSeasons.map((s) => {
                  const owned = ownedSeasons.has(s.season_number);
                  const watched = watchedSeasons.has(s.season_number);
                  return (
                    <div key={s.season_number} className="flex flex-col gap-1.5">
                      <Poster
                        path={s.poster_path ?? tv.poster_path}
                        title={s.name}
                        size="sm"
                        className={ownedCopies.length > 0 && !owned ? "opacity-50 grayscale" : undefined}
                      >
                        <PosterCorner position="bl">
                          {owned ? (
                            <Badge variant="overlay">
                              <Check className="text-success" />
                              {dict.series_owned}
                            </Badge>
                          ) : ownedCopies.length > 0 && s.season_number > 0 ? (
                            <Badge variant="overlay">{dict.series_missing}</Badge>
                          ) : null}
                        </PosterCorner>
                        {watched && (
                          <PosterCorner position="tr">
                            <Badge variant="overlay" className="px-1.5" title={dict.watched_label}>
                              <Eye className="text-primary" />
                            </Badge>
                          </PosterCorner>
                        )}
                      </Poster>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.season_number === 0 ? dict.series_specials : s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(dict.series_season_episodes, s.episode_count)}
                          {s.air_date ? ` · ${s.air_date.slice(0, 4)}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {cast.length > 0 && (
            <PosterRail title={dict.movie_cast_title}>
              {cast.map((person) => (
                <RailItem key={person.id} className="w-24 sm:w-28">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Avatar src={profileUrl(person.profile_path)} name={person.name} className="size-20 text-base sm:size-24" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{person.name}</p>
                      {person.roles?.[0]?.character && <p className="line-clamp-2 text-xs text-muted-foreground">{person.roles[0].character}</p>}
                    </div>
                  </div>
                </RailItem>
              ))}
            </PosterRail>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <FilmLogCard meta={meta} log={filmLog.log} viewings={filmLog.viewings} />
          {ownedCopies.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Check className="size-4" />
                  {dict.movie_in_collection_title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {ownedCopies.map((copy) => {
                  const s = seasonsShort(copy.seasons, seasons.length);
                  return (
                    <Link key={copy.id} href={`/collections/${copy.collection_id}/items/${copy.id}`}>
                      <Badge variant="secondary" className="transition-colors hover:ring-primary/50">
                        {copy.type} · {s ? (s.complete ? dict.series_complete : s.label) : dict.series_seasons_unknown}
                      </Badge>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{dict.movie_details_title}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                {tv.status && <DetailRow label={dict.movie_status_label} value={tv.status} />}
                <DetailRow label={dict.series_episodes_label} value={String(tv.number_of_episodes)} />
                {originalLanguage && <DetailRow label={dict.movie_original_language_label} value={originalLanguage} />}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>

      {recommendations.length > 0 && (
        <div className="mx-auto w-full max-w-6xl">
          <PosterRail title={dict.series_recommendations_title}>
            {recommendations.map((m) => (
              <RailItem key={m.id}>
                <MovieCard movie={m} size="sm" />
              </RailItem>
            ))}
          </PosterRail>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
