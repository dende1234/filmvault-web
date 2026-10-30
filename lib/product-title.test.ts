import { describe, expect, it } from "vitest";
import { cleanProductTitle } from "@/lib/product-title";

describe("cleanProductTitle", () => {
  it("removes shop noise around the film title", () => {
    expect(cleanProductTitle("The Shawshank Redemption (uk Import) Blu-ray")).toBe("The Shawshank Redemption");
    expect(cleanProductTitle("Diary Of A Wimpy Kid [blu-ray] By Zachary Gordon")).toBe("Diary Of A Wimpy Kid");
    expect(cleanProductTitle("Inception - 4K Ultra HD Steelbook")).toBe("Inception");
  });

  it("leaves a plain title alone", () => {
    expect(cleanProductTitle("Amélie")).toBe("Amélie");
  });
});
