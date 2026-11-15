import { describe, expect, it } from "vitest";
import { collectionStats, filterCopies, ownershipVerdict, summarizeCopies, type McpCopy } from "@/lib/mcp/collection";
import { hashMcpToken, generateMcpToken, tokenFromAuthHeader } from "@/lib/mcp/token";

const row = (o: Partial<McpCopy>): McpCopy => ({
  item_group_id: "g1", collection_id: "c1", tmdb_movie_id: 693134, movie_title: "Dune: Part Two", barcode: "5051888270935",
  type: "4K Ultra HD", editie: "Steelbook", watched: true, rating: 4.5, loaned_to: null, loaned_at: null,
  shelf_location: "Woonkamer · kast 2", purchase_price: 30, is_box: false, box_name: null, ...o,
});
const names = new Map([["c1", "Woonkamer"], ["c2", "4K"]]);
const rows = [
  row({}),
  row({ collection_id: "c2" }), // same physical copy in a second collection
  row({ item_group_id: "g2", tmdb_movie_id: 1858, movie_title: "Transformers", barcode: "", type: "DVD", editie: "Normaal", watched: false, rating: null, loaned_to: "Sanne", loaned_at: "2026-09-01", shelf_location: "Zolder", purchase_price: 5 }),
];

describe("MCP collection tools", () => {
  const copies = summarizeCopies(rows, names);

  it("counts a copy in two collections once", () => {
    expect(copies).toHaveLength(2);
    expect(copies[0].collections).toEqual(["Woonkamer", "4K"]);
  });

  it("filters on title, format, location, watched and loans", () => {
    expect(filterCopies(copies, { query: "dune" }).map((c) => c.title)).toEqual(["Dune: Part Two"]);
    expect(filterCopies(copies, { format: "4K Ultra HD" })).toHaveLength(1);
    expect(filterCopies(copies, { location: "kast 2" })).toHaveLength(1);
    expect(filterCopies(copies, { watched: false }).map((c) => c.title)).toEqual(["Transformers"]);
    expect(filterCopies(copies, { loaned: true })[0].loanedTo).toBe("Sanne");
  });

  it("answers 'do I own this' like shop mode", () => {
    const wishlist = [{ tmdb_movie_id: 11, movie_title: "Star Wars", is_grail: true }];
    expect(ownershipVerdict(copies, wishlist, { barcode: "5051888270935" }).status).toBe("owned");
    expect(ownershipVerdict(copies, wishlist, { barcode: "1234567890128", barcodeTitleId: 693134 }).status).toBe("other_edition");
    expect(ownershipVerdict(copies, wishlist, { title: "star wars" })).toEqual({ status: "on_wishlist", title: "Star Wars", holyGrail: true });
    expect(ownershipVerdict(copies, wishlist, { title: "Alien" }).status).toBe("not_owned");
    expect(ownershipVerdict(copies, wishlist, { title: "transformers" }).status).toBe("owned");
  });

  it("adds up statistics per physical copy", () => {
    expect(collectionStats(copies, rows, 2)).toMatchObject({ copies: 2, watched: 1, unwatched: 1, loanedOut: 1, totalPurchaseValue: 35, byFormat: { "4K Ultra HD": 1, DVD: 1 } });
  });
});

describe("MCP tokens", () => {
  it("only stores a hash and reads Bearer headers strictly", () => {
    const { token, hash, hint } = generateMcpToken();
    expect(token).toMatch(/^fvm_[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(hashMcpToken(token));
    expect(hint).toBe(`${token.slice(0, 8)}…`);
    expect(tokenFromAuthHeader(`Bearer ${token}`)).toBe(token);
    expect(tokenFromAuthHeader("Bearer something-else")).toBeNull();
    expect(tokenFromAuthHeader(null)).toBeNull();
  });
});
