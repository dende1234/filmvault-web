import { describe, expect, it } from "vitest";
import { compareCollections } from "@/lib/compare";

const row = (id: number, title: string) => ({ tmdb_movie_id: id, movie_title: title, movie_poster: null });

describe("compareCollections", () => {
  it("splits titles into only-them, only-me, both and wished", () => {
    const c = compareCollections(
      [row(1, "Alien"), row(2, "Brazil"), row(2, "Brazil")],
      [row(2, "Brazil"), row(3, "Casablanca"), row(4, "Dune")],
      [{ tmdb_movie_id: 4 }, { tmdb_movie_id: 9 }],
    );
    expect(c.onlyMe.map((t) => t.tmdbId)).toEqual([1]);
    expect(c.both.map((t) => t.tmdbId)).toEqual([2]);
    expect(c.onlyThem.map((t) => t.tmdbId)).toEqual([3, 4]);
    expect(c.wishTheyHave.map((t) => t.tmdbId)).toEqual([4]);
    expect(c.theirTrades).toEqual([]);
  });

  it("lists what they offer, your wishlist titles first", () => {
    const c = compareCollections(
      [],
      [
        { ...row(3, "Casablanca"), for_trade: "sale" as const },
        { ...row(4, "Dune"), for_trade: "trade" as const },
        row(5, "Eraserhead"),
      ],
      [{ tmdb_movie_id: 4 }],
    );
    expect(c.theirTrades.map((t) => [t.tmdbId, t.trade, t.wished])).toEqual([
      [4, "trade", true],
      [3, "sale", false],
    ]);
  });
});
