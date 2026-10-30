import { describe, expect, it } from "vitest";
import { collectionStats, type StatsRow } from "@/lib/collection-stats";

const row = (g: string, extra: Partial<StatsRow> = {}): StatsRow => ({
  item_group_id: g,
  movie_title: `T${g}`,
  type: "DVD",
  editie: "Normaal",
  watched: false,
  added_at: "2026-10-05T10:00:00Z",
  tmdb_movie_id: Number(g.replace(/\D/g, "")) || 1,
  ...extra,
});

describe("collectionStats", () => {
  it("counts each copy once and tallies formats, value and months", () => {
    const s = collectionStats(
      [
        row("1", { purchase_price: 10, purchase_shop: "Bol" }),
        row("1", { purchase_price: 10, purchase_shop: "Bol" }),
        row("2", { type: "Blu-ray", watched: true, purchase_price: 25.5, purchase_shop: "Bol", added_at: "2026-09-01T00:00:00Z" }),
        row("3", { type: "Blu-ray", tmdb_movie_id: -99, added_at: "2020-01-01T00:00:00Z" }),
      ],
      new Date("2026-10-30T00:00:00Z"),
      3,
    );
    expect(s.copies).toBe(3);
    expect(s.series).toBe(1);
    expect(s.watched).toBe(1);
    expect(s.byFormat).toEqual([{ key: "Blu-ray", count: 2 }, { key: "DVD", count: 1 }]);
    expect(s.byShop).toEqual([{ key: "Bol", count: 2 }]);
    expect(s.value).toMatchObject({ total: 35.5, priced: 2, average: 17.75 });
    expect(s.value.top[0]).toEqual({ title: "T2", price: 25.5 });
    expect(s.perMonth).toEqual([{ key: "2026-08", count: 0 }, { key: "2026-09", count: 1 }, { key: "2026-10", count: 1 }]);
  });
});
