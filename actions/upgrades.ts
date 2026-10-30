"use server";

// /upgrades: titles you own only on DVD (or Blu-ray) while the master film
// list (barcodes) knows a Blu-ray or 4K release. Reads only.

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { findUpgrades, type UpgradeTip } from "@/lib/upgrades";

const CHUNK = 300;

export async function getUpgradeTips(): Promise<(UpgradeTip & { wished: boolean })[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: cols } = await supabase.from("collections").select("id").eq("user_id", userId);
  const colIds = (cols ?? []).map((c: { id: string }) => c.id);
  if (colIds.length === 0) return [];

  const owned = await fetchAll<{ tmdb_movie_id: number; type: string; movie_title: string; movie_poster: string | null }>((from, to) =>
    supabase.from("collection_items").select("tmdb_movie_id, type, movie_title, movie_poster").in("collection_id", colIds).order("id").range(from, to),
  );
  const ids = Array.from(new Set(owned.map((o) => o.tmdb_movie_id)));
  const releases: { tmdb_movie_id: number; type: string }[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    releases.push(
      ...(await fetchAll<{ tmdb_movie_id: number; type: string }>((from, to) =>
        supabase.from("barcodes").select("tmdb_movie_id, type").in("tmdb_movie_id", chunk).order("id").range(from, to),
      )),
    );
  }
  const tips = findUpgrades(owned, releases);
  if (tips.length === 0) return [];

  const { data: wl } = await supabase.from("wishlist_items").select("tmdb_movie_id").eq("user_id", userId).in("tmdb_movie_id", tips.map((t) => t.tmdbId));
  const wished = new Set(((wl ?? []) as { tmdb_movie_id: number }[]).map((w) => w.tmdb_movie_id));
  return tips.map((t) => ({ ...t, wished: wished.has(t.tmdbId) }));
}
