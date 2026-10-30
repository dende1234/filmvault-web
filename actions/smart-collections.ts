"use server";

// Smart collections (smart_collections.sql): saved filters over all your
// copies. Only the filter is stored; matching happens in lib/smart-filter.ts.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { isMissingError } from "@/lib/admin/migrations";
import { applySmart, cleanSmartFilter, type SmartFilter } from "@/lib/smart-filter";
import { getMyStatsRows } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";

export type SmartCollection = { id: string; name: string; filter: SmartFilter; created_at: string };

/** null = smart_collections.sql hasn't run. */
export async function getSmartCollections(): Promise<SmartCollection[] | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from("smart_collections").select("id, name, filter, created_at").eq("user_id", userId).order("name");
  if (isMissingError(error)) return null;
  if (error) throw error;
  return (data ?? []) as SmartCollection[];
}

export async function saveSmartCollection(input: { id?: string | null; name: string; filter: SmartFilter }): Promise<{ error: "not_ready" | "invalid" | null; id?: string }> {
  await requireUserId();
  const name = input.name.trim().slice(0, 80);
  const filter = cleanSmartFilter(input.filter);
  if (!name || Object.keys(filter).length === 0) return { error: "invalid" };
  const supabase = await createClient();
  const { data, error } = input.id
    ? await supabase.from("smart_collections").update({ name, filter }).eq("id", input.id).select("id").single()
    : await supabase.from("smart_collections").insert({ name, filter }).select("id").single();
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  revalidatePath("/collections");
  return { error: null, id: (data as { id: string }).id };
}

export async function deleteSmartCollection(id: string): Promise<void> {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("smart_collections").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/collections");
}

/** One smart collection with its copies (each copy once, by title). */
export async function getSmartCollection(id: string): Promise<{ collection: SmartCollection; items: CollectionItem[] } | null> {
  const userId = await requireUserId();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("smart_collections").select("id, name, filter, created_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  const collection = data as SmartCollection;
  const rows = (await getMyStatsRows()) as unknown as CollectionItem[];
  const items = applySmart(rows, cleanSmartFilter(collection.filter)).sort((a, b) => a.movie_title.localeCompare(b.movie_title, "nl"));
  return { collection, items };
}
