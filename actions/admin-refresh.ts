"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTitleDetail } from "@/lib/tmdb/server";
import { logAdminAction } from "@/lib/admin/log";

const BATCH = 25;
const TABLES = ["collection_items", "wishlist_items"] as const;

export type RefreshResult = { error: "no_service_key" | null; next: number | null; checked: number; updated: number };

/** Brings posters (and empty titles) of every title in members' collections
 * and wishlists in line with TMDB, BATCH titles per call so each call stays
 * short; the client calls again with `next` until it is null. Uses the
 * service role: these are other members' rows, and requireAdmin() decided. */
export async function refreshTitlesBatch(after: number | null): Promise<RefreshResult> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "no_service_key", next: null, checked: 0, updated: 0 };

  // The next BATCH distinct title ids after `after`, from both tables.
  const ids = new Set<number>();
  for (const table of TABLES) {
    let q = admin.from(table).select("tmdb_movie_id").order("tmdb_movie_id").limit(2000);
    if (after !== null) q = q.gt("tmdb_movie_id", after);
    const { data } = await q;
    for (const r of (data ?? []) as { tmdb_movie_id: number }[]) if (r.tmdb_movie_id) ids.add(r.tmdb_movie_id);
  }
  const batch = [...ids].sort((a, b) => a - b).slice(0, BATCH);

  let updated = 0;
  await Promise.all(
    batch.map(async (id) => {
      const detail = await getTitleDetail(id).catch(() => null);
      if (!detail) return;
      const poster = detail.poster_path ?? null;
      const title = detail.title?.trim();
      for (const table of TABLES) {
        if (poster) {
          const [a, b] = await Promise.all([
            admin.from(table).update({ movie_poster: poster }).eq("tmdb_movie_id", id).neq("movie_poster", poster).select("id"),
            admin.from(table).update({ movie_poster: poster }).eq("tmdb_movie_id", id).is("movie_poster", null).select("id"),
          ]);
          updated += (a.data?.length ?? 0) + (b.data?.length ?? 0);
        }
        // Titles are only filled in when empty: members may have their own
        // spelling or language, which a refresh shouldn't overwrite.
        if (title) {
          const { data } = await admin.from(table).update({ movie_title: title }).eq("tmdb_movie_id", id).eq("movie_title", "").select("id");
          updated += data?.length ?? 0;
        }
      }
    }),
  );

  const next = batch.length === BATCH ? batch[BATCH - 1] : null;
  return { error: null, next, checked: batch.length, updated };
}

/** Called once when a full refresh run has finished, for /admin/log. */
export async function logTitlesRefresh(checked: number, updated: number): Promise<void> {
  await requireAdmin();
  await logAdminAction("titles_refresh", undefined, { titles: checked, rows: updated });
}
