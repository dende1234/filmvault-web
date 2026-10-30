import { matchesFormat } from "@/lib/formats";
import type { CollectionItem } from "@/types/database";

/** A smart collection's filter (smart_collections.sql). Every set field
 * must match; lists match when the copy has any of them. Pure. */
export type SmartFilter = {
  formats?: string[];
  editions?: string[];
  tags?: string[];
  labels?: string[];
  locations?: string[];
  watched?: "watched" | "not_watched";
  kind?: "movie" | "tv";
  forTrade?: boolean;
  favorite?: boolean;
  minRating?: number;
  text?: string;
};

const lower = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export function matchesSmart(item: Pick<CollectionItem, "type" | "editie" | "tags" | "watched" | "tmdb_movie_id" | "rating" | "movie_title" | "is_favorite"> & Partial<CollectionItem>, f: SmartFilter): boolean {
  if (f.formats?.length && !f.formats.some((x) => matchesFormat(item.type, x))) return false;
  if (f.editions?.length && !f.editions.some((x) => lower(x) === lower(item.editie))) return false;
  if (f.tags?.length && !f.tags.some((x) => (item.tags ?? []).some((t) => lower(t) === lower(x)))) return false;
  if (f.labels?.length && !f.labels.some((x) => lower(x) === lower(item.label))) return false;
  if (f.locations?.length && !f.locations.some((x) => lower(x) === lower(item.shelf_location))) return false;
  if (f.watched === "watched" && !item.watched) return false;
  if (f.watched === "not_watched" && item.watched) return false;
  if (f.kind === "tv" && item.tmdb_movie_id >= 0) return false;
  if (f.kind === "movie" && item.tmdb_movie_id < 0) return false;
  if (f.forTrade && !item.for_trade) return false;
  if (f.favorite && !item.is_favorite) return false;
  if (f.minRating != null && (item.rating ?? 0) < f.minRating) return false;
  if (f.text?.trim() && !lower(item.movie_title).includes(lower(f.text)) && !lower(item.box_name).includes(lower(f.text))) return false;
  return true;
}

/** Each physical copy once (first row of its item_group_id). */
export function applySmart<T extends Parameters<typeof matchesSmart>[0] & { item_group_id: string }>(items: T[], f: SmartFilter): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.item_group_id)) return false;
    seen.add(i.item_group_id);
    return matchesSmart(i, f);
  });
}

/** Keeps only known fields with sane values (the filter comes from a form). */
export function cleanSmartFilter(raw: unknown): SmartFilter {
  const r = (raw ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 20) : undefined);
  const out: SmartFilter = {};
  for (const k of ["formats", "editions", "tags", "labels", "locations"] as const) {
    const l = list(r[k]);
    if (l?.length) out[k] = l;
  }
  if (r.watched === "watched" || r.watched === "not_watched") out.watched = r.watched;
  if (r.kind === "movie" || r.kind === "tv") out.kind = r.kind;
  if (r.forTrade === true) out.forTrade = true;
  if (r.favorite === true) out.favorite = true;
  const min = Number(r.minRating);
  if (Number.isFinite(min) && min > 0 && min <= 5) out.minRating = min;
  if (typeof r.text === "string" && r.text.trim()) out.text = r.text.trim().slice(0, 80);
  return out;
}
