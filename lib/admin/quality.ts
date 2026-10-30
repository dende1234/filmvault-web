import { isValidEanUpc } from "@/lib/barcode";

/** Checks on the master film list (/admin/quality). Pure, so testable. */

export type BarcodeRow = { id: string; barcode: string; tmdb_movie_id: number; type: string | null; editie: string | null; is_box: boolean };

export type QualityReport = {
  /** Not a valid EAN-8/UPC-A/EAN-13 (could be a typo, or a non-standard code). */
  invalid: BarcodeRow[];
  /** Type or edition missing or not one of the admin-managed names. */
  missingDetails: BarcodeRow[];
  /** The same single-release barcode registered for more than one title. */
  duplicates: { barcode: string; rows: BarcodeRow[] }[];
};

export function analyzeBarcodes(rows: BarcodeRow[], mediaTypes: string[], edities: string[]): QualityReport {
  const types = new Set(mediaTypes);
  const eds = new Set(edities);
  const invalid: BarcodeRow[] = [];
  const missingDetails: BarcodeRow[] = [];
  const byCode = new Map<string, BarcodeRow[]>();
  for (const r of rows) {
    if (!isValidEanUpc(r.barcode)) invalid.push(r);
    if (!r.type || !r.editie || (types.size > 0 && !types.has(r.type)) || (eds.size > 0 && !eds.has(r.editie))) missingDetails.push(r);
    if (!r.is_box) byCode.set(r.barcode, [...(byCode.get(r.barcode) ?? []), r]);
  }
  const duplicates = Array.from(byCode.entries())
    .filter(([, list]) => new Set(list.map((r) => r.tmdb_movie_id)).size > 1)
    .map(([barcode, list]) => ({ barcode, rows: list }));
  return { invalid, missingDetails, duplicates };
}
