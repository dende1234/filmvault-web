"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { normalizeBarcode } from "@/lib/barcode";
import { detailsColumns, type CopyDetailsInput } from "@/lib/copy-details";
import { createClient } from "@/lib/supabase/server";
import { isMissingError } from "@/lib/admin/migrations";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";

const releaseSchema = z.object({
  barcode: z.string().max(100),
  type: z.string().trim().min(1).max(100),
  editie: z.string().trim().min(1).max(100),
  boxName: z.string().trim().max(200).optional(),
  details: z.object({
    cut: z.string().max(60).nullish(),
    region: z.string().max(20).nullish(),
    label: z.string().max(80).nullish(),
    audioLanguages: z.array(z.string().max(3)).max(20).nullish(),
    subtitleLanguages: z.array(z.string().max(3)).max(40).nullish(),
  }).nullish(),
  films: z.array(z.object({
    tmdb_movie_id: z.number().int().refine((id) => id !== 0),
    movie_title: z.string().trim().min(1).max(500),
    movie_poster: z.string().max(500).nullable(),
    seasons: z.array(z.number().int().min(0).max(1000)).max(200).nullish(),
  })).min(1).max(100),
});

/** Read-only capability check, also used before enabling new import paths. */
export async function ownedReleasesReady(): Promise<boolean> {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").select("catalog_status").limit(0);
  return !error;
}

/** Saves ownership and the catalogue submission in one transaction. The RPC
 * checks ownership too; RLS remains active (SECURITY INVOKER). */
export async function saveOwnedRelease(
  release: z.input<typeof releaseSchema> & { details?: CopyDetailsInput | null },
  collectionIds: string[],
): Promise<Set<string>> {
  await requireUserId();
  const input = releaseSchema.parse(release);
  const targets = z.array(z.uuid()).min(1).max(100).parse(collectionIds);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_owned_release", {
    p_release: { ...input, barcode: normalizeBarcode(input.barcode), details: detailsColumns(input.details) },
    p_collection_ids: [...new Set(targets)],
  });
  if (error) {
    if (isMissingError(error)) throw new Error(getDictionary(await getLocale()).owned_save_not_ready);
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/collections", "layout");
  revalidatePath("/admin/growth");
  return new Set((data ?? []) as string[]);
}
