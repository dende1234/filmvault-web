/** Title-id convention — the ONLY place that knows it (see
 * FilmVault/supabase/sql/series_support.sql):
 *   > 0  a film   = TMDB movie id
 *   < 0  a series = minus the TMDB tv id (Game of Thrones = -1399)
 * TMDB numbers movies and tv separately, so the sign keeps them apart in
 * every existing `tmdb_movie_id` column without a schema change. */

export type TitleKind = "movie" | "tv";

export function toTitleId(kind: TitleKind, tmdbId: number): number {
  return kind === "tv" ? -Math.abs(tmdbId) : Math.abs(tmdbId);
}

export function parseTitleId(titleId: number): { kind: TitleKind; tmdbId: number } {
  return titleId < 0 ? { kind: "tv", tmdbId: -titleId } : { kind: "movie", tmdbId: titleId };
}

export function isSeries(titleId: number | null | undefined): boolean {
  return typeof titleId === "number" && titleId < 0;
}

/** Detail page for a stored title id. */
export function titleHref(titleId: number): string {
  const { kind, tmdbId } = parseTitleId(titleId);
  return kind === "tv" ? `/series/${tmdbId}` : `/films/${tmdbId}`;
}
