import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, Star } from "lucide-react";
import { getMovieDetailFull } from "@/lib/tmdb/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { isReleased, profileUrl, type MovieDetailFullDto } from "@/types/tmdb";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { WishlistToggleButton } from "@/components/wishlist-toggle-button";
import { isOnWishlist } from "@/actions/wishlist";
import { getFilmLog } from "@/actions/watched";
import { WatchedButton } from "@/components/watched/watched-button";
import { FilmLogCard } from "@/components/watched/film-log-card";
import { getCollectionItemsForCollections, getUserCollections } from "@/actions/collections";
import { BackdropHero } from "@/components/movie/backdrop-hero";
import { Poster } from "@/components/movie/poster";
import { PosterRail, RailItem } from "@/components/movie/poster-rail";
import { TrailerButton } from "@/components/movie/trailer-button";
import { MovieCard } from "@/components/movie-card";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Prefer an official YouTube trailer, then any trailer, then a teaser. */
function pickTrailer(movie: MovieDetailFullDto) {
  const videos = (movie.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const rank = (v: (typeof videos)[number]) =>
    (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 2 : 4) + (v.official ? 0 : 1);
  return videos.filter((v) => v.type === "Trailer" || v.type === "Teaser").sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** NL (Kijkwijzer) age rating, falling back to the US rating. */
function certification(movie: MovieDetailFullDto) {
  for (const country of ["NL", "US"]) {
    const entry = movie.release_dates?.results.find((r) => r.iso_3166_1 === country);
    const cert = entry?.release_dates.find((d) => d.certification.trim())?.certification;
    if (cert) return cert;
  }
  return null;
}

export default async function FilmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId)) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  let movie: MovieDetailFullDto;
  try {
    movie = await getMovieDetailFull(movieId, locale);
  } catch {
    notFound();
  }

  const [onWishlist, collections, filmLog] = await Promise.all([
    isOnWishlist(movie.id),
    getUserCollections(),
    getFilmLog(movie.id),
  ]);
  const filmMeta = { tmdbMovieId: movie.id, title: movie.title, poster: movie.poster_path };
  const items = await getCollectionItemsForCollections(collections.map((c) => c.id));
  // One physical copy may sit in several collections (shared item_group_id).
  const ownedCopies = items
    .filter((i) => i.tmdb_movie_id === movie.id)
    .filter((item, index, all) => all.findIndex((o) => o.item_group_id === item.item_group_id) === index);

  const year = movie.release_date?.slice(0, 4);
  const trailer = pickTrailer(movie);
  const cert = certification(movie);
  const directors = movie.credits?.crew.filter((c) => c.job === "Director") ?? [];
  const writers = (movie.credits?.crew ?? [])
    .filter((c) => c.department === "Writing")
    .filter((c, i, all) => all.findIndex((o) => o.id === c.id) === i)
    .slice(0, 3);
  const cast = (movie.credits?.cast ?? []).slice(0, 15);
  const recommendations = (movie.recommendations?.results ?? []).filter((m) => m.poster_path).slice(0, 15);
  const originalLanguage = movie.original_language
    ? new Intl.DisplayNames([locale], { type: "language" }).of(movie.original_language)
    : null;

  return (
    <div className="flex flex-col gap-10">
      <BackdropHero path={movie.backdrop_path}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Poster
            path={movie.poster_path}
            title={movie.title}
            size="lg"
            priority
            className="w-32 shrink-0 shadow-2xl shadow-black/60 sm:w-44 md:w-56"
          />
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
              {movie.title}
            </h1>
            {movie.tagline && <p className="font-display text-lg italic text-muted-foreground">{movie.tagline}</p>}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {movie.runtime != null && movie.runtime > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {format(dict.movie_runtime_minutes, movie.runtime)}
                </span>
              )}
              {cert && <Badge variant="outline">{cert}</Badge>}
              {movie.vote_average > 0 && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="size-4 fill-primary text-primary" />
                  <span className="font-semibold tabular-nums">{movie.vote_average.toFixed(1)}</span>
                  {movie.vote_count > 0 && (
                    <span className="text-muted-foreground">({format(dict.movie_votes, movie.vote_count.toLocaleString(locale))})</span>
                  )}
                </span>
              )}
            </div>

            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <Badge key={g.id} variant="secondary">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-1 flex flex-wrap gap-2">
              {isReleased(movie.status) && (
                <AddToCollectionButton tmdbMovieId={movie.id} movieTitle={movie.title} moviePoster={movie.poster_path} />
              )}
              <WatchedButton meta={filmMeta} log={filmLog.log} viewingCount={filmLog.viewings.length} />
              <WishlistToggleButton
                tmdbMovieId={movie.id}
                movieTitle={movie.title}
                moviePoster={movie.poster_path}
                initialOnWishlist={onWishlist}
              />
              {trailer && <TrailerButton youtubeKey={trailer.key} title={`${movie.title} · ${trailer.name}`} />}
            </div>
          </div>
        </div>
      </BackdropHero>

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {movie.overview && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">{dict.movie_overview_title}</h2>
              <p className="max-w-prose whitespace-pre-line leading-relaxed text-foreground/90">{movie.overview}</p>
              {(directors.length > 0 || writers.length > 0) && (
                <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-3 text-sm">
                  {directors.length > 0 && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{dict.movie_director_label}</dt>
                      <dd className="font-medium">{directors.map((d) => d.name).join(", ")}</dd>
                    </div>
                  )}
                  {writers.length > 0 && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{dict.movie_writers_label}</dt>
                      <dd className="font-medium">{writers.map((w) => w.name).join(", ")}</dd>
                    </div>
                  )}
                </dl>
              )}
            </section>
          )}

          {cast.length > 0 && (
            <PosterRail title={dict.movie_cast_title}>
              {cast.map((person) => (
                <RailItem key={`${person.id}-${person.order}`} className="w-24 sm:w-28">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Avatar src={profileUrl(person.profile_path)} name={person.name} className="size-20 text-base sm:size-24" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{person.name}</p>
                      {person.character && <p className="line-clamp-2 text-xs text-muted-foreground">{person.character}</p>}
                    </div>
                  </div>
                </RailItem>
              ))}
            </PosterRail>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <FilmLogCard meta={filmMeta} log={filmLog.log} viewings={filmLog.viewings} />
          {ownedCopies.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Check className="size-4" />
                  {dict.movie_in_collection_title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {ownedCopies.map((copy) => (
                  <Link key={copy.id} href={`/collections/${copy.collection_id}/items/${copy.id}`}>
                    <Badge variant="secondary" className="transition-colors hover:ring-primary/50">
                      {copy.type} · {copy.editie}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{dict.movie_details_title}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                {movie.status && <DetailRow label={dict.movie_status_label} value={movie.status} />}
                {originalLanguage && <DetailRow label={dict.movie_original_language_label} value={originalLanguage} />}
                {movie.budget > 0 && <DetailRow label={dict.movie_budget_label} value={`$${movie.budget.toLocaleString(locale)}`} />}
                {movie.revenue > 0 && <DetailRow label={dict.movie_revenue_label} value={`$${movie.revenue.toLocaleString(locale)}`} />}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>

      {recommendations.length > 0 && (
        <div className="mx-auto w-full max-w-6xl">
          <PosterRail title={dict.movie_recommendations_title}>
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
