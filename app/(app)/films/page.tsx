import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { discoverMovies, getGenres, searchMovies } from "@/lib/tmdb/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { MovieFilters } from "@/components/movie-filters";
import { MovieCard } from "@/components/movie-card";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Films" };

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

  // TMDB never serves beyond page 500.
  const totalPages = Math.min(result.total_pages, 500);

  function pageHref(nextPage: number) {
    const p = new URLSearchParams(params as Record<string, string>);
    p.set("page", String(nextPage));
    return `/films?${p.toString()}`;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title={dict.films_label} />
      <MovieFilters genres={genres} />

      {result.results.length === 0 ? (
        <EmptyState icon={SearchX} title={dict.movies_empty_results} />
      ) : (
        <PosterGrid>
          {result.results.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} priority={index < 6} />
          ))}
        </PosterGrid>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label={dict.films_label}>
          {page > 1 ? (
            <Button asChild variant="secondary" size="icon">
              <Link href={pageHref(page - 1)} aria-label={dict.action_previous}>
                <ChevronLeft />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="icon" disabled aria-label={dict.action_previous}>
              <ChevronLeft />
            </Button>
          )}
          <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="secondary" size="icon">
              <Link href={pageHref(page + 1)} aria-label={dict.action_next}>
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="icon" disabled aria-label={dict.action_next}>
              <ChevronRight />
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
