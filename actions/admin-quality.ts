"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { analyzeBarcodes, type BarcodeRow, type QualityReport } from "@/lib/admin/quality";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/log";
import { isMissingError } from "@/lib/admin/migrations";
import { getTitleDetail } from "@/lib/tmdb/server";
import { getLocale } from "@/lib/preferences";

export type TitleWithoutBarcode = { tmdb_movie_id: number; movie_title: string; movie_poster: string | null; owners: number; copies: number };

/** /admin/quality: checks on the master film list, plus (with
 * admin_quality.sql) popular titles that have no barcode yet. */
export async function getQualityReport(): Promise<QualityReport & { total: number; withoutBarcode: TitleWithoutBarcode[] | null }> {
  await requireAdmin();
  const supabase = await createClient();
  const [rows, mediaTypes, edities, missing] = await Promise.all([
    fetchAll<BarcodeRow>((from, to) => supabase.from("barcodes").select("id, barcode, tmdb_movie_id, type, editie, is_box").order("id").range(from, to)),
    getMediaTypes().catch(() => []),
    getEdities().catch(() => []),
    supabase.rpc("admin_titles_without_barcode", { p_limit: 50 }),
  ]);
  return {
    ...analyzeBarcodes(rows, mediaTypes, edities),
    total: rows.length,
    withoutBarcode: missing.error ? null : ((missing.data ?? []) as TitleWithoutBarcode[]).map((r) => ({ ...r, tmdb_movie_id: Number(r.tmdb_movie_id), owners: Number(r.owners), copies: Number(r.copies) })),
  };
}

/** Moves a barcode to the right title; members' copies with it move along
 * (admin_move_barcode in admin_move_barcode.sql). Returns copies moved. */
export async function adminMoveBarcode(barcodeId: string, toTitleId: number): Promise<{ moved: number } | { error: "not_ready" }> {
  await requireAdmin();
  const supabase = await createClient();
  const detail = await getTitleDetail(toTitleId, await getLocale()).catch(() => null);
  const { data, error } = await supabase.rpc("admin_move_barcode", {
    p_barcode_id: barcodeId,
    p_to_tmdb_id: toTitleId,
    p_title: detail?.title ?? null,
    p_poster: detail?.poster_path ?? null,
  });
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  const moved = typeof data === "number" ? data : 0;
  await logAdminAction("barcode_move", { type: "barcode", id: barcodeId }, { toTitleId, title: detail?.title, moved });
  revalidatePath("/admin/quality");
  return { moved };
}
