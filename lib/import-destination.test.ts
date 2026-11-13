import { describe, expect, it } from "vitest";
import { importDestination } from "@/lib/import-destination";

const copy = { hasFilm: true, toWishlist: false, toWatchedOnly: false, barcode: "", knownMatches: false };
describe("import destinations", () => {
  it("saves a physical copy without a barcode", () => expect(importDestination(copy)).toBe("direct"));
  it("keeps unknown codes usable while their catalogue data awaits review", () => expect(importDestination({ ...copy, barcode: "123" })).toBe("pending"));
  it("distinguishes catalogue matches from new codes", () => expect(importDestination({ ...copy, barcode: "123", knownMatches: true })).toBe("direct"));
  it("never interprets a Letterboxd viewing as ownership, even with a supplied barcode", () => expect(importDestination({ ...copy, toWatchedOnly: true, barcode: "123" })).toBe("watched_only"));
  it("keeps a watchlist separate from viewing and physical ownership", () => expect(importDestination({ ...copy, toWishlist: true, toWatchedOnly: true })).toBe("wishlist"));
  it("does not import unresolved titles", () => expect(importDestination({ ...copy, hasFilm: false })).toBe("no_match"));
});
