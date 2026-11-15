import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import {
  cleanImportBarcode,
  detectColumns,
  detectColumnsByContent,
  looksLikeHeader,
  normalizeImdbId,
  normalizeTmdbId,
} from "@/lib/import-mapping";

// A few lines of a "Movie Collection" export (no header row): number, -,
// title, original/local title, genres, runtime, year, IMDb, TMDB, barcode,
// TMDB score, -, -.
const EXPORT = `"1","","Avatar","","Actie - Avontuur - Fantasie - Sciencefiction","162","2009","tt0499549","19995","EAN13|8712626050162","7.0","",""
"2","","Transformers: The Last Knight","","Actie - Sciencefiction - Thriller - Avontuur","148","2017","tt3371366","335988","","6.0","",""
"3","","Transformers: Age of Extinction","","Sciencefiction - Actie - Avontuur","166","2014","tt2109248","91314","","5.8","",""
"5","","Transformers: Dark of the Moon","","Actie - Sciencefiction - Avontuur","157","2011","tt1399103","38356","","6.0","",""
"15","","Konferenz der Tiere","Animals United","Animatie - Familie - Komedie","92","2010","tt1620449","50135","","5.0","",""
"34","","Alpha & omega","","","","","","","","","",""
"44","","The Lion King","De Leeuwenkoning","Familie - Animatie - Drama","89","1994","tt0110357","8587","","8.1","",""
"95","","Marco Borsato - Dromen Durven Delen: 3Dimensies Live","","Muziek","125","2011","","81786","","5.5","",""
"233","","Mulan","","Avontuur - Fantasie - Drama - Actie","1","2020","tt4566758","337401","","6.0","",""
"267","","Dune: Part Two","","Sciencefiction - Avontuur","167","2024","tt15239678","693134","","8.165","",""`;

describe("Movie Collection export", () => {
  const table = parseCsv(EXPORT);

  it("is recognised as data, not as a header", () => {
    expect(looksLikeHeader(table[0])).toBe(false);
  });

  it("finds the columns from their values", () => {
    expect(detectColumnsByContent(table)).toEqual({ imdbId: 7, barcode: 9, year: 6, tmdbId: 8, title: 2 });
  });

  it("strips the barcode type prefix", () => {
    expect(cleanImportBarcode("EAN13|8712626050162")).toBe("8712626050162");
    expect(cleanImportBarcode("UPC: 0123 4567 8905")).toBe("012345678905");
    expect(cleanImportBarcode("8712626050162, 5051888270935")).toBe("8712626050162");
    expect(cleanImportBarcode("")).toBe("");
  });

  it("reads IMDb and TMDB ids", () => {
    expect(normalizeImdbId("tt0499549")).toBe("tt0499549");
    expect(normalizeImdbId("https://www.imdb.com/title/tt15239678/")).toBe("tt15239678");
    expect(normalizeImdbId("")).toBeNull();
    expect(normalizeTmdbId("19995")).toEqual({ id: 19995, kind: null });
    expect(normalizeTmdbId("https://www.themoviedb.org/tv/1399-game-of-thrones")).toEqual({ id: 1399, kind: "tv" });
    expect(normalizeTmdbId("abc")).toBeNull();
  });

  it("maps id columns by header, but never 'IMDb rating'", () => {
    expect(detectColumns(["Title", "IMDb ID", "TMDB", "IMDb Rating"])).toEqual({ title: 0, imdbId: 1, tmdbId: 2, rating: 3 });
    expect(detectColumns(["Titel", "IMDb URL"])).toEqual({ title: 0, imdbId: 1 });
  });
});
