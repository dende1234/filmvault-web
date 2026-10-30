import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CollectionItem } from "@/types/database";
import { fetchAll } from "@/lib/supabase/fetch-all";

export type OwnCopy = { item: CollectionItem; collections: string[]; collectionIds: string[] };

/** Your own copies, for export and print: `only` = one collection id, else all.
 * One entry per physical copy (item_group_id) with every (selected) collection
 * it is in. null = not signed in; "not_found" = that collection isn't yours. */
export async function getOwnCopies(only?: string | null): Promise<
  | { copies: OwnCopy[]; names: Map<string, string>; userId: string }
  | null
  | "not_found"
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let colQuery = supabase.from("collections").select("id, name").eq("user_id", user.id).order("name");
  if (only) colQuery = colQuery.eq("id", only);
  const { data: cols, error: colError } = await colQuery;
  if (colError) throw colError;
  if (only && (cols ?? []).length === 0) return "not_found";
  const names = new Map((cols ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const rows =
    names.size > 0
      ? await fetchAll<CollectionItem>((from, to) =>
          supabase
            .from("collection_items")
            .select("*")
            .in("collection_id", Array.from(names.keys()))
            .order("movie_title")
            .order("id")
            .range(from, to),
        )
      : [];

  const copies = new Map<string, OwnCopy>();
  for (const item of rows) {
    const copy = copies.get(item.item_group_id);
    const name = names.get(item.collection_id) ?? "";
    if (copy) {
      if (!copy.collectionIds.includes(item.collection_id)) {
        copy.collectionIds.push(item.collection_id);
        copy.collections.push(name);
      }
    } else copies.set(item.item_group_id, { item, collections: [name], collectionIds: [item.collection_id] });
  }
  return { copies: Array.from(copies.values()), names, userId: user.id };
}
