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
  /** The film series it is part of (TMDB "collection"), e.g. The Lord of the Rings. */
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path?: string | null } | null;
}

/** /collection/{id}: a film series and its parts. */
export interface CollectionDto {
  id: number;
  name: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: MovieSummaryDto[];
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

// --- Series (TMDB /tv). Normalised to MovieSummaryDto with a NEGATIVE id
// (lib/titles.ts) so every film flow — picker, collection, wishlist,
// Bekeken, feed — handles a series unchanged.

export interface TvSummaryDto {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  vote_average: number;
}

export interface SeasonDto {
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TvDetailDto extends TvSummaryDto {
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: SeasonDto[];
  genres: GenreDto[];
  status: string | null;
  episode_run_time: number[];
  original_language: string | null;
  tagline: string | null;
  last_air_date: string | null;
  in_production: boolean;
  created_by: { id: number; name: string }[];
  vote_count: number;
}

export interface AggregateCastDto {
  id: number;
  name: string;
  profile_path: string | null;
  roles: { character: string; episode_count: number }[];
  total_episode_count: number;
  order: number;
}

export interface TvDetailFullDto extends TvDetailDto {
  aggregate_credits: { cast: AggregateCastDto[] };
  videos: { results: VideoDto[] };
  recommendations: { results: TvSummaryDto[] };
  content_ratings: { results: { iso_3166_1: string; rating: string }[] };
}

/** A series as a "film-shaped" summary: id = minus the TMDB tv id. */
export function tvToSummary(tv: TvSummaryDto): MovieSummaryDto {
  return {
    id: -Math.abs(tv.id),
    title: tv.name,
    overview: tv.overview,
    poster_path: tv.poster_path,
    backdrop_path: tv.backdrop_path,
    release_date: tv.first_air_date || null,
    vote_average: tv.vote_average,
  };
}

/** Regular seasons (season 0 = specials excluded). */
export function regularSeasons(tv: Pick<TvDetailDto, "seasons">): SeasonDto[] {
  return (tv.seasons ?? []).filter((s) => s.season_number > 0);
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
