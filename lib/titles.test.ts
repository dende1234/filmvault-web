import { describe, expect, it } from "vitest";
import { isSeries, parseTitleId, titleHref, toTitleId } from "@/lib/titles";

describe("title ids", () => {
  it("stores series as negative TMDB tv ids", () => {
    expect(toTitleId("tv", 1399)).toBe(-1399);
    expect(toTitleId("movie", 550)).toBe(550);
    expect(parseTitleId(-1399)).toEqual({ kind: "tv", tmdbId: 1399 });
    expect(parseTitleId(550)).toEqual({ kind: "movie", tmdbId: 550 });
  });

  it("links to the right detail page", () => {
    expect(titleHref(-1399)).toBe("/series/1399");
    expect(titleHref(550)).toBe("/films/550");
    expect(isSeries(-1)).toBe(true);
    expect(isSeries(1)).toBe(false);
    expect(isSeries(null)).toBe(false);
  });
});
