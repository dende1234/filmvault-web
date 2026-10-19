import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { isSeries } from "@/lib/titles";
import type { CollectionItem } from "@/types/database";

/** CSV export of your own collections: ?collection=<id> for one, nothing for
 * all. One row per physical copy (item_group_id), with the collections it is
 * in. Same column names as the import, so the file can be imported again. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const only = new URL(request.url).searchParams.get("collection");
  let colQuery = supabase.from("collections").select("id, name").eq("user_id", user.id);
  if (only) colQuery = colQuery.eq("id", only);
  const { data: cols, error: colError } = await colQuery;
  if (colError) return new Response("Export failed", { status: 500 });
  if (only && (cols ?? []).length === 0) return new Response("Not found", { status: 404 });
  const names = new Map((cols ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const rows: CollectionItem[] = [];
  if (names.size > 0) {
    // Page through: a big collection can exceed one response.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("collection_items")
        .select("*")
        .in("collection_id", Array.from(names.keys()))
        .order("movie_title")
        .range(from, from + 999);
      if (error) return new Response("Export failed", { status: 500 });
      rows.push(...((data ?? []) as CollectionItem[]));
      if (!data || data.length < 1000) break;
    }
  }

  // One line per physical copy, listing every (exported) collection it is in.
  const copies = new Map<string, { item: CollectionItem; collections: string[] }>();
  for (const item of rows) {
    const copy = copies.get(item.item_group_id);
    const name = names.get(item.collection_id) ?? "";
    if (copy) {
      if (!copy.collections.includes(name)) copy.collections.push(name);
    } else copies.set(item.item_group_id, { item, collections: [name] });
  }

  const header = [
    "Titel", "Soort", "Seizoenen", "Barcode", "Formaat", "Editie", "Cut", "Label", "Regio", "Audio", "Ondertitels",
    "Bekeken", "Rating", "Box", "Collecties", "Notitie", "Tags", "Uitgeleend aan", "Toegevoegd op",
  ];
  const lines = Array.from(copies.values()).map(({ item, collections }) => [
    item.movie_title,
    isSeries(item.tmdb_movie_id) ? "Serie" : "Film",
    item.seasons?.length ? item.seasons.join(",") : "",
    item.barcode ?? "",
    item.type ?? "",
    item.editie ?? "",
    item.cut ?? "",
    item.label ?? "",
    item.region ?? "",
    (item.audio_languages ?? []).map((c) => c.toUpperCase()).join(", "),
    (item.subtitle_languages ?? []).map((c) => c.toUpperCase()).join(", "),
    item.watched ? "ja" : "nee",
    item.rating != null ? String(item.rating) : "",
    item.is_box ? (item.box_name ?? "") : "",
    collections.join("; "),
    item.personal_note ?? "",
    (item.tags ?? []).join(", "),
    item.loaned_to ?? "",
    item.added_at ? item.added_at.slice(0, 10) : "",
  ]);

  const label = only ? (names.get(only) ?? "collectie") : "alles";
  const slug = label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "collectie";
  // BOM so Excel opens the UTF-8 file with the right characters.
  return new Response("﻿" + toCsv([header, ...lines]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="filmory-${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
