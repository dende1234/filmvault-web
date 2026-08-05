import Image from "next/image";
import { notFound } from "next/navigation";
import { getMovieDetail } from "@/lib/tmdb/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { backdropUrl, isReleased, posterUrl } from "@/types/tmdb";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { WishlistToggleButton } from "@/components/wishlist-toggle-button";
import { isOnWishlist } from "@/actions/wishlist";

export default async function FilmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId)) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  let movie;
  try {
    movie = await getMovieDetail(movieId, locale);
  } catch {
    notFound();
  }

  const backdrop = backdropUrl(movie.backdrop_path);
  const poster = posterUrl(movie.poster_path);
  const onWishlist = await isOnWishlist(movie.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {backdrop && (
        <div className="relative -mx-4 -mt-4 aspect-[16/7] overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl md:-mx-8 md:-mt-8">
          <Image src={backdrop} alt="" fill className="object-cover" priority />
        </div>
      )}

      <div className="flex gap-5">
        <div className="relative hidden aspect-[2/3] w-40 flex-none overflow-hidden rounded-xl bg-muted sm:block">
          {poster && <Image src={poster} alt={movie.title} fill className="object-cover" />}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.runtime != null && <span>{format(dict.movie_runtime_minutes, movie.runtime)}</span>}
            {movie.genres.length > 0 && <span>{movie.genres.map((g) => g.name).join(", ")}</span>}
            {movie.vote_average > 0 && <span>{format(dict.rating_star_prefix, movie.vote_average.toFixed(1))}</span>}
          </div>

          {isReleased(movie.status) && (
            <AddToCollectionButton tmdbMovieId={movie.id} movieTitle={movie.title} moviePoster={movie.poster_path} />
          )}
          <WishlistToggleButton
            tmdbMovieId={movie.id}
            movieTitle={movie.title}
            moviePoster={movie.poster_path}
            initialOnWishlist={onWishlist}
          />

          <p className="whitespace-pre-line text-sm leading-relaxed">{movie.overview}</p>

          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {movie.status && (
              <div>
                <dt className="text-xs text-muted-foreground">{dict.movie_status_label}</dt>
                <dd>{movie.status}</dd>
              </div>
            )}
            {movie.budget > 0 && (
              <div>
                <dt className="text-xs text-muted-foreground">{dict.movie_budget_label}</dt>
                <dd className="tabular-nums">${movie.budget.toLocaleString(locale)}</dd>
              </div>
            )}
            {movie.revenue > 0 && (
              <div>
                <dt className="text-xs text-muted-foreground">{dict.movie_revenue_label}</dt>
                <dd className="tabular-nums">${movie.revenue.toLocaleString(locale)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
