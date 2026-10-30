import { describe, expect, it } from "vitest";
import { normalizeSeasons, parseSeasons, seasonsField } from "@/lib/seasons";

describe("parseSeasons", () => {
  it("reads single seasons, ranges and specials", () => {
    expect(parseSeasons("1, 3")).toEqual([1, 3]);
    expect(parseSeasons("1-3")).toEqual([1, 2, 3]);
    expect(parseSeasons("seizoen 2 t/m 4")).toEqual([2, 3, 4]);
    expect(parseSeasons("1 + specials")).toEqual([0, 1]);
  });

  it("expands 'complete' only when the season count is known", () => {
    expect(parseSeasons("Complete serie", 3)).toEqual([1, 2, 3]);
    expect(parseSeasons("Complete serie")).toBeNull();
    expect(parseSeasons("")).toBeNull();
  });
});

describe("normalizeSeasons / seasonsField", () => {
  it("dedupes and sorts", () => {
    expect(normalizeSeasons([3, 1, 3, -1, 2.5])).toEqual([1, 3]);
  });

  it("only sends the column for a non-empty list", () => {
    expect(seasonsField([1, 2])).toEqual({ seasons: [1, 2] });
    expect(seasonsField([])).toEqual({});
    expect(seasonsField(null)).toEqual({});
  });
});
