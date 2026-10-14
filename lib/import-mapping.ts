/** Column detection + value normalisation for the user CSV import. Pure
 * functions (no I/O) so the rules are easy to test. Header names are
 * recognised in Dutch and English, including common exports (CLZ Movies,
 * Cine Case, spreadsheets). */

export const IMPORT_FIELDS = ["title", "kind", "seasons", "year", "barcode", "format", "edition", "watched", "rating", "watchedOn", "box"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ColumnMapping = Partial<Record<ImportField, number>>;

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  title: ["titel", "title", "film", "filmtitel", "movie", "movie title", "naam", "name"],
  year: ["jaar", "year", "release year", "releasejaar", "uitgavejaar", "release date", "releasedatum"],
  barcode: ["barcode", "ean", "upc", "ean/upc", "upc/ean", "ean code", "gtin"],
  format: ["formaat", "format", "type", "media", "medium", "media type", "drager", "disc", "schijf"],
  edition: ["editie", "edition", "uitgave", "versie", "version", "release", "verpakking", "packaging"],
  watched: ["bekeken", "gezien", "watched", "seen", "gekeken", "status"],
  rating: ["rating", "beoordeling", "cijfer", "score", "my rating", "mijn rating", "sterren", "stars"],
  watchedOn: ["datum bekeken", "bekeken op", "gezien op", "watched on", "date watched", "watched date", "kijkdatum", "last watched"],
  box: ["box", "boxset", "box set", "box naam", "box name", "collectie box", "set"],
  kind: ["soort", "film of serie", "film/serie", "kind", "categorie", "category", "content type", "titeltype", "title type"],
  seasons: ["seizoenen", "seizoen", "seasons", "season", "seizoen(en)", "volumes"],
};

function normHeader(h: string) {
  return h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Best guess which column holds which field (exact synonym match first,
 * then "contains"). Each column is used at most once. */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const normalized = headers.map(normHeader);
  for (const pass of ["exact", "contains"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== undefined) continue;
      const idx = normalized.findIndex(
        (h, i) =>
          !used.has(i) &&
          HEADER_SYNONYMS[field].some((syn) => (pass === "exact" ? h === syn : h.includes(syn))),
      );
      if (idx >= 0) {
        mapping[field] = idx;
        used.add(idx);
      }
    }
  }
  return mapping;
}

/** Does the first row look like a header (no row of data)? */
export function looksLikeHeader(row: string[]): boolean {
  return Object.keys(detectColumns(row)).length >= 1 && !row.some((c) => /^\d{8,14}$/.test(c.replace(/\s/g, "")));
}

const FORMAT_SYNONYMS: [RegExp, string][] = [
  [/4k|uhd|ultra ?hd|2160/i, "4K Ultra HD"],
  [/blu.?ray|\bbd\b|bluray/i, "Blu-ray"],
  [/dvd/i, "DVD"],
  [/vhs/i, "VHS"],
];

/** Maps free text ("Bluray", "4K UHD", "dvd") to a known media type name. */
export function normalizeFormat(value: string, known: string[]): string | null {
  const v = value.trim();
  if (!v) return null;
  const exact = known.find((k) => k.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  for (const [re, name] of FORMAT_SYNONYMS) {
    if (re.test(v)) return known.find((k) => k.toLowerCase() === name.toLowerCase()) ?? null;
  }
  return null;
}

const EDITION_SYNONYMS: [RegExp, string][] = [
  [/steel ?book/i, "Steelbook"],
  [/collector/i, "Collector's Edition"],
  [/limited|gelimiteerd|beperkte oplage/i, "Limited Edition"],
];

/** Maps free text to a known edition name (unknown → null, caller defaults). */
export function normalizeEdition(value: string, known: string[]): string | null {
  const v = value.trim();
  if (!v) return null;
  const exact = known.find((k) => k.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  for (const [re, name] of EDITION_SYNONYMS) {
    if (re.test(v)) return known.find((k) => k.toLowerCase() === name.toLowerCase()) ?? null;
  }
  return null;
}

/** "Serie", "TV", "Series", "Show" → tv; "Film", "Movie" → movie; else null. */
export function normalizeKind(value: string): "movie" | "tv" | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (/serie|series|\btv\b|show|miniserie/.test(v)) return "tv";
  if (/film|movie|speelfilm/.test(v)) return "movie";
  return null;
}

const TRUTHY = ["ja", "yes", "y", "j", "true", "waar", "1", "x", "✓", "✔", "v", "gezien", "bekeken", "watched", "seen"];

export function normalizeWatched(value: string): boolean {
  return TRUTHY.includes(value.trim().toLowerCase());
}

/** Finds the rating scale of the whole column: 5, 10 or 100 points. */
export function detectRatingScale(values: string[]): 5 | 10 | 100 {
  const nums = values.map(parseNumber).filter((n): n is number => n !== null);
  const max = Math.max(0, ...nums);
  return max > 10 ? 100 : max > 5 ? 10 : 5;
}

function parseNumber(value: string): number | null {
  const v = value.trim().replace(",", ".").replace(/\/.*$/, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Converts to Filmory's 0.5–5 scale in half steps (0/empty → null). */
export function normalizeRating(value: string, scale: 5 | 10 | 100): number | null {
  const n = parseNumber(value);
  if (n === null || n <= 0) return null;
  const five = scale === 100 ? n / 20 : scale === 10 ? n / 2 : n;
  return Math.min(5, Math.max(0.5, Math.round(five * 2) / 2));
}

/** ISO (2026-10-12), European (12-10-2026, 12/10/2026, 12.10.2026) → YYYY-MM-DD.
 * Day-first on purpose: the audience is European. */
export function normalizeDate(value: string): string | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return date.toISOString().slice(0, 10);
}

/** "1999", "1999-03-31", "31-03-1999" → "1999". */
export function normalizeYear(value: string): string | null {
  const match = value.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : null;
}

/** A box written in ONE cell, films separated by bullets:
 *   "Der Herr der Ringe - Kinoversion • Die Gefährten • Die zwei Türme"
 * → { boxName: "Der Herr der Ringe - Kinoversion", titles: ["Die Gefährten", "Die zwei Türme"] }.
 * With three or more parts the first is the box name; with two, both are
 * films and the box is named after them. Returns null for a single title.
 * Only a proper bullet (•, ·, ●) splits — never "/" or "-", which occur in
 * ordinary titles. */
export function splitBoxTitle(cell: string): { boxName: string; titles: string[] } | null {
  const parts = cell
    .replace(/\r?\n/g, " ")
    .split(/\s*[•·●]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return { boxName: parts.join(" + "), titles: parts };
  return { boxName: parts[0], titles: parts.slice(1) };
}

/** First line of a title cell: a second line is usually an alternative or
 * original-language title ("Seven Pounds\nSept Vies"). */
export function primaryTitle(cell: string): string {
  return (cell.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "").trim();
}
