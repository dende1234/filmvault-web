"use server";

// Release calendar (/releases): DVD/Blu-ray/4K releases in the Netherlands
// (or Belgium) from TMDB, and the ones on your wishlist.

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { discoverPhysicalReleases, getReleaseDates } from "@/lib/tmdb/server";
import { monthRange, physicalReleaseBetween, physicalReleases } from "@/lib/releases";
import { isSeries } from "@/lib/titles";

export type CalendarRelease = { tmdbId: number; title: string; poster: string | null; date: string; note: string | null; wished: boolean; owned: boolean };

const PAGES = 2;
const WISHLIST_MAX = 150;

async function mine(userId: string) {
  const supabase = await createClient();
  const [{ data: wl }, { data: cols }] = await Promise.all([
    supabase.from("wishlist_items").select("tmdb_movie_id, movie_title, movie_poster").eq("user_id", userId),
    supabase.from("collections").select("id").eq("user_id", userId),
  ]);
  const ids = (cols ?? []).map((c: { id: string }) => c.id);
  const { data: owned } = ids.length ? await supabase.from("collection_items").select("tmdb_movie_id").in("collection_id", ids).limit(5000) : { data: [] };
  return {
    wishlist: (wl ?? []) as { tmdb_movie_id: number; movie_title: string; movie_poster: string | null }[],
    owned: new Set(((owned ?? []) as { tmdb_movie_id: number }[]).map((o) => o.tmdb_movie_id)),
  };
}

/** One month: the most popular physical releases in the country with their
 * exact date, your wishlist titles first. */
export async function getReleaseMonth(month: string, country: "NL" | "BE"): Promise<CalendarRelease[]> {
  const userId = await requireUserId();
  const locale = await getLocale();
  const { from, to } = monthRange(month);
  const [{ wishlist, owned }, ...pages] = await Promise.all([
    mine(userId),
    ...Array.from({ length: PAGES }, (_, i) => discoverPhysicalReleases(country, from, to, i + 1, locale).catch(() => null)),
  ]);
  const wished = new Set(wishlist.map((w) => w.tmdb_movie_id));
  const movies = Array.from(new Map(pages.flatMap((p) => p?.results ?? []).map((m) => [m.id, m])).values());
  const withDates = await Promise.all(
    movies.map(async (m) => {
      const r = physicalReleaseBetween(await getReleaseDates(m.id).catch(() => null), country, from, to);
      return r ? { tmdbId: m.id, title: m.title, poster: m.poster_path, date: r.date, note: r.note, wished: wished.has(m.id), owned: owned.has(m.id) } : null;
    }),
  );
  return withDates.filter((x): x is CalendarRelease => !!x).sort((a, b) => Number(b.wished) - Number(a.wished) || a.date.localeCompare(b.date));
}

/** Your wishlist films with a physical release still to come in the country. */
export async function getUpcomingWishlistReleases(country: "NL" | "BE"): Promise<CalendarRelease[]> {
  const userId = await requireUserId();
  const { wishlist, owned } = await mine(userId);
  const today = new Date().toISOString().slice(0, 10);
  const films = wishlist.filter((w) => !isSeries(w.tmdb_movie_id)).slice(0, WISHLIST_MAX);
  const found = await Promise.all(
    films.map(async (w) => {
      const next = physicalReleases(await getReleaseDates(w.tmdb_movie_id).catch(() => null), country).find((r) => r.date >= today);
      return next ? { tmdbId: w.tmdb_movie_id, title: w.movie_title, poster: w.movie_poster, date: next.date, note: next.note, wished: true, owned: owned.has(w.tmdb_movie_id) } : null;
    }),
  );
  return found.filter((x): x is CalendarRelease => !!x).sort((a, b) => a.date.localeCompare(b.date));
}
