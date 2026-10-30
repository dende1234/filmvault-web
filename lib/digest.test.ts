import { describe, expect, it } from "vitest";
import { buildDigest } from "@/lib/digest";

describe("buildDigest", () => {
  it("is null without notifications", () => {
    expect(buildDigest([], { name: null, locale: "nl", siteUrl: "https://x" })).toBeNull();
  });

  it("lists each notification and escapes titles", () => {
    const d = buildDigest(
      [
        { kind: "barcode_approved", payload: { title: "Tom & Jerry <3" }, created_at: "2026-10-30" },
        { kind: "loan_reminder", payload: { title: "Alien", loanedTo: "Sam" }, created_at: "2026-10-29" },
      ],
      { name: "Danny", locale: "nl", siteUrl: "https://www.filmory.nl/" },
    )!;
    expect(d.subject).toBe("Filmory: 2 nieuwe meldingen deze week");
    expect(d.text).toContain("Hoi Danny,");
    expect(d.text).toContain("Alien is al ruim een maand uitgeleend aan Sam.");
    expect(d.text).toContain("https://www.filmory.nl/meldingen");
    expect(d.html).toContain("Tom &amp; Jerry &lt;3");
    expect(d.html).not.toContain("<3");
  });
});
