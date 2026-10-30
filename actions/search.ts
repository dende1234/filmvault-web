"use server";

// Search across everything that's yours: copies in all your collections,
// your wishlist and your watched log. Title (contains) or an exact barcode.

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { normalizeBarcode } from "@/lib/barcode";

export type SearchHit =
  | { kind: "copy"; id: string; collectionId: string; collectionName: string; tmdbId: number; title: string; poster: string | null; type: string; editie: string; isBox: boolean; boxGroupId: string | null; boxName: string | null }
  | { kind: "wish"; tmdbId: number; title: string; poster: string | null; grail: boolean }
  | { kind: "watched"; tmdbId: number; title: string; poster: string | null; rating: number | null };

const LIMIT = 25;

export async function searchMine(raw: string): Promise<SearchHit[]> {
  const userId = await requireUserId();
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data: cols } = await supabase.from("collections").select("id, name").eq("user_id", userId);
  const names = new Map(((cols ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  // PostgREST pattern: escape the LIKE wildcards the user typed.
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const code = normalizeBarcode(q);
  const isCode = /^\d{8,14}$/.test(code);

  const copiesQuery = names.size
    ? (isCode
        ? supabase.from("collection_items").select("*").in("collection_id", [...names.keys()]).eq("barcode", code)
        : supabase.from("collection_items").select("*").in("collection_id", [...names.keys()]).ilike("movie_title", like)
      ).order("movie_title").limit(LIMIT * 3)
    : null;
  const [copies, wishes, watched] = await Promise.all([
    copiesQuery ?? Promise.resolve({ data: [] }),
    isCode ? Promise.resolve({ data: [] }) : supabase.from("wishlist_items").select("*").eq("user_id", userId).ilike("movie_title", like).limit(10),
    isCode ? Promise.resolve({ data: [] }) : supabase.from("film_logs").select("tmdb_movie_id, movie_title, movie_poster, rating, watched").eq("user_id", userId).ilike("movie_title", like).limit(10),
  ]);

  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const c of (copies.data ?? []) as Record<string, unknown>[]) {
    // A box shows once; a copy in several collections shows once (first collection).
    const key = c.is_box && c.box_group_id ? `box:${c.box_group_id}` : `copy:${c.item_group_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      kind: "copy",
      id: c.id as string,
      collectionId: c.collection_id as string,
      collectionName: names.get(c.collection_id as string) ?? "",
      tmdbId: c.tmdb_movie_id as number,
      title: c.movie_title as string,
      poster: (c.movie_poster as string | null) ?? null,
      type: c.type as string,
      editie: c.editie as string,
      isBox: !!c.is_box,
      boxGroupId: (c.box_group_id as string | null) ?? null,
      boxName: (c.box_name as string | null) ?? null,
    });
    if (hits.length >= LIMIT) break;
  }
  for (const w of (wishes.data ?? []) as { tmdb_movie_id: number; movie_title: string; movie_poster: string | null; is_grail?: boolean }[]) {
    hits.push({ kind: "wish", tmdbId: w.tmdb_movie_id, title: w.movie_title, poster: w.movie_poster, grail: !!w.is_grail });
  }
  for (const l of (watched.data ?? []) as { tmdb_movie_id: number; movie_title: string; movie_poster: string | null; rating: number | null; watched: boolean }[]) {
    if (l.watched || l.rating != null) hits.push({ kind: "watched", tmdbId: l.tmdb_movie_id, title: l.movie_title, poster: l.movie_poster, rating: l.rating });
  }
  return hits;
}
