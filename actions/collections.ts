"use server";

// Direct port of collections/CollectionRepository.kt — table names, column
// names and the item_group_id/pending-approval/box logic all match exactly.
// Only the client library changed (supabase-kt -> supabase-js).

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BarcodeAlreadyRegisteredError } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { getLocale } from "@/lib/preferences";
import { getTitleDetail } from "@/lib/tmdb/server";
import { normalizeBarcode } from "@/lib/barcode";
import { cleanLanguages, detailsColumns } from "@/lib/copy-details";
import type {
  Barcode,
  BoxFilmInput,
  Collection,
  CollectionItem,
  Condition,
  NewBarcodeInput,
  PendingBarcode,
  PendingBarcodeCollectionRow,
  PublicCollection,
} from "@/types/database";

/** `seasons` only for a series with seasons, so film writes never send the
 * column (keeps films working before series_support.sql has run). */
function seasonsField(seasons: number[] | null | undefined) {
  return seasons && seasons.length > 0 ? { seasons } : {};
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

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
  const { data, error } = await supabase.from("collection_items").select("*").eq("collection_id", collectionId);
  if (error) throw error;
  return data as CollectionItem[];
}

export async function getCollectionItemsForCollections(collectionIds: string[]): Promise<CollectionItem[]> {
  if (collectionIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("collection_items").select("*").in("collection_id", collectionIds);
  if (error) throw error;
  return data as CollectionItem[];
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
  details: { cut: string | null; label: string | null; audioLanguages: string[] | null; subtitleLanguages: string[] | null },
): Promise<{ error: "not_ready" | "invalid" | null }> {
  const cut = details.cut?.trim().slice(0, 60) || null;
  const label = details.label?.trim().slice(0, 80) || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_items")
    .update({
      cut,
      label,
      audio_languages: cleanLanguages(details.audioLanguages)?.slice(0, 20) ?? null,
      subtitle_languages: cleanLanguages(details.subtitleLanguages)?.slice(0, 40) ?? null,
    })
    .eq("item_group_id", itemGroupId);
  if (error?.code === "PGRST204") return { error: "not_ready" };
  if (error?.code === "23514") return { error: "invalid" };
  if (error) throw error;
  revalidatePath("/collections", "layout");
  return { error: null };
}

export async function removeCollectionItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").delete().eq("id", itemId);
  if (error) throw error;
  revalidatePath("/collections", "layout");
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
  "cut", "audio_languages", "subtitle_languages", "label",
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
export async function removeBoxFromCollection(collectionId: string, itemIds: string[]) {
  if (itemIds.length === 0) return;
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).in("id", itemIds);
  if (error) throw error;
  revalidatePath("/collections", "layout");
}

export async function getBarcodesForMovie(tmdbMovieId: number): Promise<Barcode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("barcodes").select("*").eq("tmdb_movie_id", tmdbMovieId);
  if (error) throw error;
  return data as Barcode[];
}

/** No DB constraint makes a barcode value globally unique — for a normal item
 * this is defensive against an accidental duplicate row, but for a box it's
 * the whole point: all films in the box share this barcode value. */
export async function findBarcodesByCode(code: string): Promise<Barcode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("barcodes").select("*").eq("barcode", code);
  if (error) throw error;
  return data as Barcode[];
}

/** Existing-barcode path: one collection_items row per (barcode x collection)
 * pair, but all rows for the same barcode share one item_group_id. Dedup is
 * per exact barcode, not per movie — a collection may hold several
 * different barcodes/editions of the same tmdb_movie_id (different
 * physical copies); it just can't hold the same barcode twice.
 *
 * Returns the subset of collectionIds where every barcode in
 * selectedBarcodes already existed there (so this call inserted nothing
 * for that collection). */
