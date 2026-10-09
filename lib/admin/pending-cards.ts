import {
  getCollectionsByIds,
  getPendingBarcodeCollectionLinks,
  getPendingBarcodes,
} from "@/actions/collections";
import type { PendingBarcodeCardItem, PendingBarcodeUiItem } from "@/types/database";

/** Builds the pending-approval cards (singles + grouped boxes) shared by
 * /admin/pending-barcodes and the barcode station's "Te keuren" tab. */
export async function loadPendingBarcodeCards(): Promise<PendingBarcodeCardItem[]> {
  const pending = await getPendingBarcodes();
  const links = await getPendingBarcodeCollectionLinks(pending.map((p) => p.id));
  const linksByPendingId = new Map<string, string[]>();
  for (const link of links) {
    linksByPendingId.set(link.pending_barcode_id, [...(linksByPendingId.get(link.pending_barcode_id) ?? []), link.collection_id]);
  }
  const allCollectionIds = Array.from(new Set(links.map((l) => l.collection_id)));
  const collections = await getCollectionsByIds(allCollectionIds);
  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));

  const uiItems: PendingBarcodeUiItem[] = pending.map((item) => {
    const targetIds = linksByPendingId.get(item.id) ?? [item.collection_id];
    return { pending: item, targetCollectionNames: targetIds.flatMap((id) => (collectionNameById.get(id) ? [collectionNameById.get(id)!] : [])) };
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
  return cards;
}
