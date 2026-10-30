"use server";

// Direct port of collections/CollectionRepository.kt — table names, column
// names and the item_group_id/pending-approval/box logic all match exactly.
// Only the client library changed (supabase-kt -> supabase-js).
// Barcode/scan flows live in ./barcodes.ts, the admin approval queue in
// ./approvals.ts.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { cleanLanguages } from "@/lib/copy-details";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isMissingError } from "@/lib/admin/migrations";
import { isSeries } from "@/lib/titles";
import { purchaseColumns } from "@/lib/purchase";
import type { Collection, CollectionItem, Condition, PublicCollection } from "@/types/database";

export async function getUserCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("collections").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as Collection[];
}

/** Read-only view of another user's collections — relies entirely on the
 * "collections_select_accepted_friends" RLS policy (friends_and_badges_policies.sql)
 * to return rows only when the caller and userId are accepted friends; no
 * client-side friendship check here, same "trust RLS" convention as Android. */
export async function getCollectionsForUser(userId: string): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as Collection[];
}

export async function getCollection(collectionId: string): Promise<Collection | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("collections").select("*").eq("id", collectionId).maybeSingle();
  return data as Collection | null;
}

/** Owner-only toggle for "openbaar via link". The user_id filter makes it a
 * no-op on someone else's collection, on top of the table's own RLS. */
