import Link from "next/link";
import { discoverMovies, getGenres, searchMovies } from "@/lib/tmdb/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { MovieFilters } from "@/components/movie-filters";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";

export default async function FilmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const page = Number(params.page ?? "1") || 1;
  const query = params.query?.trim();
  const genre = params.genre ? Number(params.genre) : undefined;
  const sort = params.sort ?? "popularity.desc";
  const year = params.year ? Number(params.year) : undefined;

  const [genres, result] = await Promise.all([
    getGenres(locale),
    query
      ? searchMovies(query, page, locale)
      : discoverMovies(page, genre, sort, year, locale),
  ]);

  function pageHref(nextPage: number) {
    const p = new URLSearchParams(params as Record<string, string>);
    p.set("page", String(nextPage));
    return `/films?${p.toString()}`;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{dict.films_label}</h1>
      <MovieFilters genres={genres} />

      {result.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.movies_empty_results}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {result.results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button asChild variant="outline" disabled={page <= 1}>
          <Link href={pageHref(page - 1)} aria-disabled={page <= 1}>
            ←
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {page} / {result.total_pages}
        </span>
        <Button asChild variant="outline" disabled={page >= result.total_pages}>
          <Link href={pageHref(page + 1)} aria-disabled={page >= result.total_pages}>
            →
          </Link>
        </Button>
      </div>
    </div>
  );
}
