/** Column detection + value normalisation for the user CSV import. Pure
 * functions (no I/O) so the rules are easy to test. Header names are
 * recognised in Dutch and English, including common exports (CLZ Movies,
 * Cine Case, spreadsheets). */

import { comboFor } from "@/lib/formats";
import { normalizeBarcode } from "@/lib/barcode";

// Order matters for the "contains" pass: subtitles before audio, so a header
// like "Subtitle languages" isn't taken as audio.
export const IMPORT_FIELDS = [
  "title", "kind", "seasons", "year", "barcode", "format", "edition", "cut", "label", "region", "subtitles", "audio",
  "watched", "rating", "purchaseDate", "watchedOn", "box", "price", "shop", "location", "tmdbId", "imdbId",
] as const;
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
  cut: ["cut", "filmversie", "fassung", "schnittfassung", "film cut", "versie film"],
  label: ["label", "uitgever", "publisher", "distributor", "distributeur", "verlag", "boutique label"],
  // Not "code": that would match "barcode".
  region: ["regio", "region", "regiocode", "region code", "regio code", "regionalcode", "ländercode", "zone"],
  subtitles: ["ondertitels", "ondertiteling", "subtitles", "subtitle", "subs", "untertitel", "sous titres"],
  price: ["aankoopprijs", "prijs", "price", "purchase price", "betaald", "paid", "kosten", "cost", "kaufpreis", "preis"],
  purchaseDate: ["aankoopdatum", "gekocht op", "koopdatum", "purchase date", "date purchased", "bought on", "kaufdatum"],
  shop: ["winkel", "gekocht bij", "aankoopplaats", "shop", "store", "purchased at", "bought at", "retailer", "händler", "laden"],
  location: ["plek", "locatie", "plaats", "kast", "plank", "location", "shelf", "storage location", "standort", "regal"],
  audio: ["audio", "audiotalen", "audio languages", "audio language", "talen", "taal", "languages", "language", "sprache", "sprachen", "tonspur"],
  // Exact names only (see EXACT_ONLY): "contains" would take "IMDb rating".
  tmdbId: ["tmdb", "tmdb id", "tmdbid", "tmdb nummer", "tmdb number", "themoviedb id", "tmdb url", "tmdb link"],
  imdbId: ["imdb", "imdb id", "imdbid", "imdb nummer", "imdb number", "imdb tt", "imdb url", "imdb link"],
};

const EXACT_ONLY = new Set<ImportField>(["tmdbId", "imdbId"]);