export async function addExistingBarcodesToCollections(
  selectedBarcodes: Barcode[],
  tmdbMovieId: number,
  movieTitle: string,
  moviePoster: string | null,
  collectionIds: string[],
): Promise<Set<string>> {
  if (selectedBarcodes.length === 0 || collectionIds.length === 0) return new Set();
  const supabase = await createClient();

  const alreadyContainingByBarcode = new Map<string, Set<string>>();
  for (const barcode of selectedBarcodes) {
    alreadyContainingByBarcode.set(barcode.barcode, await getCollectionIdsContainingBarcode(barcode.barcode, collectionIds));
  }

  const inserts = selectedBarcodes.flatMap((barcode) => {
    const alreadyContaining = alreadyContainingByBarcode.get(barcode.barcode)!;
    const targetCollectionIds = collectionIds.filter((id) => !alreadyContaining.has(id));
    if (targetCollectionIds.length === 0) return [];
    const itemGroupId = randomUUID();
    return targetCollectionIds.map((collectionId) => ({
      collection_id: collectionId,
      item_group_id: itemGroupId,
      tmdb_movie_id: tmdbMovieId,
      movie_title: movieTitle,
      movie_poster: moviePoster,
      barcode: barcode.barcode,
      type: barcode.type,
      editie: barcode.editie,
      ...seasonsField(barcode.seasons),
    }));
  });
  if (inserts.length > 0) {
    const { error } = await supabase.from("collection_items").insert(inserts);
    if (error) throw error;
  }
  revalidatePath("/collections", "layout");

  return new Set(
    collectionIds.filter((collectionId) =>
      selectedBarcodes.every((b) => alreadyContainingByBarcode.get(b.barcode)!.has(collectionId)),
    ),
  );
}

/** Known-box path: films already approved (found via findBarcodesByCode) go
 * straight into collection_items, one row per (film x collection), each film
 * with its own item_group_id but sharing the box's box_group_id/box_name. A
 * collection is skipped entirely if it already contains ANY film from this box. */
export async function addKnownBoxToCollections(
  films: BoxFilmInput[],
  boxGroupId: string,
  boxName: string | null,
  barcode: string,
  type: string,
  editie: string,
  collectionIds: string[],
): Promise<Set<string>> {
  const supabase = await createClient();
  const alreadyContainingLists = await Promise.all(
    films.map((f) => getCollectionIdsContainingMovie(f.tmdb_movie_id, collectionIds)),
  );
  const alreadyContaining = new Set(alreadyContainingLists.flatMap((s) => Array.from(s)));
  const eligibleCollectionIds = collectionIds.filter((id) => !alreadyContaining.has(id));

  if (eligibleCollectionIds.length > 0) {
    const inserts = films.flatMap((film) => {
      const itemGroupId = randomUUID();
      return eligibleCollectionIds.map((collectionId) => ({
        collection_id: collectionId,
        item_group_id: itemGroupId,
        tmdb_movie_id: film.tmdb_movie_id,
        movie_title: film.movie_title,
        movie_poster: film.movie_poster,
        barcode,
        type,
        editie,
        is_box: true,
        box_group_id: boxGroupId,
        box_name: boxName,
      }));
    });
    const { error } = await supabase.from("collection_items").insert(inserts);
    if (error) throw error;
  }
  revalidatePath("/collections", "layout");
  return alreadyContaining;
}

async function insertPendingBarcodeCollectionLinks(supabase: Awaited<ReturnType<typeof createClient>>, pendingBarcodeId: string, collectionIds: string[]) {
  const { error } = await supabase
    .from("pending_barcode_collections")
    .insert(collectionIds.map((collectionId) => ({ pending_barcode_id: pendingBarcodeId, collection_id: collectionId })));
  if (error) throw error;
}

/** New-box path: submitting a box whose barcode isn't known yet goes through
 * admin approval — one pending_barcodes row per film, all sharing a fresh
 * box_group_id/box_name, same barcode. */
export async function addNewBoxAsPending(
  films: BoxFilmInput[],
  boxName: string,
  barcode: string,
  type: string,
  editie: string,
  collectionIds: string[],
) {
  if (collectionIds.length === 0 || films.length === 0) return;
  const supabase = await createClient();
  const submittedBy = await requireUserId();
  const boxGroupId = randomUUID();

  for (const film of films) {
    const { data: inserted, error } = await supabase
      .from("pending_barcodes")
      .insert({
        tmdb_movie_id: film.tmdb_movie_id,
        movie_title: film.movie_title,
        movie_poster: film.movie_poster,
        barcode,
        type,
        editie,
        submitted_by: submittedBy,
        collection_id: collectionIds[0],
        is_box: true,
        box_group_id: boxGroupId,
        box_name: boxName,
      })
      .select("*")
      .single();
    if (error) throw error;
    await insertPendingBarcodeCollectionLinks(supabase, (inserted as PendingBarcode).id, collectionIds);
  }
  revalidatePath("/collections", "layout");
}

