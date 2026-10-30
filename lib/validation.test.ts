import { describe, expect, it } from "vitest";
import { bulkPatchSchema, profileUpdateSchema } from "@/lib/validation";

describe("validation", () => {
  it("drops fields that aren't part of a profile update", () => {
    const r = profileUpdateSchema.parse({ name: " Danny ", bio: "", location: null, website: null, avatar_url: null, is_admin: true });
    expect(r).toEqual({ name: "Danny", bio: null, location: null, website: null, avatar_url: null });
    expect("is_admin" in r).toBe(false);
  });

  it("refuses unsafe links", () => {
    expect(profileUpdateSchema.safeParse({ name: null, bio: null, location: null, website: "javascript:alert(1)", avatar_url: null }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ name: null, bio: null, location: null, website: "filmory.nl", avatar_url: null }).success).toBe(true);
  });

  it("checks bulk edits", () => {
    expect(bulkPatchSchema.safeParse({ condition: "Nieuw", addTags: ["steelbook"] }).success).toBe(true);
    expect(bulkPatchSchema.safeParse({ condition: "Kapot" }).success).toBe(false);
  });
});
