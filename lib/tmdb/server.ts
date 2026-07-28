import "server-only";
import type { GenreDto, MovieDetailDto, MoviePageDto } from "@/types/tmdb";

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