export async function setCollectionPublic(collectionId: string, isPublic: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("collections")
    .update({ is_public: isPublic })
    .eq("id", collectionId)
    .eq("user_id", userId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "not_found" };
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/c/${collectionId}`);
  return { error: null };
}

/** Public, logged-out-safe read of a shared collection (null = not shared). */
export async function getPublicCollection(collectionId: string): Promise<PublicCollection | null> {
  if (!/^[0-9a-f-]{36}$/i.test(collectionId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_collection", { p_collection_id: collectionId });
  if (error || !data) return null;
  return data as PublicCollection;
}

export async function createCollection(name: string, description: string | null): Promise<Collection> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name, description })
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/collections");
  return data as Collection;
}

export async function getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
  const supabase = await createClient();
  return fetchAll<CollectionItem>((from, to) =>
    supabase.from("collection_items").select("*").eq("collection_id", collectionId).order("id").range(from, to),
  );
}

export async function getCollectionItemsForCollections(collectionIds: string[]): Promise<CollectionItem[]> {
  if (collectionIds.length === 0) return [];
  const supabase = await createClient();
  return fetchAll<CollectionItem>((from, to) =>
    supabase.from("collection_items").select("*").in("collection_id", collectionIds).order("id").range(from, to),
  );
}

/** Which of collectionIds already contain this movie (any barcode/edition counts as a duplicate).
 * Only used by the box flows, which intentionally dedup at movie granularity across the whole
 * box — see getCollectionIdsContainingBarcode for the plain single-item flow. */
export async function getCollectionIdsContainingMovie(tmdbMovieId: number, collectionIds: string[]): Promise<Set<string>> {
  if (collectionIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("collection_id")
    .eq("tmdb_movie_id", tmdbMovieId)
    .in("collection_id", collectionIds);
  if (error) throw error;
  return new Set((data as { collection_id: string }[]).map((r) => r.collection_id));
}

/** Which of collectionIds already contain this exact barcode — i.e. this exact physical copy.
 * Unlike getCollectionIdsContainingMovie, a different barcode of the same tmdb_movie_id is NOT
 * a duplicate here; this is what lets two physical copies of the same film coexist in one
 * collection while still blocking a true re-add of the same barcode. */
export async function getCollectionIdsContainingBarcode(barcode: string, collectionIds: string[]): Promise<Set<string>> {
  if (collectionIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("collection_id")
    .eq("barcode", barcode)
    .in("collection_id", collectionIds);
  if (error) throw error;
  return new Set((data as { collection_id: string }[]).map((r) => r.collection_id));
}

export async function getCollectionItem(itemId: string): Promise<CollectionItem | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("collection_items").select("*").eq("id", itemId).maybeSingle();
  return data as CollectionItem | null;
}

async function updateItemGroup(itemGroupId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").update(patch).eq("item_group_id", itemGroupId);
  if (error) throw error;
  revalidatePath("/collections", "layout");
}

/** Rating/watched/note/loan/favorite/tags/condition apply to EVERY collection_items
 * row sharing itemGroupId — the same physical disc has one value regardless of
 * how many collections it appears in (see shared_film_across_collections.sql). */
export async function updateCollectionItemRating(itemGroupId: string, rating: number) {
  await updateItemGroup(itemGroupId, { rating });
}

export async function updateCollectionItemWatched(itemGroupId: string, watched: boolean) {
  await updateItemGroup(itemGroupId, { watched });
}

export async function updateCollectionItemNote(itemGroupId: string, note: string | null) {
  await updateItemGroup(itemGroupId, { personal_note: note });
}

/** loanedTo non-null marks the item as loaned out; null marks it returned.
 * loaned_at is derived server-side by a DB trigger, never sent from here. */
export async function updateCollectionItemLoan(itemGroupId: string, loanedTo: string | null) {
  await updateItemGroup(itemGroupId, { loaned_to: loanedTo });
}

export async function updateCollectionItemFavorite(itemGroupId: string, isFavorite: boolean) {
  await updateItemGroup(itemGroupId, { is_favorite: isFavorite });
}

export async function updateCollectionItemTags(itemGroupId: string, tags: string[]) {
  await updateItemGroup(itemGroupId, { tags });
}

export async function updateCollectionItemCondition(itemGroupId: string, condition: Condition | null) {
  await updateItemGroup(itemGroupId, { condition });
}

/** Series copy: which seasons this release contains (all rows of the copy). */
export async function updateCollectionItemSeasons(itemGroupId: string, seasons: number[] | null) {
  const clean = seasons && seasons.length > 0 ? Array.from(new Set(seasons)).sort((a, b) => a - b) : null;
  await updateItemGroup(itemGroupId, { seasons: clean });
}

/** Cut, languages and label of one copy (every row of the group). Returns
 * "not_ready" until copy_details.sql has run, instead of throwing. */
export async function updateCollectionItemDetails(
  itemGroupId: string,
  details: {
    cut: string | null;
    label: string | null;
    audioLanguages: string[] | null;
    subtitleLanguages: string[] | null;
    region?: string | null;
    /** The copy's format, e.g. "4K Ultra HD + Blu-ray" for a combo release; only when changed. */
    type?: string;
  },
): Promise<{ error: "not_ready" | "invalid" | null }> {
  const cut = details.cut?.trim().slice(0, 60) || null;
  const label = details.label?.trim().slice(0, 80) || null;
  const region = details.region?.trim().slice(0, 20) || null;
  const supabase = await createClient();
  // region only when set or changed from the form, so the update also works
  // before contributors_region.sql has run.
  const regionField = details.region !== undefined ? { region } : {};
  const { error } = await supabase
    .from("collection_items")
    .update({
      cut,
      label,
      ...regionField,
      ...(details.type ? { type: details.type.trim().slice(0, 60) } : {}),
      audio_languages: cleanLanguages(details.audioLanguages)?.slice(0, 20) ?? null,
      subtitle_languages: cleanLanguages(details.subtitleLanguages)?.slice(0, 40) ?? null,
    })
    .eq("item_group_id", itemGroupId);
  if (error?.code === "PGRST204") return { error: "not_ready" };
  // 23514 = check, 23503 = a format that isn't in media_types (foreign key).
  if (error?.code === "23514" || error?.code === "23503") return { error: "invalid" };
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return { error: null };
}

/** Price, date and shop of a copy (every collection it is in).
 * "not_ready" until purchase_details.sql has run. */
export async function updateCollectionItemPurchase(
  itemGroupId: string,
  purchase: { price: number | null; date: string | null; shop: string | null },
): Promise<{ error: "not_ready" | "invalid" | null }> {
  await requireUserId();
  const cols = purchaseColumns(purchase);
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_items")
    .update({
      purchase_price: cols.purchase_price ?? null,
      purchase_date: cols.purchase_date ?? null,
      purchase_shop: cols.purchase_shop ?? null,
    })
    .eq("item_group_id", itemGroupId);
  if (isMissingError(error)) return { error: "not_ready" };
  if (error?.code === "23514" || error?.code === "22P02") return { error: "invalid" };
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return { error: null };
}

/** For sale / for trade / both, or null. "not_ready" before trade_list.sql. */
export async function updateCollectionItemTrade(itemGroupId: string, forTrade: "sale" | "trade" | "both" | null): Promise<{ error: "not_ready" | null }> {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").update({ for_trade: forTrade }).eq("item_group_id", itemGroupId);
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return { error: null };
}

/** Where the copy is; "" clears it. "not_ready" before shelf_location.sql. */
export async function updateCollectionItemLocation(itemGroupId: string, location: string | null): Promise<{ error: "not_ready" | null }> {
  await requireUserId();
  const supabase = await createClient();
  const value = location?.trim().slice(0, 80) || null;
  const { error } = await supabase.from("collection_items").update({ shelf_location: value }).eq("item_group_id", itemGroupId);
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return { error: null };
}

/** Every location you used, for suggestions (most used first). */
export async function getMyLocations(): Promise<string[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: cols } = await supabase.from("collections").select("id").eq("user_id", userId);
  const ids = (cols ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("collection_items").select("shelf_location").in("collection_id", ids).not("shelf_location", "is", null).limit(5000);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { shelf_location: string }[]) counts.set(r.shelf_location, (counts.get(r.shelf_location) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 50);
}

/** Returns the removed row, so the page can offer "Ongedaan maken". */
export async function removeCollectionItem(itemId: string): Promise<CollectionItem | null> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("collection_items").select("*").eq("id", itemId).maybeSingle();
  const { error } = await supabase.from("collection_items").delete().eq("id", itemId);
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return (row as CollectionItem | null) ?? null;
}

// One physical copy can sit in several collections: one collection_items row
// per collection, all sharing item_group_id (shared_film_across_collections.sql).
// A box is several films (each its own item_group_id) sharing box_group_id, and
// always moves as a whole. Columns copied to a new collection's row — only those
// the source row actually has, so a not-yet-run migration never breaks this.
const COPY_COLUMNS = [
  "item_group_id", "tmdb_movie_id", "movie_title", "movie_poster", "barcode", "type", "editie",
  "rating", "watched", "seasons", "custom_cover_path", "is_box", "box_group_id", "box_name",
  "personal_note", "loaned_to", "loaned_at", "is_favorite", "tags", "condition",
  "cut", "audio_languages", "subtitle_languages", "label", "region",
  // Later copy details: carried along too (skipped while their SQL hasn't run).
  "purchase_price", "purchase_date", "purchase_shop", "for_trade", "shelf_location",
] as const;
/** The caller's rows for this copy (or, for a box, the whole box), across all
 * of their collections. Friends can read collection_items too, so ownership is
 * checked against the caller's own collections, not just RLS. */
async function ownCopyRows(itemId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: own } = await supabase.from("collections").select("id").eq("user_id", userId);
  const ownIds = (own ?? []).map((c: { id: string }) => c.id);
  const { data: source } = await supabase.from("collection_items").select("*").eq("id", itemId).maybeSingle();
  if (!source || !ownIds.includes((source as CollectionItem).collection_id)) return null;
  const item = source as CollectionItem;
  const { data: rows, error } =
    item.is_box && item.box_group_id
      ? await supabase.from("collection_items").select("*").eq("box_group_id", item.box_group_id).in("collection_id", ownIds)
      : await supabase.from("collection_items").select("*").eq("item_group_id", item.item_group_id).in("collection_id", ownIds);
  if (error) throw error;
  return { item, rows: (rows ?? []) as CollectionItem[], ownIds };
}

/** Collections this copy (or box) is in, for the "In collecties" block. */
export async function getCopyCollectionIds(itemId: string): Promise<string[]> {
  const found = await ownCopyRows(itemId);
  if (!found) return [];
  return Array.from(new Set(found.rows.map((r) => r.collection_id)));
}

/** Puts this copy (or box) in exactly targetCollectionIds: adds rows sharing
 * the same item_group_id (so rating, note, loan, cover etc. stay one value)
 * and removes it from collections that were unticked. At least one collection
 * must remain — removing it everywhere is "Verwijderen", not this. Returns the
 * item id to show afterwards (the current one, or its row in a remaining
 * collection when the current collection was unticked). */
export async function setCopyCollections(
  itemId: string,
  targetCollectionIds: string[],
): Promise<{ error: "not_found" | "empty" | null; itemId?: string; collectionId?: string }> {
  const found = await ownCopyRows(itemId);
  if (!found) return { error: "not_found" };
  const targets = Array.from(new Set(targetCollectionIds)).filter((id) => found.ownIds.includes(id));
  if (targets.length === 0) return { error: "empty" };

  const supabase = await createClient();
  const current = new Set(found.rows.map((r) => r.collection_id));
  const toAdd = targets.filter((id) => !current.has(id));
  const toRemove = Array.from(current).filter((id) => !targets.includes(id));

  // One representative row per film (item_group_id) of this copy or box.
  const perGroup = new Map<string, CollectionItem>();
  for (const row of found.rows) if (!perGroup.has(row.item_group_id)) perGroup.set(row.item_group_id, row);

  if (toAdd.length > 0) {
    const inserts = toAdd.flatMap((collectionId) =>
      Array.from(perGroup.values()).map((row) => {
        const copy: Record<string, unknown> = { collection_id: collectionId };
        for (const col of COPY_COLUMNS) if (col in row) copy[col] = (row as unknown as Record<string, unknown>)[col];
        return copy;
      }),
    );
    const { error } = await supabase.from("collection_items").insert(inserts);
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const groupIds = Array.from(perGroup.keys());
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .in("item_group_id", groupIds)
      .in("collection_id", toRemove);
    if (error) throw error;
  }
  revalidatePath("/collections", "layout");

  if (targets.includes(found.item.collection_id)) return { error: null, itemId, collectionId: found.item.collection_id };
  const { data: next } = await supabase
    .from("collection_items")
    .select("id, collection_id")
    .eq("item_group_id", found.item.item_group_id)
    .in("collection_id", targets)
    .limit(1)
    .maybeSingle();
  return { error: null, itemId: (next as { id: string } | null)?.id, collectionId: (next as { collection_id: string } | null)?.collection_id };
}

/** The films of one box in one collection, by title. */
export async function getBoxItems(collectionId: string, boxGroupId: string): Promise<CollectionItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("box_group_id", boxGroupId)
    .order("movie_title");
  if (error) throw error;
  return data as CollectionItem[];
}

/** Removes a whole box (its films' rows) from one collection only. */
/** Returns the removed rows, so the page can offer "Ongedaan maken". */
export async function removeBoxFromCollection(collectionId: string, itemIds: string[]): Promise<CollectionItem[]> {
  if (itemIds.length === 0) return [];
  await requireUserId();
  const supabase = await createClient();
  const { data: rows } = await supabase.from("collection_items").select("*").eq("collection_id", collectionId).in("id", itemIds);
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).in("id", itemIds);
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return (rows ?? []) as CollectionItem[];
}

export async function getCollectionsByIds(collectionIds: string[]): Promise<Collection[]> {
  if (collectionIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("*").in("id", collectionIds);
  if (error) throw error;
  return data as Collection[];
}

/** Sets (or clears, with null) the custom cover of one copy — all rows of
 * its item_group_id — and removes the previous file from storage. The new
 * file was uploaded by the browser into the user's own folder. */
export async function setCollectionItemCover(itemGroupId: string, path: string | null): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (path && !path.startsWith(`${userId}/`)) return { error: "invalid_path" };
  const supabase = await createClient();
  const { data: rows } = await supabase.from("collection_items").select("custom_cover_path").eq("item_group_id", itemGroupId).limit(1);
  const previous = (rows?.[0] as { custom_cover_path?: string | null } | undefined)?.custom_cover_path ?? null;

  const { error } = await supabase.from("collection_items").update({ custom_cover_path: path }).eq("item_group_id", itemGroupId);
  if (error) return { error: error.message };
  if (previous && previous !== path && previous.startsWith(`${userId}/`)) {
    await supabase.storage.from("covers").remove([previous]).catch(() => {});
  }
  revalidatePath("/collections", "layout");
  revalidatePath("/dashboard");
  return { error: null };
}

export type DashboardData = {
  titles: number;
  watched: number;
  series: number;
  unwatched: number;
  recent: CollectionItem[];
  unwatchedRecent: CollectionItem[];
  /** "Film of the day": an unwatched copy, the same all day. */
  pick: CollectionItem | null;
  /** A random sample of unwatched copies for "Surprise me". */
  surprise: Pick<CollectionItem, "id" | "collection_id">[];
};

const RECENT = 15;

/** Dashboard numbers via dashboard_stats() (supabase/sql/dashboard_stats.sql);
 * until that has run, computed here from every copy. A copy in several
 * collections (shared item_group_id) counts once either way. */
export async function getDashboardData(collectionIds: string[]): Promise<DashboardData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_stats", { p_recent: RECENT });
  if (!error && data) {
    const d = data as Omit<DashboardData, "unwatchedRecent"> & { unwatched_recent: CollectionItem[] };
    return { ...d, unwatchedRecent: d.unwatched_recent, pick: d.pick ?? null };
  }
  if (error && !isMissingError(error)) throw error;

  const seen = new Set<string>();
  const items = (await getCollectionItemsForCollections(collectionIds)).filter((item) => {
    if (seen.has(item.item_group_id)) return false;
    seen.add(item.item_group_id);
    return true;
  });
  const byNewest = items.sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
  const unwatched = byNewest.filter((i) => !i.watched);
  const day = Math.floor(Date.now() / 86_400_000);
  return {
    titles: items.length,
    watched: items.length - unwatched.length,
    series: items.filter((i) => isSeries(i.tmdb_movie_id)).length,
    unwatched: unwatched.length,
    recent: byNewest.slice(0, RECENT),
    unwatchedRecent: unwatched.slice(0, RECENT),
    pick: unwatched.length > 0 ? unwatched[day % unwatched.length] : null,
    surprise: unwatched.map(({ id, collection_id }) => ({ id, collection_id })),
  };
}

/** /statistieken: every copy you own (all collections). */
export async function getMyStatsRows(): Promise<import("@/lib/collection-stats").StatsRow[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: cols } = await supabase.from("collections").select("id").eq("user_id", userId);
  const ids = (cols ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return [];
  return fetchAll((from, to) => supabase.from("collection_items").select("*").in("collection_id", ids).order("id").range(from, to));
}

export type BulkPatch = {
  addTags?: string[];
  removeTags?: string[];
  /** undefined = unchanged, null = clear */
  condition?: Condition | null;
  location?: string | null;
  forTrade?: "sale" | "trade" | "both" | null;
  /** Also put these copies in this collection (same item_group_id). */
  addToCollectionId?: string;
  /** Take them out of `fromCollectionId` (other collections keep them). */
  removeFromCollection?: boolean;
};

const BULK_MAX = 500;

/** "Selecteren" on a collection page: one change for many copies at once.
 * Only copies in the caller's own collections are touched. Returns the
 * rows removed from the collection (for "Ongedaan maken"). */
export async function bulkEditCopies(
  fromCollectionId: string,
  itemGroupIds: string[],
  patch: BulkPatch,
): Promise<{ error: "not_ready" | "not_found" | null; removed?: CollectionItem[] }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const groups = Array.from(new Set(itemGroupIds)).slice(0, BULK_MAX);
  const { data: own } = await supabase.from("collections").select("id").eq("user_id", userId);
  const ownIds = (own ?? []).map((c: { id: string }) => c.id);
  if (!ownIds.includes(fromCollectionId) || groups.length === 0) return { error: "not_found" };

  const rows = await fetchAll<CollectionItem>((from, to) =>
    supabase.from("collection_items").select("*").in("item_group_id", groups).in("collection_id", ownIds).order("id").range(from, to),
  );
  const mine = new Set(rows.map((r) => r.item_group_id));
  const ids = groups.filter((g) => mine.has(g));
  if (ids.length === 0) return { error: "not_found" };

  const simple: Record<string, unknown> = {};
  if (patch.condition !== undefined) simple.condition = patch.condition;
  if (patch.location !== undefined) simple.shelf_location = patch.location?.trim().slice(0, 80) || null;
  if (patch.forTrade !== undefined) simple.for_trade = patch.forTrade;
  if (Object.keys(simple).length > 0) {
    const { error } = await supabase.from("collection_items").update(simple).in("item_group_id", ids).in("collection_id", ownIds);
    if (isMissingError(error)) return { error: "not_ready" };
    if (error) throw error;
  }

  const clean = (list?: string[]) => (list ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20);
  const add = clean(patch.addTags);
  const remove = clean(patch.removeTags).map((t) => t.toLowerCase());
  if (add.length || remove.length) {
    const byGroup = new Map<string, string[]>();
    for (const r of rows) if (!byGroup.has(r.item_group_id)) byGroup.set(r.item_group_id, r.tags ?? []);
    for (const [group, tags] of byGroup) {
      const next = [...tags.filter((t) => !remove.includes(t.toLowerCase()))];
      for (const t of add) if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
      if (next.join("\u0000") === tags.join("\u0000")) continue;
      const { error } = await supabase.from("collection_items").update({ tags: next }).eq("item_group_id", group).in("collection_id", ownIds);
      if (error) throw error;
    }
  }

  if (patch.addToCollectionId && ownIds.includes(patch.addToCollectionId)) {
    const target = patch.addToCollectionId;
    const present = new Set(rows.filter((r) => r.collection_id === target).map((r) => r.item_group_id));
    const seen = new Set<string>();
    const inserts: Record<string, unknown>[] = [];
    for (const row of rows) {
      if (present.has(row.item_group_id) || seen.has(row.item_group_id)) continue;
      seen.add(row.item_group_id);
      const copy: Record<string, unknown> = { collection_id: target };
      for (const col of COPY_COLUMNS) if (col in row) copy[col] = (row as unknown as Record<string, unknown>)[col];
      inserts.push(copy);
    }
    if (inserts.length) {
      const { error } = await supabase.from("collection_items").insert(inserts);
      if (error) throw error;
    }
  }

  let removed: CollectionItem[] | undefined;
  if (patch.removeFromCollection) {
    removed = rows.filter((r) => r.collection_id === fromCollectionId);
    const { error } = await supabase.from("collection_items").delete().in("item_group_id", ids).eq("collection_id", fromCollectionId);
    if (error) throw error;
  }

  revalidatePath("/collections", "layout");
  return { error: null, removed };
}

/** "Ongedaan maken": put removed rows back exactly as they were (same ids),
 * only into the caller's own collections. */
export async function restoreCopies(rows: CollectionItem[]): Promise<void> {
  const userId = await requireUserId();
  if (rows.length === 0) return;
  const supabase = await createClient();
  const { data: own } = await supabase.from("collections").select("id").eq("user_id", userId);
  const ownIds = new Set((own ?? []).map((c: { id: string }) => c.id));
  const safe = rows.filter((r) => ownIds.has(r.collection_id)).slice(0, BULK_MAX);
  if (safe.length === 0) return;
  const { error } = await supabase.from("collection_items").upsert(safe as unknown as Record<string, unknown>[], { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  revalidatePath("/collections", "layout");
}
