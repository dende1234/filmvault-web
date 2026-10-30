/** The edition as shown to the user. The stored values (edities table) are
 * kept 1:1 with Android and are mostly English already; only the default
 * "Normaal" is Dutch, so English users see "Standard". The value itself
 * never changes. */
export function editionLabel(editie: string | null | undefined, locale: string): string {
  if (!editie) return "";
  if (locale === "en" && editie === "Normaal") return "Standard";
  return editie;
}
