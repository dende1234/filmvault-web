import { describe, expect, it } from "vitest";
import { bucket, featureEnabled, type FeatureFlag } from "@/lib/feature-rules";

const flag = (mode: FeatureFlag["mode"], extra: Partial<FeatureFlag> = {}): FeatureFlag => ({ key: "shelf_scan", mode, percent: 0, user_ids: [], ...extra });

describe("featureEnabled", () => {
  it("off is off for everyone, admins get everything else", () => {
    expect(featureEnabled(flag("off"), "u1", true)).toBe(false);
    expect(featureEnabled(flag("admins"), "u1", true)).toBe(true);
    expect(featureEnabled(flag("admins"), "u1", false)).toBe(false);
  });

  it("chosen members and everyone", () => {
    expect(featureEnabled(flag("users", { user_ids: ["u1"] }), "u1", false)).toBe(true);
    expect(featureEnabled(flag("users", { user_ids: ["u1"] }), "u2", false)).toBe(false);
    expect(featureEnabled(flag("all"), "u2", false)).toBe(true);
    expect(featureEnabled(flag("all"), null, false)).toBe(false);
  });

  it("a percentage is stable per member and roughly right", () => {
    const ids = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
    const on = ids.filter((id) => featureEnabled(flag("percent", { percent: 25 }), id, false)).length;
    expect(on).toBeGreaterThan(400);
    expect(on).toBeLessThan(600);
    expect(bucket("user-7", "shelf_scan")).toBe(bucket("user-7", "shelf_scan"));
    expect(featureEnabled(flag("percent", { percent: 0, user_ids: ["user-7"] }), "user-7", false)).toBe(true);
    expect(featureEnabled(flag("percent", { percent: 100 }), "anyone", false)).toBe(true);
  });
});
