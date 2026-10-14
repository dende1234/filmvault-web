import "server-only";
import type { GenreDto, MovieDetailDto, MovieDetailFullDto, MoviePageDto, TvDetailDto, TvDetailFullDto, TvSummaryDto } from "@/types/tmdb";
import { tvToSummary } from "@/types/tmdb";
import { parseTitleId } from "@/lib/titles";

// Server-only TMDB client — mirrors movies/MovieRepository.kt's calls exactly,
// except the API key stays server-side (TMDB_API_KEY, no NEXT_PUBLIC_ prefix)
// instead of being compiled into a client bundle. `language` defaults to "nl"
// but is threaded through from the caller's profile preference, unlike the
// Android app's hardcoded "nl-NL".

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY!;

function tmdbLocale(language: string) {
  return language === "en" ? "en-US" : "nl-NL";
}

async function tmdbGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status} ${path}`);
  return res.json();
}

export async function searchMovies(query: string, page: number, language = "nl"): Promise<MoviePageDto> {
  return tmdbGet("/search/movie", { language: tmdbLocale(language), query, page });
}

export async function discoverMovies(
  page: number,
  genreId: number | undefined,
  sortBy: string,
  year: number | undefined,
  language = "nl",
): Promise<MoviePageDto> {
  return tmdbGet("/discover/movie", {
    language: tmdbLocale(language),
    page,
    sort_by: sortBy,
    with_genres: genreId,
    primary_release_year: year,
  });
}

export async function getGenres(language = "nl"): Promise<GenreDto[]> {
  const data = await tmdbGet<{ genres: GenreDto[] }>("/genre/movie/list", { language: tmdbLocale(language) });
  return data.genres ?? [];
}

export async function getMovieDetail(movieId: number, language = "nl"): Promise<MovieDetailDto> {
  return tmdbGet(`/movie/${movieId}`, { language: tmdbLocale(language) });
}

/** Everything the film detail page shows, in one request: credits, videos
 * (localized + English + language-neutral, since Dutch trailers are rare),
 * recommendations and per-country release dates (for the Kijkwijzer age). */
export async function getMovieDetailFull(movieId: number, language = "nl"): Promise<MovieDetailFullDto> {
  return tmdbGet(`/movie/${movieId}`, {
    language: tmdbLocale(language),
    append_to_response: "credits,videos,recommendations,release_dates",
    include_video_language: `${language},en,null`,
  });
}

/** Weekly trending films — the poster wall on the public landing page. */
export async function getTrendingMovies(language = "nl"): Promise<MoviePageDto> {
  return tmdbGet("/trending/movie/week", { language: tmdbLocale(language) });
}

// --- Series (TMDB /tv). Search/discover results come back film-shaped with
// negative ids (tvToSummary), see lib/titles.ts.

type TvPage = { page: number; results: TvSummaryDto[]; total_pages: number; total_results: number };

function tvPage(data: TvPage): MoviePageDto {
  return { ...data, results: (data.results ?? []).map(tvToSummary) };
}

export async function searchTv(query: string, page: number, language = "nl"): Promise<MoviePageDto> {
  return tvPage(await tmdbGet<TvPage>("/search/tv", { language: tmdbLocale(language), query, page }));
}

/** Same sort keys as discoverMovies; the movie release-date key maps to the
 * tv first-air-date key. */
export async function discoverTv(
  page: number,
  genreId: number | undefined,
  sortBy: string,
  year: number | undefined,
  language = "nl",
): Promise<MoviePageDto> {
  return tvPage(
    await tmdbGet<TvPage>("/discover/tv", {
      language: tmdbLocale(language),
      page,
      sort_by: sortBy.replace("primary_release_date", "first_air_date").replace("release_date", "first_air_date"),
      with_genres: genreId,
      first_air_date_year: year,
    }),
  );
}

export async function getTvGenres(language = "nl"): Promise<GenreDto[]> {
  const data = await tmdbGet<{ genres: GenreDto[] }>("/genre/tv/list", { language: tmdbLocale(language) });
  return data.genres ?? [];
}

export async function getTvDetail(tvId: number, language = "nl"): Promise<TvDetailDto> {
  return tmdbGet(`/tv/${tvId}`, { language: tmdbLocale(language) });
}

/** Everything the series page shows in one request. */
export async function getTvDetailFull(tvId: number, language = "nl"): Promise<TvDetailFullDto> {
  return tmdbGet(`/tv/${tvId}`, {
    language: tmdbLocale(language),
    append_to_response: "aggregate_credits,videos,recommendations,content_ratings",
    include_video_language: `${language},en,null`,
  });
}

/** Detail for a STORED title id (film or series), film-shaped so existing
 * callers (collection item, dashboard, admin, import) work for both. For a
 * series the id stays negative and runtime is the typical episode length. */
export async function getTitleDetail(titleId: number, language = "nl"): Promise<MovieDetailDto> {
  const { kind, tmdbId } = parseTitleId(titleId);
  if (kind === "movie") return getMovieDetail(tmdbId, language);
  const tv = await getTvDetail(tmdbId, language);
  return {
    ...tvToSummary(tv),
    runtime: tv.episode_run_time?.[0] ?? null,
    genres: tv.genres ?? [],
    status: tv.status,
    budget: 0,
    revenue: 0,
    original_language: tv.original_language,
  };
}
