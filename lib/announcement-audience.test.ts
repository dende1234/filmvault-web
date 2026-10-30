import { describe, expect, it } from "vitest";
import { isAudience, todayNL } from "@/lib/announcement-audience";

describe("announcement audience", () => {
  it("accepts only known audiences", () => {
    expect(isAudience("nl")).toBe(true);
    expect(isAudience("everyone")).toBe(false);
  });

  it("uses Dutch time for today", () => {
    expect(todayNL(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-02");
    expect(todayNL(new Date("2026-03-01T10:00:00Z"))).toBe("2026-03-01");
  });
});
