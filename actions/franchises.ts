"use server";

// Film series ("reeksen", TMDB collections) and how complete you have them.
// No schema: which series a film belongs to comes from TMDB, cached a week.

import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/preferences";
import { getMovieCollectionRef, getTmdbCollection } from "@/lib/tmdb/server";
import { isSeries } from "@/lib/titles";
import { fetchAll } from "@/lib/supabase/fetch-all";

export type FranchisePart = { id: number; title: string; poster: string | null; year: string | null; owned: boolean; wished: boolean };
export type Franchise = { id: number; name: string; poster: string | null; parts: FranchisePart[]; owned: number };

/** Most films looked up per visit. Uncached, TMDB answers ~35 films/s at 20
 * parallel requests, so a first visit with 1200 films takes ~35 s; after that
 * the week-long fetch cache makes it quick. */
const MAX_FILMS = 1200;
const CONCURRENCY = 20;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function ownedAndWished() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  const { data: cols } = await supabase.from("collections").select("id").eq("user_id", user.id);
  const owned = new Set<number>();
  const colIds = (cols ?? []).map((c: { id: string }) => c.id);
  if (colIds.length > 0) {
    const rows = await fetchAll<{ tmdb_movie_id: number }>((from, to) =>
      supabase.from("collection_items").select("tmdb_movie_id").in("collection_id", colIds).order("id").range(from, to),
    );
    for (const r of rows) if (!isSeries(r.tmdb_movie_id)) owned.add(r.tmdb_movie_id);
  }
  const { data: wl } = await supabase.from("wishlist_items").select("tmdb_movie_id").eq("user_id", user.id);
  const wished = new Set(((wl ?? []) as { tmdb_movie_id: number }[]).map((w) => w.tmdb_movie_id));
  return { owned, wished };
}

function toFranchise(c: Awaited<ReturnType<typeof getTmdbCollection>>, owned: Set<number>, wished: Set<number>): Franchise | null {
  const today = new Date().toISOString().slice(0, 10);
  // Only released parts: an announced sequel isn't "missing" yet.
  const parts = c.parts
    .filter((p) => p.release_date && p.release_date <= today)
    .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""))
    .map((p) => ({
      id: p.id,
      title: p.title,
      poster: p.poster_path,
      year: p.release_date?.slice(0, 4) ?? null,
      owned: owned.has(p.id),
      wished: wished.has(p.id),
    }));
  if (parts.length < 2) return null;
  return { id: c.id, name: c.name, poster: c.poster_path, parts, owned: parts.filter((p) => p.owned).length };
}

/** Every film series you own at least one part of, closest to complete first. */
export async function getFranchiseProgress(): Promise<Franchise[]> {
  const { owned, wished } = await ownedAndWished();
  const locale = await getLocale();
  const films = Array.from(owned).slice(0, MAX_FILMS);
  const refs = await mapLimit(films, CONCURRENCY, (id) => getMovieCollectionRef(id).catch(() => null));
  const ids = Array.from(new Set(refs.filter((r) => r != null).map((r) => r!.id)));
  const collections = await mapLimit(ids, CONCURRENCY, (id) => getTmdbCollection(id, locale).catch(() => null));
  return collections
    .map((c) => (c ? toFranchise(c, owned, wished) : null))
    .filter((f): f is Franchise => f !== null)
    .sort((a, b) => {
      const missA = a.parts.length - a.owned;
      const missB = b.parts.length - b.owned;
      // Incomplete first (fewest missing), complete ones last.
      if ((missA === 0) !== (missB === 0)) return missA === 0 ? 1 : -1;
      return missA - missB || b.owned - a.owned || a.name.localeCompare(b.name);
    });
}

/** One series for the film page: "part of X, you have 2 of 3". */
export async function getFranchiseForFilm(collectionId: number): Promise<Franchise | null> {
  const [{ owned, wished }, locale] = await Promise.all([ownedAndWished(), getLocale()]);
  const c = await getTmdbCollection(collectionId, locale).catch(() => null);
  return c ? toFranchise(c, owned, wished) : null;
}
