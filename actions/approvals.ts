"use server";

// Admin: the approval queue (pending_barcodes) and the master barcode list.
// Every export checks requireAdmin(). Split out of ./collections.ts.

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BarcodeAlreadyRegisteredError } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { isMissingError } from "@/lib/admin/migrations";
import { detailsColumns } from "@/lib/copy-details";
import { seasonsField } from "@/lib/seasons";
import { getCollectionIdsContainingBarcode, getCollectionIdsContainingMovie } from "@/actions/collections";
import { findBarcodesByCode } from "@/actions/barcodes";
import type { PendingBarcode, PendingBarcodeCollectionRow } from "@/types/database";

export async function getPendingBarcodes(status: "pending" | "rejected" = "pending"): Promise<PendingBarcode[]> {
  const supabase = await createClient();
  let query = supabase.from("pending_barcodes").select("*").eq("status", status);
  // Rejected: the most recent ones, to restore a mistake.
  if (status === "rejected") query = query.order("submitted_at", { ascending: false }).limit(300);
  const { data, error } = await query;
  if (error) throw error;
  return data as PendingBarcode[];
}

/** Admin: puts rejected submissions back in the queue (e.g. rejected by
 * mistake). They can then be approved as usual; the submitter is notified
 * again by the trigger in approval_notifications.sql. */
export async function restoreRejectedBarcodes(ids: string[]): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("pending_barcodes").update({ status: "pending" }).in("id", ids).eq("status", "rejected");
  if (error) throw error;
  revalidatePath("/admin/pending-barcodes");
  revalidatePath("/admin/add-film");
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

function afterApproval() {
  revalidatePath("/admin/pending-barcodes");
  revalidatePath("/admin/add-film");
}

// The submitter's "approved / rejected" notification is made by the database
// (trigger in approval_notifications.sql), so a review from any client,
// the Android app included, notifies once.

/** Approves in one transaction via approve_pending_barcode()
 * (supabase/sql/approve_pending.sql). Until that has run: the old step-by-
 * step version below, which guards against duplicating a barcode that a
 * near-simultaneous approval already registered for this film. */
export async function approvePendingBarcode(pendingFromClient: PendingBarcode): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc("approve_pending_barcode", { p_id: pendingFromClient.id });
  if (!rpcError) return afterApproval();
  if (!isMissingError(rpcError)) throw rpcError;

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
          region: pending.region,
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
  await getPendingBarcodeById(supabase, id); // must still be pending
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
 * One transaction via approve_pending_box(); same fallback as above. */
export async function approvePendingBox(pendingRowsFromClient: PendingBarcode[]): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc("approve_pending_box", { p_ids: pendingRowsFromClient.map((r) => r.id) });
  if (!rpcError) return afterApproval();
  if (!isMissingError(rpcError)) throw rpcError;

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
