"use server";

// Direct port of lists/CuratedListRepository.kt — same tables, same
// "public content, owner-only writes" RLS pattern (curated_lists.sql).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import type { CuratedList, CuratedListItem, CuratedListUiItem } from "@/types/database";

export async function getList(listId: string): Promise<CuratedList | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("curated_lists").select("*").eq("id", listId).maybeSingle();
  return data as CuratedList | null;
}

export async function getListItems(listId: string): Promise<CuratedListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("curated_list_items").select("*").eq("list_id", listId);
  if (error) throw error;
  return data as CuratedListItem[];
}

export async function createList(name: string, description: string | null): Promise<CuratedList> {
  const supabase = await createClient();
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("curated_lists")
    .insert({ owner_id: ownerId, name, description })
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/lists");
  return data as CuratedList;
}

export async function deleteList(listId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("curated_lists").delete().eq("id", listId);
  if (error) throw error;
  revalidatePath("/lists");
}

export async function getSubscribedListIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("curated_list_subscriptions").select("list_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data as { list_id: string }[]).map((r) => r.list_id));
}

export async function subscribe(listId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("curated_list_subscriptions").insert({ list_id: listId, user_id: userId });
  if (error) throw error;
  revalidatePath("/lists");
}

export async function unsubscribe(listId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from("curated_list_subscriptions")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/lists");
}

export async function addItemToList(
  listId: string,
  tmdbMovieId: number,
  movieTitle: string,
  moviePoster: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("curated_list_items")
    .insert({ list_id: listId, tmdb_movie_id: tmdbMovieId, movie_title: movieTitle, movie_poster: moviePoster });
  if (error) throw error;
  revalidatePath(`/lists/${listId}`);
}

export async function removeItemFromList(itemId: string, listId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("curated_list_items").delete().eq("id", itemId);
  if (error) throw error;
  revalidatePath(`/lists/${listId}`);
}

/** Every tmdb_movie_id the user owns across ALL their collections, deduplicated
 * — a curated list is matched purely against "does the user own this film
 * anywhere", not scoped to one collection or barcode. */
export async function getOwnedTmdbMovieIds(): Promise<Set<number>> {
  const collections = await getUserCollections();
  const items = await getCollectionItemsForCollections(collections.map((c) => c.id));
  return new Set(items.map((i) => i.tmdb_movie_id));
}

export async function getAllListsWithMeta(): Promise<CuratedListUiItem[]> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: lists, error } = await supabase.from("curated_lists").select("*");
  if (error) throw error;

  const [subscribedIds, ownedTmdbIds] = await Promise.all([getSubscribedListIds(), getOwnedTmdbMovieIds()]);

  const items = await Promise.all(
    (lists as CuratedList[]).map(async (list) => {
      const listItems = await getListItems(list.id);
      return {
        list,
        previewPosters: listItems.slice(0, 4).map((i) => ({ path: i.movie_poster, title: i.movie_title })),
        totalCount: listItems.length,
        ownedCount: listItems.filter((i) => ownedTmdbIds.has(i.tmdb_movie_id)).length,
        isMine: list.owner_id === userId,
        isSubscribed: subscribedIds.has(list.id),
      };
    }),
  );

  return items.sort((a, b) => (b.list.created_at ?? "").localeCompare(a.list.created_at ?? ""));
}