/** New-barcode path: one pending_barcodes row per staged barcode — collection_id
 * keeps the first-selected collection for backward compatibility, the full
 * target list is recorded in pending_barcode_collections. */
export async function addNewBarcodesAsPending(
  newBarcodes: NewBarcodeInput[],
  tmdbMovieId: number,
  movieTitle: string,
  moviePoster: string | null,
  collectionIds: string[],
) {
  if (collectionIds.length === 0) return;
  const supabase = await createClient();
  const submittedBy = await requireUserId();

  for (const staged of newBarcodes) {
    const row: Record<string, unknown> = {
      tmdb_movie_id: tmdbMovieId,
      movie_title: movieTitle,
      movie_poster: moviePoster,
      barcode: staged.barcode,
      type: staged.type,
      editie: staged.editie,
      ...seasonsField(staged.seasons),
      submitted_by: submittedBy,
      collection_id: collectionIds[0],
    };
    const details = detailsColumns(staged.details);
    let { data: inserted, error } = await supabase.from("pending_barcodes").insert({ ...row, ...details }).select("*").single();
    // PGRST204 = copy_details.sql not run yet: submit without the details.
    if (error?.code === "PGRST204" && Object.keys(details).length > 0) {
      ({ data: inserted, error } = await supabase.from("pending_barcodes").insert(row).select("*").single());
    }
    if (error) throw error;
    await insertPendingBarcodeCollectionLinks(supabase, (inserted as PendingBarcode).id, collectionIds);
  }
  revalidatePath("/collections", "layout");
}

/**
 * Re-checks staged "new" barcodes against the live barcodes table (another
 * user may have registered the same barcode meanwhile) before deciding which
 * path each one takes. Returns the subset of collectionIds where the ENTIRE
 * submitted batch resulted in nothing new — only possible when every staged
 * barcode resolved to an already-known one; genuinely-new barcodes have no
 * dedup gate, since a fresh admin-approval submission always does something
 * for every target collection.
 */
export async function addBarcodesToCollections(
  selectedExistingBarcodes: Barcode[],
  stagedNewBarcodes: NewBarcodeInput[],
  tmdbMovieId: number,
  movieTitle: string,
  moviePoster: string | null,
  collectionIds: string[],
): Promise<Set<string>> {
  const currentBarcodes = stagedNewBarcodes.length === 0 ? [] : await getBarcodesForMovie(tmdbMovieId);
  const alreadyKnown: Barcode[] = [];
  const genuinelyNew: NewBarcodeInput[] = [];
  for (const staged of stagedNewBarcodes) {
    const match = currentBarcodes.find((b) => b.barcode.toLowerCase() === staged.barcode.toLowerCase());
    if (match) alreadyKnown.push(match);
    else genuinelyNew.push(staged);
  }

  const allExisting = [...selectedExistingBarcodes, ...alreadyKnown];
  const nothingAddedFor =
    allExisting.length > 0
      ? await addExistingBarcodesToCollections(allExisting, tmdbMovieId, movieTitle, moviePoster, collectionIds)
      : new Set<string>();

  if (genuinelyNew.length > 0) {
    await addNewBarcodesAsPending(genuinelyNew, tmdbMovieId, movieTitle, moviePoster, collectionIds);
    return new Set();
  }

  return nothingAddedFor;
}

export async function getPendingBarcodes(): Promise<PendingBarcode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pending_barcodes").select("*").eq("status", "pending");
  if (error) throw error;
  return data as PendingBarcode[];
}

