/** A viewed/rated title is not proof of physical ownership. Only explicit
 * viewing-only imports (e.g. Letterboxd) bypass the selected collection. */
export function importDestination(row: {
  hasFilm: boolean;
  toWishlist: boolean;
  toWatchedOnly: boolean;
  barcode: string;
  knownMatches: boolean;
}): "no_match" | "wishlist" | "watched_only" | "direct" | "pending" {
  if (!row.hasFilm) return "no_match";
  if (row.toWishlist) return "wishlist";
  if (row.toWatchedOnly) return "watched_only";
  return row.barcode && !row.knownMatches ? "pending" : "direct";
}
