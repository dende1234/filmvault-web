/** Media types are single values (media_types table, 1:1 with Android). A
 * combo release is one type whose name joins its formats with " + ", e.g.
 * "4K Ultra HD + Blu-ray" (combo_formats.sql). These helpers read such a
 * name as "each of these formats". */
export const COMBO_SEPARATOR = " + ";

/** "4K Ultra HD + Blu-ray" → ["4K Ultra HD", "Blu-ray"]; "DVD" → ["DVD"]. */
export function formatParts(type: string | null | undefined): string[] {
  return (type ?? "").split("+").map((p) => p.trim()).filter(Boolean);
}

export function isCombo(type: string | null | undefined): boolean {
  return formatParts(type).length > 1;
}

/** Does a copy of this type count for the format filter (combo counts for each part)? */
export function matchesFormat(type: string | null | undefined, filter: string): boolean {
  return type === filter || formatParts(type).includes(filter);
}

/** Short label for badges on posters: "4K Ultra HD + Blu-ray" → "4K + Blu-ray". */
export function formatShort(type: string | null | undefined): string {
  const parts = formatParts(type);
  if (parts.length <= 1) return type ?? "";
  return parts.map((p) => (/4k|uhd|ultra ?hd/i.test(p) ? "4K" : p)).join(" + ");
}

/** The known type that is exactly this set of formats, if there is one. */
export function comboFor(parts: string[], known: string[]): string | null {
  const want = new Set(parts.map((p) => p.toLowerCase()));
  if (want.size < 2) return null;
  return (
    known.find((k) => {
      const have = formatParts(k).map((p) => p.toLowerCase());
      return have.length === want.size && have.every((p) => want.has(p));
    }) ?? null
  );
}

/** The single formats only (for the collection filter): combos are left out
 * because filtering on "Blu-ray" already includes them. */
export function singleFormats(known: string[]): string[] {
  return known.filter((k) => !isCombo(k));
}
