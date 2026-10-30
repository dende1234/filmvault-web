import { describe, expect, it } from "vitest";
import { analyzeBarcodes, type BarcodeRow } from "@/lib/admin/quality";

const row = (id: string, barcode: string, tmdb: number, extra: Partial<BarcodeRow> = {}): BarcodeRow => ({
  id,
  barcode,
  tmdb_movie_id: tmdb,
  type: "DVD",
  editie: "Normaal",
  is_box: false,
  ...extra,
});

describe("analyzeBarcodes", () => {
  it("finds invalid codes, missing details and duplicates", () => {
    const r = analyzeBarcodes(
      [
        row("1", "4006381333931", 1),
        row("2", "4006381333932", 2),
        row("3", "036000291452", 3, { type: "Laserdisc" }),
        row("4", "96385074", 4),
        row("5", "96385074", 5),
        row("6", "036000291452", 6, { is_box: true }),
        row("7", "036000291452", 7, { is_box: true }),
      ],
      ["DVD", "Blu-ray"],
      ["Normaal"],
    );
    expect(r.invalid.map((x) => x.id)).toEqual(["2"]);
    expect(r.missingDetails.map((x) => x.id)).toEqual(["3"]);
    expect(r.duplicates).toEqual([{ barcode: "96385074", rows: [expect.objectContaining({ id: "4" }), expect.objectContaining({ id: "5" })] }]);
  });
});
