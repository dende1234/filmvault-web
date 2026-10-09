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

// Extra data for the film detail page (append_to_response on /movie/{id}).
export interface CastMemberDto {
  id: number;
  name: string;
  character: string | null;
  profile_path: string | null;
  order: number;
}

export interface CrewMemberDto {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface VideoDto {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
  iso_639_1: string | null;
}

export interface ReleaseDatesDto {
  results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[];
}

export interface MovieDetailFullDto extends MovieDetailDto {
  tagline: string | null;
  vote_count: number;
  credits: { cast: CastMemberDto[]; crew: CrewMemberDto[] };
  videos: { results: VideoDto[] };
  recommendations: { results: MovieSummaryDto[] };
  release_dates: ReleaseDatesDto;
}

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size: "w200" | "w342" | "w500" | "w780" = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w780") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null, size: "w185" | "h632" = "w185") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function isReleased(status: string | null) {
  return status === "Released";
}
