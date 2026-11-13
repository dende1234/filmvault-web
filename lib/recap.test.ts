import { describe, expect, it } from "vitest";
import { computeRecap } from "@/lib/recap";

const item = (added_at: string, extra: Partial<{ rating: number; watched: boolean; type: string; is_favorite: boolean; movie_poster: string }> = {}) => ({
  added_at,
  rating: extra.rating ?? null,
  watched: extra.watched ?? false,
  type: extra.type ?? "Blu-ray",
  is_favorite: extra.is_favorite ?? false,
  movie_poster: extra.movie_poster ?? null,
});

describe("computeRecap", () => {
  it("counts the chosen year only", () => {
    const items = [
      item("2026-03-01", { type: "4K", rating: 8, watched: true, movie_poster: "/a.jpg" }),
      item("2026-03-15", { type: "4K", rating: 6, movie_poster: "/b.jpg", is_favorite: true }),
      item("2026-07-01", { type: "Dvd" }),
      item("2025-12-31", { type: "Dvd", rating: 10 }),
    ];
    const r = computeRecap(items, [{ created_at: "2026-01-02" }], [{ earned_at: "2025-05-05" }], 2026);
    expect(r.filmsAdded).toBe(3);
    expect(r.alreadyWatched).toBe(1);
    expect(r.averageRating).toBe(7);
    expect(r.topType).toBe("4K");
    expect(r.busiestMonth).toBe(3);
    expect(r.newCollections).toBe(1);
    expect(r.badgesEarned).toBe(0);
    expect(r.totalOwned).toBe(4);
    expect(r.highlights).toEqual(["/b.jpg", "/a.jpg"]);
  });
});
