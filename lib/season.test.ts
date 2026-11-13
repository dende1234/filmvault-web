import { describe, expect, it } from "vitest";
import { blackFriday, currentSeason, wrappedYear } from "@/lib/season";

describe("season", () => {
  it("finds Black Friday", () => {
    expect(blackFriday(2026)).toBe("2026-11-27");
    expect(blackFriday(2025)).toBe("2025-11-28");
    expect(blackFriday(2024)).toBe("2024-11-29");
  });

  it("knows which year to wrap", () => {
    expect(wrappedYear("2026-12-28")).toBe(2026);
    expect(wrappedYear("2027-01-05")).toBe(2026);
  });

  it("picks the season for a day", () => {
    expect(currentSeason("2026-11-13")).toBe("gifts");
    expect(currentSeason("2026-11-20")).toBe("black_friday");
    expect(currentSeason("2026-11-30")).toBe("black_friday");
    expect(currentSeason("2026-12-01")).toBe("gifts");
    expect(currentSeason("2026-12-25")).toBeNull();
    expect(currentSeason("2026-12-28")).toBe("wrapped");
    expect(currentSeason("2027-01-10")).toBe("wrapped");
    expect(currentSeason("2027-01-16")).toBeNull();
    expect(currentSeason("2026-07-01")).toBeNull();
  });
});
