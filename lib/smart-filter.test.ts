import { describe, expect, it } from "vitest";
import { applySmart, cleanSmartFilter } from "@/lib/smart-filter";

const item = (g: string, extra: Record<string, unknown> = {}) => ({
  item_group_id: g,
  type: "Blu-ray",
  editie: "Normaal",
  tags: [] as string[],
  watched: false,
  tmdb_movie_id: 1,
  rating: null as number | null,
  movie_title: `Film ${g}`,
  is_favorite: false,
  ...extra,
});

describe("smart collections", () => {
  const items = [
    item("a", { type: "4K Ultra HD + Blu-ray", tags: ["Steelbook"] }),
    item("a", { type: "4K Ultra HD + Blu-ray", tags: ["Steelbook"] }),
    item("b", { type: "DVD", watched: true, label: "Criterion", rating: 4.5 }),
    item("c", { type: "4K Ultra HD", tmdb_movie_id: -5, for_trade: "sale" }),
  ];

  it("matches formats (combos too), tags and kind, each copy once", () => {
    expect(applySmart(items, { formats: ["4K Ultra HD"] }).map((i) => i.item_group_id)).toEqual(["a", "c"]);
    expect(applySmart(items, { tags: ["steelbook"] }).map((i) => i.item_group_id)).toEqual(["a"]);
    expect(applySmart(items, { kind: "tv" }).map((i) => i.item_group_id)).toEqual(["c"]);
    expect(applySmart(items, { forTrade: true }).map((i) => i.item_group_id)).toEqual(["c"]);
  });

  it("combines fields with AND", () => {
    expect(applySmart(items, { labels: ["criterion"], watched: "watched", minRating: 4 }).map((i) => i.item_group_id)).toEqual(["b"]);
    expect(applySmart(items, { labels: ["criterion"], watched: "not_watched" })).toEqual([]);
  });

  it("cleans a filter from a form", () => {
    expect(cleanSmartFilter({ formats: [" 4K Ultra HD ", ""], watched: "maybe", minRating: "9", evil: 1, text: " alien " })).toEqual({
      formats: ["4K Ultra HD"],
      text: "alien",
    });
  });
});
