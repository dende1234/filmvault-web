"use server";

// Barcodes from the user's side: the master list (barcodes), adding known
// releases to collections, submitting unknown ones for approval, and what a
// scanned barcode means for you. Split out of ./collections.ts.

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getTitleDetail } from "@/lib/tmdb/server";
import { normalizeBarcode } from "@/lib/barcode";
import { detailsColumns } from "@/lib/copy-details";
import { seasonsField } from "@/lib/seasons";
import { getCollectionIdsContainingBarcode, getCollectionIdsContainingMovie } from "@/actions/collections";
import { getPendingBarcodeCollectionLinks } from "@/actions/approvals";
import type { Barcode, BoxFilmInput, CollectionItem, NewBarcodeInput, PendingBarcode } from "@/types/database";

/** Your copies of a title (all releases), e.g. to warn on the film page
 * that you already own it before adding another copy. */
export async function getOwnedCopiesOfTitle(tmdbMovieId: number): Promise<OwnedCopy[]> {
  return toOwnedCopies(await ownedCopies({ tmdbIds: [tmdbMovieId] }));
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
/** Like insertPendingBarcodeCollectionLinks, but skips links that already exist
 * (a re-submission of something still waiting). */
async function addMissingPendingLinks(supabase: Awaited<ReturnType<typeof createClient>>, pendingBarcodeId: string, collectionIds: string[]) {
  const existing = new Set((await getPendingBarcodeCollectionLinks([pendingBarcodeId])).map((l) => l.collection_id));
  const missing = collectionIds.filter((id) => !existing.has(id));
  if (missing.length > 0) await insertPendingBarcodeCollectionLinks(supabase, pendingBarcodeId, missing);
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
  // Already waiting as a box from you: just make sure it targets these collections too.
  const waiting = (await ownPendingWithBarcode(supabase, submittedBy, barcode)).filter((p) => p.is_box);
  if (waiting.length > 0) {
    for (const p of waiting) await addMissingPendingLinks(supabase, p.id, collectionIds);
    revalidatePath("/collections", "layout");
    return;
  }
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
    const waiting = (await ownPendingWithBarcode(supabase, submittedBy, staged.barcode)).find((p) => p.tmdb_movie_id === tmdbMovieId && !p.is_box);
    if (waiting) {
      await addMissingPendingLinks(supabase, waiting.id, collectionIds);
      continue;
    }
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
/** Your own submissions of this barcode that are still waiting: submitting it
 * again (e.g. because nothing seemed to happen) shouldn't queue it twice. */
async function ownPendingWithBarcode(supabase: Awaited<ReturnType<typeof createClient>>, submittedBy: string, barcode: string) {
  const { data } = await supabase
    .from("pending_barcodes")
    .select("id, tmdb_movie_id, is_box")
    .eq("submitted_by", submittedBy)
    .eq("barcode", barcode)
    .eq("status", "pending");
  return (data ?? []) as { id: string; tmdb_movie_id: number; is_box: boolean }[];
}
/** One physical copy you own (all collections it is in), for the scan result. */
export type OwnedCopy = {
  itemId: string;
  collectionId: string;
  collections: string[];
  collectionIds: string[];
  type: string;
  editie: string;
  cut: string | null;
  label: string | null;
  region: string | null;
};
export type ScannedBarcodeResult =
  | { kind: "none"; barcode: string }
  | {
      kind: "title";
      barcode: string;
      title: { id: number; title: string; poster: string | null };
      /** The scanned release as registered on the master list. */
      release: { type: string; editie: string };
      /** That master-list row, to add this release straight to collections. */
      barcodeRow: Barcode;
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
      if (!existing.collectionIds.includes(row.collection_id)) {
        existing.collectionIds.push(row.collection_id);
        existing.collections.push(collectionName);
      }
      continue;
    }
    byGroup.set(key, {
      itemId: row.id,
      collectionId: row.collection_id,
      collections: [collectionName],
      collectionIds: [row.collection_id],
      type: row.type,
      editie: row.editie,
      cut: row.cut ?? null,
      label: row.label ?? null,
      region: row.region ?? null,
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
    barcodeRow: known[0],
    owned: toOwnedCopies(same),
    otherEditions: toOwnedCopies(other),
  };
}
