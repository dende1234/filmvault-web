"use server";

// Admin-only shelf scan (app/(app)/admin/scan-shelf): the known single-copy
// releases of the recognized titles, so a spine without a barcode can still
// be added by picking a release the master film list already has.

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import type { Barcode } from "@/types/database";

export type KnownSingleRelease = { barcode: string; type: string; editie: string };

const MAX_TITLES = 100;

export async function getKnownReleases(tmdbIds: number[]): Promise<Record<number, KnownSingleRelease[]>> {
  await requireAdmin();
  const ids = Array.from(new Set(tmdbIds)).slice(0, MAX_TITLES);
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.from("barcodes").select("*").in("tmdb_movie_id", ids).eq("is_box", false);
  if (error) throw error;

  const out: Record<number, KnownSingleRelease[]> = {};
  for (const b of data as Barcode[]) {
    (out[b.tmdb_movie_id] ??= []).push({ barcode: b.barcode, type: b.type, editie: b.editie });
  }
  return out;
}
