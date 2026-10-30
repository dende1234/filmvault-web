import { describe, expect, it } from "vitest";
import { monthRange, physicalReleaseBetween, physicalReleases } from "@/lib/releases";

const dates = {
  results: [
    {
      iso_3166_1: "NL",
      release_dates: [
        { certification: "", type: 3, release_date: "2026-05-01T00:00:00.000Z" },
        { certification: "", type: 5, release_date: "2026-11-20T00:00:00.000Z", note: "4K Ultra HD" },
        { certification: "", type: 5, release_date: "2026-09-04T00:00:00.000Z", note: "" },
      ],
    },
    { iso_3166_1: "US", release_dates: [{ certification: "", type: 5, release_date: "2026-08-01T00:00:00.000Z" }] },
  ],
};

describe("physical releases", () => {
  it("keeps only type 5 in the country, earliest first", () => {
    expect(physicalReleases(dates, "NL")).toEqual([
      { date: "2026-09-04", note: null },
      { date: "2026-11-20", note: "4K Ultra HD" },
    ]);
    expect(physicalReleases(dates, "BE")).toEqual([]);
  });

  it("finds the one in a month", () => {
    const { from, to } = monthRange("2026-11");
    expect([from, to]).toEqual(["2026-11-01", "2026-11-30"]);
    expect(physicalReleaseBetween(dates, "NL", from, to)).toEqual({ date: "2026-11-20", note: "4K Ultra HD" });
    expect(physicalReleaseBetween(dates, "NL", "2026-12-01", "2026-12-31")).toBeNull();
    expect(monthRange("2028-02").to).toBe("2028-02-29");
  });
});
