"use server";

// Snapshot for Winkelmodus without signal (lib/shop-offline.ts): your own
// barcodes, the master-list barcodes of titles you own or want, your wishlist.

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { ShopSnapshot } from "@/lib/shop-offline";

const CHUNK = 300;

export async function getShopSnapshot(): Promise<ShopSnapshot> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: cols } = await supabase.from("collections").select("id").eq("user_id", userId);
  const colIds = (cols ?? []).map((c: { id: string }) => c.id);

  type Row = { tmdb_movie_id: number; barcode: string | null; movie_title: string; movie_poster: string | null; is_box: boolean; box_name: string | null };
  const items = colIds.length
    ? await fetchAll<Row>((from, to) =>
        supabase.from("collection_items").select("tmdb_movie_id, barcode, movie_title, movie_poster, is_box, box_name").in("collection_id", colIds).order("id").range(from, to),
      )
    : [];
  const wishlist = await fetchAll<{ tmdb_movie_id: number; movie_title: string; movie_poster: string | null; is_grail?: boolean }>((from, to) =>
    supabase.from("wishlist_items").select("*").eq("user_id", userId).order("id").range(from, to),
  );

  const snapshot: ShopSnapshot = { userId, savedAt: new Date().toISOString(), owned: {}, known: {}, ownedIds: [], wish: {}, titles: {} };
  const ownedIds = new Set<number>();
  for (const it of items) {
    ownedIds.add(it.tmdb_movie_id);
    snapshot.titles[it.tmdb_movie_id] = { name: it.movie_title, poster: it.movie_poster };
    if (!it.barcode) continue;
    const entry = snapshot.owned[it.barcode];
    if (entry) {
      if (!entry.ids.includes(it.tmdb_movie_id)) entry.ids.push(it.tmdb_movie_id);
    } else {
      snapshot.owned[it.barcode] = { ids: [it.tmdb_movie_id], name: it.is_box ? (it.box_name ?? it.movie_title) : it.movie_title, poster: it.movie_poster, isBox: it.is_box };
    }
  }
  for (const w of wishlist) {
    snapshot.wish[w.tmdb_movie_id] = !!w.is_grail;
    snapshot.titles[w.tmdb_movie_id] ??= { name: w.movie_title, poster: w.movie_poster };
  }
  snapshot.ownedIds = Array.from(ownedIds);

  const ids = Array.from(new Set([...ownedIds, ...wishlist.map((w) => w.tmdb_movie_id)]));
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const rows = await fetchAll<{ barcode: string; tmdb_movie_id: number }>((from, to) =>
      supabase.from("barcodes").select("barcode, tmdb_movie_id").in("tmdb_movie_id", chunk).order("id").range(from, to),
    );
    for (const r of rows) {
      const list = (snapshot.known[r.barcode] ??= []);
      if (!list.includes(r.tmdb_movie_id)) list.push(r.tmdb_movie_id);
    }
  }
  return snapshot;
}
