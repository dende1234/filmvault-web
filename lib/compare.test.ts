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
  });
});
