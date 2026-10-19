import { getOwnCopies } from "@/lib/collection-copies";
import { toCsv } from "@/lib/csv";
import { isSeries } from "@/lib/titles";

/** CSV export of your own collections: ?collection=<id> for one, nothing for
 * all. One row per physical copy (item_group_id), with the collections it is
 * in. Same column names as the import, so the file can be imported again. */
export async function GET(request: Request) {
  const only = new URL(request.url).searchParams.get("collection");
  let result: Awaited<ReturnType<typeof getOwnCopies>>;
  try {
    result = await getOwnCopies(only);
  } catch {
    return new Response("Export failed", { status: 500 });
  }
  if (result === null) return new Response("Unauthorized", { status: 401 });
  if (result === "not_found") return new Response("Not found", { status: 404 });
  const { copies, names } = result;

  const header = [
    "Titel", "Soort", "Seizoenen", "Barcode", "Formaat", "Editie", "Cut", "Label", "Regio", "Audio", "Ondertitels",
    "Bekeken", "Rating", "Box", "Collecties", "Notitie", "Tags", "Uitgeleend aan", "Toegevoegd op",
  ];
  const lines = copies.map(({ item, collections }) => [
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
