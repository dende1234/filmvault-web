import { describe, expect, it } from "vitest";
import { HELP_ENTRIES } from "@/lib/help/faq";
import { matchHelp, tokenize } from "@/lib/help/match";

describe("tokenize", () => {
  it("lowercases, strips accents and maps synonyms", () => {
    // "Blu-ray" is folded into the synonym "format".
    expect(tokenize("Héé, Blu-ray!")).toEqual(["hee", "format"]);
  });
});

describe("matchHelp", () => {
  it("answers common questions from the knowledge base", () => {
    for (const q of ["Hoe exporteer ik mijn collectie?", "how do I export my collection", "barcode scannen"]) {
      expect(matchHelp(q, HELP_ENTRIES).length, q).toBeGreaterThan(0);
    }
  });

  it("tolerates a small typo", () => {
    expect(matchHelp("exporteeren", HELP_ENTRIES).length).toBeGreaterThan(0);
  });

  it("finds nothing for unrelated text", () => {
    expect(matchHelp("xyzzy plugh", HELP_ENTRIES)).toEqual([]);
  });

  it("every entry has both languages", () => {
    for (const e of HELP_ENTRIES) {
      expect(e.q.nl && e.q.en && e.a.nl && e.a.en, e.id).toBeTruthy();
    }
  });
});