function normHeader(h: string) {
  return h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Best guess which column holds which field (exact synonym match first,
 * then "contains"). Each column is used at most once. */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  // Link columns ("Letterboxd URI", "IMDb URL") are never data fields; without
  // this, "box" would match inside "letterboxd".
  // An IMDb/TMDB link column is kept: the id is read from the link.
  const normalized = headers.map((h) => {
    const n = normHeader(h);
    if (/^(imdb|tmdb) (url|link)$/.test(n)) return n;
    return /letterboxd|\buri\b|\burl\b|\blink\b/.test(n) ? "" : n;
  });
  for (const pass of ["exact", "contains"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== undefined || (pass === "contains" && EXACT_ONLY.has(field))) continue;
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

/** Does the first row look like a header (no row of data)? A barcode
 * (also with a prefix like "EAN13|"), an IMDb id or a year means data. */
export function looksLikeHeader(row: string[]): boolean {
  const isData = (c: string) =>
    /^\d{8,14}$/.test(cleanImportBarcode(c)) || normalizeImdbId(c) !== null || /^(19|20)\d{2}$/.test(c.trim());
  return Object.keys(detectColumns(row)).length >= 1 && !row.some(isData);
}

/** A barcode cell from another app: "EAN13|8712626050162", "UPC: 0123…",
 * "8712626050162, 5051888…" (several: the first). Prefix and spacing go. */
export function cleanImportBarcode(value: string): string {
  const first = value.split(/[,;\n]/).map((p) => p.trim()).find(Boolean) ?? "";
  const withoutType = first.replace(/^[a-z][a-z0-9 -]{0,12}\s*[|:]\s*/i, "");
  return normalizeBarcode(withoutType);
}

/** "tt0499549", an IMDb link, or "0499549" in a column named IMDb → "tt0499549". */
export function normalizeImdbId(value: string): string | null {
  const match = value.match(/\btt\d{7,10}\b/i);
  return match ? match[0].toLowerCase() : null;
}

/** "19995" or a TMDB link (themoviedb.org/movie/19995, /tv/1399) → the id,
 * and from a link also whether it's a film or a series. */
export function normalizeTmdbId(value: string): { id: number; kind: "movie" | "tv" | null } | null {
  const v = value.trim();
  const link = v.match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
  if (link) return { id: Number(link[2]), kind: link[1].toLowerCase() as "movie" | "tv" };
  return /^\d{1,9}$/.test(v) && Number(v) > 0 ? { id: Number(v), kind: null } : null;
}

/** For a file WITHOUT a header row: which column is what, judged by the
 * values (e.g. the "Movie Collection" app export: number, title, original
 * title, genres, runtime, year, IMDb id, TMDB id, "EAN13|…", TMDB score).
 * Recognises IMDb id, TMDB id, barcode, year and title. A score column is
 * left alone on purpose: in such exports it's usually the public TMDB/IMDb
 * score, not the member's own rating; it can still be picked by hand. */
export function detectColumnsByContent(rows: string[][]): ColumnMapping {
  const sample = rows.slice(0, 300);
  const width = Math.max(0, ...sample.map((r) => r.length));
  const cols = Array.from({ length: width }, (_, i) => sample.map((r) => (r[i] ?? "").trim()).filter(Boolean));
  const share = (values: string[], test: (v: string) => boolean) => (values.length ? values.filter(test).length / values.length : 0);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const take = (field: ImportField, test: (values: string[], i: number) => boolean) => {
    const idx = cols.findIndex((values, i) => !used.has(i) && values.length > 0 && test(values, i));
    if (idx >= 0) {
      mapping[field] = idx;
      used.add(idx);
    }
  };

  take("imdbId", (v) => share(v, (x) => /^tt\d{7,10}$/i.test(x)) >= 0.6);
  take("barcode", (v) => share(v, (x) => /^\d{8,14}$/.test(cleanImportBarcode(x))) >= 0.6);
  take("year", (v) => share(v, (x) => /^(19|20)\d{2}$/.test(x)) >= 0.8);
  take("tmdbId", (v) => {
    if (share(v, (x) => /^\d{1,8}$/.test(x)) < 0.9) return false;
    const nums = v.map(Number);
    // A running number ("1", "2", "3" …) is not an id.
    const rising = nums.slice(1).filter((n, i) => n > nums[i]).length / Math.max(1, nums.length - 1);
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // Runtimes stay under ~300; ids mostly don't.
    return rising < 0.9 && median > 300 && (mapping.imdbId !== undefined || sorted[sorted.length - 1] > 10_000);
  });
  // Title: the first well-filled text column that isn't a list ("Actie - Avontuur - Drama").
  const maxFill = Math.max(0, ...cols.map((c) => c.length));
  take(
    "title",
    (v) =>
      v.length >= maxFill * 0.8 &&
      share(v, (x) => /\p{L}/u.test(x)) >= 0.7 &&
      share(v, (x) => x.split(" - ").length >= 3) < 0.3,
  );
  return mapping;
}

const FORMAT_SYNONYMS: [RegExp, string][] = [
  [/4k|uhd|ultra ?hd|2160/i, "4K Ultra HD"],
  [/blu.?ray|\bbd\b|bluray/i, "Blu-ray"],
  [/dvd/i, "DVD"],
  [/vhs/i, "VHS"],
];

function singleFormat(text: string): string | null {
  for (const [re, name] of FORMAT_SYNONYMS) if (re.test(text)) return name;
  return null;
}

/** Maps free text ("Bluray", "4K UHD", "dvd") to a known media type name.
 * Formats joined by "+", "&", "/", "," or "and"/"en" ("4K + Blu-ray",
 * "UHD/BD + Digital") map to that combo type when it exists; "4K Ultra HD
 * Blu-ray" without a separator is a 4K disc, not a combo. */
export function normalizeFormat(value: string, known: string[]): string | null {
  const v = value.trim();
  if (!v) return null;
  const exact = known.find((k) => k.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  const parts = Array.from(
    new Set(
      v
        .split(/\s*(?:\+|&|\/|,|\band\b|\ben\b)\s*/i)
        .map(singleFormat)
        .filter((p): p is string => p !== null),
    ),
  );
  if (parts.length > 1) {
    const combo = comboFor(parts, known);
    if (combo) return combo;
  }
  const first = parts[0] ?? singleFormat(v);
  return first ? (known.find((k) => k.toLowerCase() === first.toLowerCase()) ?? null) : null;
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
