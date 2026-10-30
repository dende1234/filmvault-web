/** Winkelmodus without signal: a snapshot of your own barcodes, titles and
 * wishlist, saved on the phone while online, answers a scan offline. Pure
 * lookup here; the snapshot comes from actions/shop.ts. */

export type ShopSnapshot = {
  userId: string;
  savedAt: string;
  /** Your copies by barcode. */
  owned: Record<string, { ids: number[]; name: string; poster: string | null; isBox: boolean }>;
  /** Barcodes of the master list for titles you own or want: barcode → title ids. */
  known: Record<string, number[]>;
  /** Titles you own (any edition). */
  ownedIds: number[];
  /** Wishlist: title id → Holy Grail. */
  wish: Record<string, boolean>;
  /** Names/posters for the ids above. */
  titles: Record<string, { name: string; poster: string | null }>;
};

export type OfflineAnswer =
  | { status: "owned" | "other" | "wish" | "grail"; ids: number[]; name: string; poster: string | null; isBox: boolean }
  | { status: "unknown" };

export function lookupOffline(snapshot: ShopSnapshot, barcode: string): OfflineAnswer {
  const own = snapshot.owned[barcode];
  if (own) return { status: "owned", ids: own.ids, name: own.name, poster: own.poster, isBox: own.isBox };
  const ids = snapshot.known[barcode];
  if (!ids || ids.length === 0) return { status: "unknown" };
  const first = snapshot.titles[String(ids[0])] ?? { name: barcode, poster: null };
  const base = { ids, name: first.name, poster: first.poster, isBox: ids.length > 1 };
  const owned = new Set(snapshot.ownedIds);
  if (ids.some((id) => owned.has(id))) return { status: "other", ...base };
  const wished = ids.filter((id) => String(id) in snapshot.wish);
  if (wished.length > 0) return { status: wished.some((id) => snapshot.wish[String(id)]) ? "grail" : "wish", ...base };
  return { status: "unknown" };
}

const KEY = "fv_shop_snapshot";

export function saveSnapshot(s: ShopSnapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function loadSnapshot(userId?: string): ShopSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ShopSnapshot;
    return !userId || s.userId === userId ? s : null;
  } catch {
    return null;
  }
}

/** On sign-out: the next person on this phone must not see your collection. */
export function clearSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