export async function getCollectionsByIds(collectionIds: string[]): Promise<Collection[]> {
  if (collectionIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("*").in("id", collectionIds);
  if (error) throw error;
  return data as Collection[];
}

export async function getPendingBarcodeCollectionLinks(pendingBarcodeIds: string[]): Promise<PendingBarcodeCollectionRow[]> {
  if (pendingBarcodeIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_barcode_collections")
    .select("*")
    .in("pending_barcode_id", pendingBarcodeIds);
  if (error) throw error;
  return data as PendingBarcodeCollectionRow[];
}

/** Admin-only shortcut: registers a barcode straight into the master
 * `barcodes` list — skips pending-approval entirely AND does not add it to
 * any collection. Deliberately separate from addBarcodesToCollections/
 * addNewBarcodesAsPending, which stay unchanged for the normal
 * add-to-collection flow. */
export async function adminRegisterBarcode(
  tmdbMovieId: number,
  barcode: string,
  type: string,
  editie: string,
  seasons?: number[] | null,
): Promise<string> {
  await requireAdmin();
  const existing = await findBarcodesByCode(barcode);
  if (existing.length > 0) throw new BarcodeAlreadyRegisteredError(existing[0].tmdb_movie_id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barcodes")
    .insert({ tmdb_movie_id: tmdbMovieId, barcode, type, editie, ...seasonsField(tmdbMovieId < 0 ? seasons : null) })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique_violation (barcodes_unique.sql): another insert won the
    // race between the findBarcodesByCode check above and this insert.
    if (error.code === "23505") {
      const winner = await findBarcodesByCode(barcode);
      throw new BarcodeAlreadyRegisteredError(winner[0]?.tmdb_movie_id ?? tmdbMovieId);
    }
    throw error;
  }
  return data.id as string;
}

/** Admin-only: corrects an existing master film-list entry (e.g. a wrongly
 * registered type/editie), or removes it entirely. Relies on the
 * admin-only barcodes UPDATE/DELETE RLS policies in admin_tools.sql. */
export async function updateBarcodeDetails(barcodeId: string, type: string, editie: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("barcodes").update({ type, editie }).eq("id", barcodeId);
  if (error) throw error;
}

export async function deleteBarcode(barcodeId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("barcodes").delete().eq("id", barcodeId);
  if (error) throw error;
}

async function getPendingBarcodeById(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<PendingBarcode> {
  const { data, error } = await supabase.from("pending_barcodes").select("*").eq("id", id).eq("status", "pending").single();
  if (error) throw error;
  return data as PendingBarcode;
}

async function barcodeAlreadyExists(supabase: Awaited<ReturnType<typeof createClient>>, tmdbMovieId: number, barcode: string) {
  const { data } = await supabase.from("barcodes").select("id").eq("tmdb_movie_id", tmdbMovieId).eq("barcode", barcode);
  return (data ?? []).length > 0;
}

/**
 * Sequential, not atomic — acceptable tradeoff for this iteration (no
 * Postgres RPC). Guards against duplicating a barcode that another
 * (near-simultaneous) approval already registered for this film.
 */
export async function approvePendingBarcode(pendingFromClient: PendingBarcode): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  // Only the id is trusted from the client — the row's contents are re-read.
  const pending = await getPendingBarcodeById(supabase, pendingFromClient.id);
  const { error: statusError } = await supabase
    .from("pending_barcodes")
    .update({ status: "approved" })
    .eq("id", pending.id);
  if (statusError) throw statusError;

  if (!(await barcodeAlreadyExists(supabase, pending.tmdb_movie_id, pending.barcode))) {
    const { error } = await supabase.from("barcodes").insert({
      tmdb_movie_id: pending.tmdb_movie_id,
      barcode: pending.barcode,
      type: pending.type ?? "DVD",
      editie: pending.editie ?? "Normaal",
      ...seasonsField(pending.seasons),
    });
    if (error) throw error;
  }

  const links = await getPendingBarcodeCollectionLinks([pending.id]);
  const targetCollectionIds = links.length > 0 ? links.map((l) => l.collection_id) : [pending.collection_id];
  const alreadyContaining = await getCollectionIdsContainingBarcode(pending.barcode, targetCollectionIds);
  const eligibleCollectionIds = targetCollectionIds.filter((id) => !alreadyContaining.has(id));

  if (eligibleCollectionIds.length > 0) {
    const itemGroupId = randomUUID();
    const { error } = await supabase.from("collection_items").insert(
      eligibleCollectionIds.map((collectionId) => ({
        collection_id: collectionId,
        item_group_id: itemGroupId,
        tmdb_movie_id: pending.tmdb_movie_id,
        movie_title: pending.movie_title,
        movie_poster: pending.movie_poster,
        barcode: pending.barcode,
        type: pending.type ?? "DVD",
        editie: pending.editie ?? "Normaal",
        ...seasonsField(pending.seasons),
        // Details submitted with the barcode (e.g. from a CSV import).
        ...detailsColumns({
          cut: pending.cut,
          label: pending.label,
          audioLanguages: pending.audio_languages,
          subtitleLanguages: pending.subtitle_languages,
        }),
      })),
    );
    if (error) throw error;
  }
  revalidatePath("/admin/pending-barcodes");
  revalidatePath("/admin/add-film");
}

export async function rejectPendingBarcode(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("pending_barcodes").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pending-barcodes");
  revalidatePath("/admin/add-film");
}

/** Box variant of approvePendingBarcode — pendingRows must all share the
 * same box_group_id (one film per row). Approves every row, upserts each
 * film into barcodes (tagged with the shared box_group_id/box_name), then
 * inserts one collection_items row per (film x eligible collection); a
 * collection is skipped if it already contains ANY film from this box.
 * Sequential, not atomic — same tradeoff as approvePendingBarcode. */
export async function approvePendingBox(pendingRowsFromClient: PendingBarcode[]): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  // Only the ids are trusted from the client — the rows' contents are re-read.
  const pendingRows = await Promise.all(pendingRowsFromClient.map((row) => getPendingBarcodeById(supabase, row.id)));
  const first = pendingRows[0];
  const boxGroupId = first.box_group_id;
  if (!boxGroupId) throw new Error("approvePendingBox requires rows with a box_group_id");
  const boxName = first.box_name;

  for (const row of pendingRows) {
    const { error } = await supabase.from("pending_barcodes").update({ status: "approved" }).eq("id", row.id);
    if (error) throw error;
  }

  for (const row of pendingRows) {
    if (!(await barcodeAlreadyExists(supabase, row.tmdb_movie_id, row.barcode))) {
      const { error } = await supabase.from("barcodes").insert({
        tmdb_movie_id: row.tmdb_movie_id,
        barcode: row.barcode,
        type: row.type ?? "DVD",
        editie: row.editie ?? "Normaal",
        is_box: true,
        box_group_id: boxGroupId,
        box_name: boxName,
      });
      if (error) throw error;
    }
  }

  const links = await getPendingBarcodeCollectionLinks([first.id]);
  const targetCollectionIds = links.length > 0 ? links.map((l) => l.collection_id) : [first.collection_id];
  const alreadyContainingLists = await Promise.all(
    pendingRows.map((row) => getCollectionIdsContainingMovie(row.tmdb_movie_id, targetCollectionIds)),
  );
  const alreadyContaining = new Set(alreadyContainingLists.flatMap((s) => Array.from(s)));
  const eligibleCollectionIds = targetCollectionIds.filter((id) => !alreadyContaining.has(id));

  if (eligibleCollectionIds.length > 0) {
    const inserts = pendingRows.flatMap((row) => {
      const itemGroupId = randomUUID();
      return eligibleCollectionIds.map((collectionId) => ({
        collection_id: collectionId,
        item_group_id: itemGroupId,
        tmdb_movie_id: row.tmdb_movie_id,
        movie_title: row.movie_title,
        movie_poster: row.movie_poster,
        barcode: row.barcode,
        type: row.type ?? "DVD",
        editie: row.editie ?? "Normaal",
        is_box: true,
        box_group_id: boxGroupId,
        box_name: boxName,
      }));
    });
    const { error } = await supabase.from("collection_items").insert(inserts);
    if (error) throw error;
  }
  revalidatePath("/admin/pending-barcodes");
  revalidatePath("/admin/add-film");
}

/** One physical copy you own (all collections it is in), for the scan result. */
export type OwnedCopy = {
  itemId: string;
  collectionId: string;
  collections: string[];
  type: string;
  editie: string;
  cut: string | null;
  label: string | null;
};

export type ScannedBarcodeResult =
  | { kind: "none"; barcode: string }
  | {
      kind: "title";
      barcode: string;
      title: { id: number; title: string; poster: string | null };
      /** The scanned release as registered on the master list. */
      release: { type: string; editie: string };
      /** Copies of exactly this release (same barcode) you already own. */
      owned: OwnedCopy[];
      /** Copies of the same film/series in another release (other barcode). */
      otherEditions: OwnedCopy[];
    }
  | {
      kind: "box";
      barcode: string;
      boxGroupId: string | null;
      boxName: string | null;
      type: string;
      editie: string;
      films: { tmdb_movie_id: number; movie_title: string; movie_poster: string | null }[];
      /** This box, if you already own it. */
      owned: OwnedCopy[];
    };

/** Your copies matching a scan: rows with this barcode, this box, or (for
 * other editions) these titles — one entry per physical copy. */
type OwnedRow = { row: CollectionItem; collectionName: string };

async function ownedCopies(match: { barcode?: string; boxGroupId?: string | null; tmdbIds?: number[] }): Promise<OwnedRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: cols } = await supabase.from("collections").select("id, name").eq("user_id", user.id);
  const names = new Map((cols ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  if (names.size === 0) return [];
  let query = supabase.from("collection_items").select("*").in("collection_id", Array.from(names.keys()));
  if (match.boxGroupId) query = query.eq("box_group_id", match.boxGroupId);
  else if (match.tmdbIds?.length) query = query.in("tmdb_movie_id", match.tmdbIds);
  else if (match.barcode) query = query.eq("barcode", match.barcode);
  const { data } = await query;
  return ((data ?? []) as CollectionItem[]).map((row) => ({ row, collectionName: names.get(row.collection_id) ?? "" }));
}

function toOwnedCopies(rows: OwnedRow[]): OwnedCopy[] {
  const byGroup = new Map<string, OwnedCopy>();
  for (const { row, collectionName } of rows) {
    const key = row.box_group_id ?? row.item_group_id;
    const existing = byGroup.get(key);
    if (existing) {
      if (!existing.collections.includes(collectionName)) existing.collections.push(collectionName);
      continue;
    }
    byGroup.set(key, {
      itemId: row.id,
      collectionId: row.collection_id,
      collections: [collectionName],
      type: row.type,
      editie: row.editie,
      cut: row.cut ?? null,
      label: row.label ?? null,
    });
  }
  return Array.from(byGroup.values());
}

/** What a scanned barcode is on the master film list: one film/series,
 * a box, or unknown (then the user picks the title and it goes to approval). */
export async function lookupScannedBarcode(raw: string): Promise<ScannedBarcodeResult> {
  await requireUserId();
  const barcode = normalizeBarcode(raw);
  const known = barcode ? await findBarcodesByCode(barcode) : [];
  if (known.length === 0) return { kind: "none", barcode };
  if (known.some((b) => b.is_box) || new Set(known.map((b) => b.tmdb_movie_id)).size > 1) {
    // The barcodes table has no titles: resolve each film once via TMDB.
    const locale = await getLocale();
    const ids = Array.from(new Set(known.map((b) => b.tmdb_movie_id)));
    const films = await Promise.all(
      ids.map(async (id) => {
        const detail = await getTitleDetail(id, locale).catch(() => null);
        return { tmdb_movie_id: id, movie_title: detail?.title ?? `TMDB #${id}`, movie_poster: detail?.poster_path ?? null };
      }),
    );
    const first = known.find((b) => b.box_group_id) ?? known[0];
    const ownedRows = first.box_group_id ? await ownedCopies({ boxGroupId: first.box_group_id }) : [];
    return {
      owned: toOwnedCopies(ownedRows),
      kind: "box",
      barcode,
      boxGroupId: first.box_group_id,
      boxName: first.box_name,
      type: first.type,
      editie: first.editie,
      films,
    };
  }
  const [detail, rows] = await Promise.all([
    getTitleDetail(known[0].tmdb_movie_id, await getLocale()).catch(() => null),
    ownedCopies({ tmdbIds: [known[0].tmdb_movie_id] }),
  ]);
  const same = rows.filter((r) => r.row.barcode.toLowerCase() === barcode.toLowerCase());
  const other = rows.filter((r) => r.row.barcode.toLowerCase() !== barcode.toLowerCase());
  return {
    kind: "title",
    barcode,
    title: { id: known[0].tmdb_movie_id, title: detail?.title ?? `TMDB #${known[0].tmdb_movie_id}`, poster: detail?.poster_path ?? null },
    release: { type: known[0].type, editie: known[0].editie },
    owned: toOwnedCopies(same),
    otherEditions: toOwnedCopies(other),
  };
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
