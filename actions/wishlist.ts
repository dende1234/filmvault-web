"use server";

// Direct port of wishlist/WishlistRepository.kt — owner-only, no new
// architecture, mirrors the "extensions" round's Fase 4.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WishlistItem } from "@/types/database";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

export async function getWishlist(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("wishlist_items").select("*").eq("user_id", userId);
  if (error) throw error;
  // Holy Grails first, then newest.
  return (data as WishlistItem[]).sort(
    (a, b) => Number(!!b.is_grail) - Number(!!a.is_grail) || (b.added_at ?? "").localeCompare(a.added_at ?? ""),
  );
}

/** Marks a wishlist title as Holy Grail (or not). "not_ready" until
 * collector_extras.sql has run. */
export async function setWishlistGrail(id: string, isGrail: boolean): Promise<{ error: "not_ready" | "failed" | null }> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("wishlist_items").update({ is_grail: isGrail }).eq("id", id).eq("user_id", userId);
  if (error?.code === "PGRST204") return { error: "not_ready" };
  if (error) return { error: "failed" };
  revalidatePath("/wishlist");
  return { error: null };
}

export async function isOnWishlist(tmdbMovieId: number): Promise<boolean> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("tmdb_movie_id", tmdbMovieId);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** `seasons` (series only): the wanted seasons; omitted = the whole title.
 * Only sent when set, so film wishlists work before series_support.sql. */
export async function addToWishlist(
  tmdbMovieId: number,
  movieTitle: string,
  moviePoster: string | null,
  seasons?: number[] | null,
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("wishlist_items").insert({
    user_id: userId,
    tmdb_movie_id: tmdbMovieId,
    movie_title: movieTitle,
    movie_poster: moviePoster,
    ...(seasons && seasons.length > 0 ? { seasons } : {}),
  });
  if (error) throw error;
  revalidatePath("/wishlist");
}

export async function removeFromWishlist(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/wishlist");
}

/** Auto-cleanup once a movie is actually added to a collection via the direct
 * (already-known-barcode) path — called from components/add-to-collection-dialog.tsx. No-op if
 * it wasn't on the wishlist. Not called from the admin pending-barcode-approval path: that runs
 * as the ADMIN's session, which has no RLS permission to delete another user's (the original
 * submitter's) wishlist row — accepted as a known gap, same as the Android side. */
export async function removeFromWishlistByMovie(tmdbMovieId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("wishlist_items").delete().eq("user_id", userId).eq("tmdb_movie_id", tmdbMovieId);
  if (error) throw error;
  revalidatePath("/wishlist");
}

/** Like removeFromWishlistByMovie, but for a series wished for specific
 * seasons it only removes the entry once ALL those seasons are owned
 * (in any of the user's collections). Films / whole-series wishes behave
 * exactly like removeFromWishlistByMovie. */
export async function removeFromWishlistIfCovered(titleId: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data: rows } = await supabase.from("wishlist_items").select("*").eq("user_id", userId).eq("tmdb_movie_id", titleId);
  const wish = (rows ?? [])[0] as { seasons?: number[] | null } | undefined;
  if (!wish) return;
  const wanted = wish.seasons ?? [];
  if (wanted.length > 0) {
    const { data: cols } = await supabase.from("collections").select("id").eq("user_id", userId);
    const ids = (cols ?? []).map((c) => c.id as string);
    const { data: items } = ids.length
      ? await supabase.from("collection_items").select("seasons").in("collection_id", ids).eq("tmdb_movie_id", titleId)
      : { data: [] };
    const owned = new Set((items ?? []).flatMap((i) => (i.seasons as number[] | null) ?? []));
    if (!wanted.every((s) => owned.has(s))) return;
  }
  await removeFromWishlistByMovie(titleId);
}
