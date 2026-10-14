"use server";

import { getTvDetail } from "@/lib/tmdb/server";
import { getLocale } from "@/lib/preferences";
import { parseTitleId } from "@/lib/titles";

export type SeasonOption = { seasonNumber: number; name: string; episodeCount: number };

/** Season list for a series title id (negative), for the seasons picker.
 * Regular seasons first, specials (season 0) last. Empty for films. */
export async function getSeriesSeasons(titleId: number): Promise<SeasonOption[]> {
  const { kind, tmdbId } = parseTitleId(titleId);
  if (kind !== "tv") return [];
  const tv = await getTvDetail(tmdbId, await getLocale()).catch(() => null);
  if (!tv) return [];
  return (tv.seasons ?? [])
    .map((s) => ({ seasonNumber: s.season_number, name: s.name, episodeCount: s.episode_count }))
    .sort((a, b) => (a.seasonNumber === 0 ? 1 : b.seasonNumber === 0 ? -1 : a.seasonNumber - b.seasonNumber));
}
