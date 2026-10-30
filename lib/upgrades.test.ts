import { describe, expect, it } from "vitest";
import { findUpgrades, formatRank } from "@/lib/upgrades";

describe("formatRank", () => {
  it("orders the formats", () => {
    expect(formatRank("DVD")).toBe(1);
    expect(formatRank("Blu-ray")).toBe(2);
    expect(formatRank("4K Ultra HD")).toBe(3);
    expect(formatRank("VHS")).toBe(0);
  });
});

describe("findUpgrades", () => {
  const copy = (id: number, type: string) => ({ tmdb_movie_id: id, type, movie_title: `T${id}`, movie_poster: null });
  it("suggests a better format you don't own yet, biggest jump first", () => {
    const tips = findUpgrades(
      [copy(1, "DVD"), copy(2, "DVD"), copy(2, "Blu-ray"), copy(3, "Blu-ray"), copy(4, "VHS")],
      [
        { tmdb_movie_id: 1, type: "Blu-ray" },
        { tmdb_movie_id: 2, type: "Blu-ray" },
        { tmdb_movie_id: 3, type: "4K Ultra HD" },
        { tmdb_movie_id: 3, type: "DVD" },
        { tmdb_movie_id: 4, type: "DVD" },
        { tmdb_movie_id: 5, type: "4K Ultra HD" },
      ],
    );
    expect(tips.map((t) => [t.tmdbId, t.ownedType, t.betterType])).toEqual([
      [1, "DVD", "Blu-ray"],
      [3, "Blu-ray", "4K Ultra HD"],
    ]);
  });
});
