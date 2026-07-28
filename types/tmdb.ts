// Mirrors movies/model/*.kt exactly (field names as TMDB returns them).

export interface GenreDto {
  id: number;
  name: string;
}

export interface MovieSummaryDto {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
}

export interface MovieDetailDto extends MovieSummaryDto {
  runtime: number | null;
  genres: GenreDto[];
  status: string | null;
  budget: number;
  revenue: number;
  original_language: string | null;
}

export interface MoviePageDto {
  page: number;
  results: MovieSummaryDto[];
  total_pages: number;
  total_results: number;
}

export function posterUrl(path: string | null, size: "w200" | "w500" = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function backdropUrl(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w780${path}` : null;
}

export function isReleased(status: string | null) {
  return status === "Released";
}
