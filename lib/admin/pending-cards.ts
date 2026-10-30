import { getCollectionsByIds } from "@/actions/collections";
import { getPendingBarcodeCollectionLinks, getPendingBarcodes } from "@/actions/approvals";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { PendingBarcodeCardItem, PendingBarcodeUiItem } from "@/types/database";

/** At least this many approved submissions and none rejected. */
export const TRUSTED_MIN_APPROVED = 25;

type Stats = NonNullable<PendingBarcodeUiItem["submitterStats"]>;

async function loadSubmitterStats(ids: string[]): Promise<Map<string, Stats>> {
  const out = new Map<string, Stats>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  try {
    const rows = await fetchAll<{ submitted_by: string; status: string }>((from, to) =>
      supabase.from("pending_barcodes").select("submitted_by, status").in("submitted_by", ids).in("status", ["approved", "rejected"]).order("id").range(from, to),
    );
    for (const r of rows) {
      const s = out.get(r.submitted_by) ?? { approved: 0, rejected: 0, trusted: false };
      if (r.status === "approved") s.approved++;
      else s.rejected++;
      out.set(r.submitted_by, s);
    }
  } catch {
    return out;
  }
  for (const s of out.values()) s.trusted = s.approved >= TRUSTED_MIN_APPROVED && s.rejected === 0;
  return out;
}

/** Barcode → title ids already registered for it (single releases only). */
async function loadRegistered(codes: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (codes.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.from("barcodes").select("barcode, tmdb_movie_id").in("barcode", codes).eq("is_box", false);
  for (const r of (data ?? []) as { barcode: string; tmdb_movie_id: number }[]) out.set(r.barcode, [...(out.get(r.barcode) ?? []), r.tmdb_movie_id]);
  return out;
}

type Submitter = NonNullable<PendingBarcodeUiItem["submitter"]>;

/** Names of the submitters; a failure only hides the "submitted by" line. */
async function loadSubmitters(ids: string[]): Promise<Map<string, Submitter>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, name, email").in("id", ids);
  return new Map(((data ?? []) as Submitter[]).map((p) => [p.id, p]));
}

/** Builds the pending-approval cards (singles + grouped boxes) shared by
 * /admin/pending-barcodes and the barcode station's "Te keuren" tab; with
 * status "rejected", the recently rejected ones (to restore a mistake). */
export async function loadPendingBarcodeCards(status: "pending" | "rejected" = "pending"): Promise<PendingBarcodeCardItem[]> {
  const pending = await getPendingBarcodes(status);
  const links = await getPendingBarcodeCollectionLinks(pending.map((p) => p.id));
  const linksByPendingId = new Map<string, string[]>();
  for (const link of links) {
    linksByPendingId.set(link.pending_barcode_id, [...(linksByPendingId.get(link.pending_barcode_id) ?? []), link.collection_id]);
  }
  const allCollectionIds = Array.from(new Set(links.map((l) => l.collection_id)));
  const submitterIds = Array.from(new Set(pending.map((p) => p.submitted_by).filter(Boolean)));
  const [collections, submitters, stats, registered] = await Promise.all([
    getCollectionsByIds(allCollectionIds),
    loadSubmitters(submitterIds),
    loadSubmitterStats(submitterIds),
    loadRegistered(Array.from(new Set(pending.filter((p) => !p.is_box).map((p) => p.barcode)))),
  ]);
  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));

  const uiItems: PendingBarcodeUiItem[] = pending.map((item) => {
    const targetIds = linksByPendingId.get(item.id) ?? [item.collection_id];
    return {
      pending: item,
      targetCollectionNames: targetIds.flatMap((id) => (collectionNameById.get(id) ? [collectionNameById.get(id)!] : [])),
      submitter: submitters.get(item.submitted_by) ?? null,
      submitterStats: stats.get(item.submitted_by) ?? null,
      conflicts: item.is_box ? [] : (registered.get(item.barcode) ?? []).filter((id) => id !== item.tmdb_movie_id),
    };
  });

  const byBoxGroup = new Map<string | null, PendingBarcodeUiItem[]>();
  for (const item of uiItems) {
    const key = item.pending.box_group_id;
    byBoxGroup.set(key, [...(byBoxGroup.get(key) ?? []), item]);
  }

  const cards: PendingBarcodeCardItem[] = [];
  for (const [boxGroupId, group] of byBoxGroup) {
    if (boxGroupId === null) {
      for (const item of group) {
        cards.push({ kind: "single", id: item.pending.id, pendingIds: [item.pending.id], item });
      }
    } else {
      cards.push({
        kind: "box",
        id: boxGroupId,
        pendingIds: group.map((i) => i.pending.id),
        boxName: group[0].pending.box_name ?? "",
        items: group,
      });
    }
  }
  // Trusted contributors first (stable otherwise).
  const trusted = (c: PendingBarcodeCardItem) => (c.kind === "single" ? c.item : c.items[0]).submitterStats?.trusted === true;
  return status === "pending" ? [...cards.filter(trusted), ...cards.filter((c) => !trusted(c))] : cards;
}
