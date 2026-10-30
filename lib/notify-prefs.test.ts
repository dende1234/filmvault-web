import { describe, expect, it } from "vitest";
import { kindOfNotification, wants } from "@/lib/notify-prefs";

describe("notification preferences", () => {
  it("defaults to yes and respects an explicit no", () => {
    expect(wants(null, "push", "barcode")).toBe(true);
    expect(wants({ push: { barcode: false } }, "push", "barcode")).toBe(false);
    expect(wants({ push: { barcode: false } }, "email", "barcode")).toBe(true);
  });

  it("maps notification kinds", () => {
    expect(kindOfNotification("barcode_rejected")).toBe("barcode");
    expect(kindOfNotification("loan_reminder")).toBe("loan");
    expect(kindOfNotification("something_else")).toBeNull();
  });
});
