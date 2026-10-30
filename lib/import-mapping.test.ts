import { describe, expect, it } from "vitest";
import {
  detectRatingScale,
  normalizeEdition,
  normalizeFormat,
  normalizeKind,
  normalizeRating,
  normalizeWatched,
  normalizeYear,
  primaryTitle,
  splitBoxTitle,
} from "@/lib/import-mapping";

const TYPES = ["DVD", "Blu-ray", "4K Ultra HD"];

describe("normalizeFormat / normalizeEdition", () => {
  it("maps free text to known names", () => {
    expect(normalizeFormat("bluray", TYPES)).toBe("Blu-ray");
    expect(normalizeFormat("4K UHD", TYPES)).toBe("4K Ultra HD");
    expect(normalizeFormat("dvd", TYPES)).toBe("DVD");
    expect(normalizeFormat("laserdisc", TYPES)).toBeNull();
    expect(normalizeFormat("", TYPES)).toBeNull();
    expect(normalizeEdition("steelbook", ["Normaal", "Steelbook"])).toBe("Steelbook");
  });
});

describe("cells", () => {
  it("reads kind, watched and year", () => {
    expect(normalizeKind("serie")).toBe("tv");
    expect(normalizeKind("film")).toBe("movie");
    expect(normalizeWatched("ja")).toBe(true);
    expect(normalizeWatched("")).toBe(false);
    expect(normalizeYear("released 1999-03-31")).toBe("1999");
  });

  it("splits a box written in one cell", () => {
    expect(splitBoxTitle("LOTR • The Fellowship • The Two Towers")).toEqual({
      boxName: "LOTR",
      titles: ["The Fellowship", "The Two Towers"],
    });
    expect(splitBoxTitle("Alien - Director's Cut")).toBeNull();
    expect(primaryTitle("Seven Pounds\nSept Vies")).toBe("Seven Pounds");
  });

  it("detects the rating scale and converts to 0-5", () => {
    expect(detectRatingScale(["4", "5", "3.5"])).toBe(5);
    expect(detectRatingScale(["8", "10"])).toBe(10);
    expect(normalizeRating("8", 10)).toBe(4);
  });
});
